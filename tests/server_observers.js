/* global MongoInternals */
import { Meteor } from 'meteor/meteor'
import { DDP } from 'meteor/ddp-client'
import assert from 'assert'
import { publishComposite } from 'meteor/reywood:publish-composite'
import { Posts, Comments } from './common'

// Regression tests for orphaned child observers.
//
// Republishes are triggered from the parent's observe callbacks without being
// awaited. On Meteor 3 cursor.observe() is async, so two parent changes that
// arrive while a child's previous observe() is still pending used to run two
// publish() cycles concurrently: the second found no observeHandle to stop,
// started another observer, and whichever resolved last won the slot — the
// other handle was never stopped. The same happened when the subscription
// stopped during an in-flight republish. An orphaned observer keeps its
// callbacks (and through them the subscription and the DDP session) reachable
// for the life of the process.
//
// A deliberately slow child find() widens the window so the overlap is
// deterministic. Handles are counted at MongoConnection#_observeChanges, the
// layer every server cursor.observe()/observeChanges() goes through.

const CHILD_FIND_DELAY_MS = 60
const PARENT_UPDATE_GAP_MS = 15
const RAPID_UPDATES = 6
const SETTLE_MS = 400
const READY_TIMEOUT_MS = 8000
const POST_ID = 'orphanTestPost'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const waitUntil = async (predicate, label) => {
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`)
    await sleep(10)
  }
}

publishComposite('orphanTest.postWithComments', function (postId) {
  return {
    find () { return Posts.find({ _id: postId }) },
    children: [{
      async find (post) {
        await sleep(CHILD_FIND_DELAY_MS)
        return Comments.find({ postId: post._id })
      }
    }]
  }
})

describe('publishComposite — child observers are never orphaned', function () {
  this.timeout(30000)

  const live = new Set()
  let mongo
  let originalObserveChanges
  let connection

  before(() => {
    mongo = MongoInternals.defaultRemoteCollectionDriver().mongo
    originalObserveChanges = mongo._observeChanges
    mongo._observeChanges = async function (...args) {
      const handle = await originalObserveChanges.apply(this, args)
      live.add(handle)
      const stop = handle.stop
      handle.stop = async function (...stopArgs) {
        live.delete(handle)
        return stop.apply(this, stopArgs)
      }
      return handle
    }
    connection = DDP.connect(Meteor.absoluteUrl())
  })

  after(() => {
    connection.disconnect()
    mongo._observeChanges = originalObserveChanges
  })

  beforeEach(async () => {
    await Posts.removeAsync({ _id: POST_ID })
    await Comments.removeAsync({ postId: POST_ID })
    await Posts.insertAsync({ _id: POST_ID, title: 'orphan test', author: 'nobody', score: 0 })
    await Comments.insertAsync({ postId: POST_ID, text: 'first', author: 'nobody' })
    live.clear()
  })

  afterEach(async () => {
    await Posts.removeAsync({ _id: POST_ID })
    await Comments.removeAsync({ postId: POST_ID })
  })

  it('stops every observer after rapid parent changes and an unsubscribe', async () => {
    const handle = connection.subscribe('orphanTest.postWithComments', POST_ID)
    await waitUntil(() => handle.ready(), 'subscription ready')
    await sleep(SETTLE_MS)

    for (let i = 1; i <= RAPID_UPDATES; i += 1) {
      await Posts.updateAsync(POST_ID, { $set: { score: i } })
      await sleep(PARENT_UPDATE_GAP_MS)
    }
    await sleep(CHILD_FIND_DELAY_MS * (RAPID_UPDATES + 2) + SETTLE_MS)

    handle.stop()
    await sleep(CHILD_FIND_DELAY_MS * 2 + SETTLE_MS)

    assert.strictEqual(live.size, 0, `${live.size} observer(s) left running`)
  })

  it('stops the observer when the subscription stops during an in-flight republish', async () => {
    const handle = connection.subscribe('orphanTest.postWithComments', POST_ID)
    await waitUntil(() => handle.ready(), 'subscription ready')
    await sleep(SETTLE_MS)

    await Posts.updateAsync(POST_ID, { $set: { score: 42 } })
    await sleep(PARENT_UPDATE_GAP_MS)
    handle.stop()
    await sleep(CHILD_FIND_DELAY_MS * 3 + SETTLE_MS)

    assert.strictEqual(live.size, 0, `${live.size} observer(s) left running`)
  })
})
