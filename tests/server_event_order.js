/* global describe, it */
import assert from 'assert'

import Publication from '../lib/publication'
import Subscription from '../lib/subscription'

// Regression tests for observer events that arrive while a document's 'added'
// is still publishing its children.
//
// The 'added' callback publishes the children before sending the document, and
// the observer does not wait for it. An observer that reports a change in that
// window (Meteor 3.5+'s change-stream driver reports every write as its own
// event) used to have the change dropped, because the subscription had not
// seen the document yet, so the client kept the stale insert. A 'removed' in
// the same window went out before the 'added' and left a ghost document.
//
// The cursors are fakes driven by each test, and a gated child find() holds the
// window open, so the ordering does not depend on the Mongo reactivity driver.

const tick = () => new Promise(resolve => setImmediate(resolve))

const createGate = () => {
  let open
  const promise = new Promise(resolve => { open = resolve })
  return { promise, open }
}

const fakeCursor = (collectionName, onObserve = () => {}) => ({
  _getCollectionName: () => collectionName,
  async observe (callbacks) {
    onObserve(callbacks)
    return { stop () {} }
  }
})

const recordingSubscription = () => {
  const messages = []
  const meteorSub = {
    added: (collectionName, id, fields) => messages.push(['added', collectionName, id, { ...fields }]),
    changed: (collectionName, id, fields) => messages.push(['changed', collectionName, id, { ...fields }]),
    removed: (collectionName, id) => messages.push(['removed', collectionName, id])
  }
  return { messages, subscription: new Subscription(meteorSub) }
}

const publishWithGatedChild = async () => {
  const gate = createGate()
  let callbacks
  const { messages, subscription } = recordingSubscription()
  const publication = new Publication(subscription, {
    find: () => fakeCursor('messages', (observeCallbacks) => { callbacks = observeCallbacks }),
    children: [{
      async find () {
        await gate.promise
        return fakeCursor('authors')
      }
    }]
  })
  await publication.publish()
  return { callbacks, gate, messages, publication }
}

describe('publishComposite — events while a document is being added', function () {
  it('sends a change that arrives before the document is published', async () => {
    const { callbacks, gate, messages, publication } = await publishWithGatedChild()

    callbacks.added({ _id: 'm1', text: '' })
    callbacks.changed({ _id: 'm1', text: 'hello' }, { _id: 'm1', text: '' })
    callbacks.changed({ _id: 'm1', text: 'hello world' }, { _id: 'm1', text: 'hello' })
    gate.open()
    await publication.awaitPromises()
    await tick()

    assert.deepStrictEqual(messages, [
      ['added', 'messages', 'm1', { _id: 'm1', text: '' }],
      ['changed', 'messages', 'm1', { text: 'hello' }],
      ['changed', 'messages', 'm1', { text: 'hello world' }]
    ])
  })

  it('removes a document only after it was added', async () => {
    const { callbacks, gate, messages, publication } = await publishWithGatedChild()

    callbacks.added({ _id: 'm2', text: 'bye' })
    callbacks.removed({ _id: 'm2', text: 'bye' })
    gate.open()
    await publication.awaitPromises()
    await tick()

    assert.deepStrictEqual(messages, [
      ['added', 'messages', 'm2', { _id: 'm2', text: 'bye' }],
      ['removed', 'messages', 'm2']
    ])
  })

  it('still sends changes right away once the document is published', async () => {
    const { callbacks, gate, messages, publication } = await publishWithGatedChild()

    callbacks.added({ _id: 'm3', text: 'a' })
    gate.open()
    await publication.awaitPromises()
    await tick()
    callbacks.changed({ _id: 'm3', text: 'b' }, { _id: 'm3', text: 'a' })

    assert.deepStrictEqual(messages, [
      ['added', 'messages', 'm3', { _id: 'm3', text: 'a' }],
      ['changed', 'messages', 'm3', { text: 'b' }]
    ])
  })
})
