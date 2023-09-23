/* globals Package */
Package.describe({
  name: 'reywood:publish-composite',
  summary: 'Publish a set of related documents from multiple collections with a reactive join',
  version: '1.8.0',
  git: 'https://github.com/Meteor-Community-Packages/meteor-publish-composite'
})

Package.onUse((api) => {
  api.versionsFrom(['1.8.3', '2.8.1'])
  api.use([
    'check',
    'ecmascript',
    'modules',
    'underscore'
  ], ['server'])
  api.mainModule('lib/publish_composite.js', 'server')
  api.addFiles([
    'lib/doc_ref_counter.js',
    'lib/logging.js',
    'lib/publication.js',
    'lib/subscription.js'
  ], 'server')

  api.export([
    'enableDebugLogging',
    'publishComposite'
  ], 'server')
})

Package.onTest((api) => {
  api.use([
    'ecmascript',
    'modules'
  ], ['client', 'server'])
  api.use([
    'cultofcoders:mocha',
    'practicalmeteor:chai'
  ], 'client')
  api.use([
    'reywood:publish-composite',
    'mongo',
    'underscore'
  ], 'server')

  api.addFiles('tests/common.js', ['client', 'server'])
  api.addFiles('tests/client.js', 'client')
  api.addFiles('tests/server.js', 'server')
})
