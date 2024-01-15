/* globals Package */
Package.describe({
  name: 'reywood:publish-composite',
  summary: 'Publish a set of related documents from multiple collections with a reactive join.',
  version: '1.8.6',
  git: 'https://github.com/Meteor-Community-Packages/meteor-publish-composite'
})

Package.onUse((api) => {
  Npm.depends({
    'lodash.isequal': '4.5.0'
  })
  api.versionsFrom(['1.8.3', '2.8.1', '3.0-beta.0'])
  api.use([
    'check',
    'ecmascript',
    'modules',
    'logging',
    'ddp'
  ], ['server'])
  api.use('zodern:types@1.0.11')
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

// meteor test-packages reywood:publish-composite --driver-package meteortesting:mocha
Package.onTest((api) => {
  Npm.depends({
    'lodash.isequal': '4.5.0',
    chai: '5.0.0'
  })
  api.use([
    'ecmascript',
    'modules',
    'mongo'
  ], ['client', 'server'])
  api.use([
    'meteortesting:mocha-core@8.2.0-beta300.0'
  ], 'client')
  api.use([
    'reywood:publish-composite',
    'underscore'
  ], 'server')

  api.addFiles('tests/common.js', ['client', 'server'])
  api.addFiles('tests/client.js', 'client')
  api.addFiles('tests/server.js', 'server')
})
