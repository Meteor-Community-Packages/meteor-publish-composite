import { Meteor } from 'meteor/meteor'

import Publication from './publication'
import Subscription from './subscription'
import { debugLog, enableDebugLogging } from './logging'

function publishComposite (name, options) {
  return Meteor.publish(name, async function publish (...args) {
    const subscription = new Subscription(this)
    const instanceOptions = await prepareOptions.call(this, options, args)
    const publications = []

    for (const opt of instanceOptions) {
      const pub = new Publication(subscription, opt)
      await pub.publish()
      publications.push(pub)
    }

    this.onStop(() => {
      publications.forEach(pub => pub.unpublish())
    })

    await Promise.all(publications.map(p => p.awaitPromises()))
    debugLog('Meteor.publish', 'ready')
    this.ready()
  })
}

// For backwards compatibility
Meteor.publishComposite = publishComposite

async function prepareOptions (options, args) {
  let preparedOptions = options

  if (typeof preparedOptions === 'function') {
    preparedOptions = await preparedOptions.apply(this, args)
  }

  if (!preparedOptions) {
    return []
  }

  if (!Array.isArray(preparedOptions)) {
    preparedOptions = [preparedOptions]
  }

  return preparedOptions
}

export {
  enableDebugLogging,
  publishComposite
}
