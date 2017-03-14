Package.describe({
    name: 'reywood:publish-composite',
    summary: 'Publish a set of related documents from multiple collections with a reactive join',
    version: '1.5.1',
    git: 'https://github.com/englue/meteor-publish-composite.git',
});

Package.onUse((api) => {
    api.versionsFrom('METEOR@1.4.3');
    api.use([
        'ecmascript',
        'modules',
        'underscore',
    ], ['client', 'server']);
    api.mainModule('lib/publish_composite.js', 'server');
    api.addFiles([
        'lib/doc_ref_counter.js',
        'lib/logging.js',
        'lib/publication.js',
        'lib/subscription.js',
    ], 'server');

    api.export([
        'enableDebugLogging',
        'publishComposite',
    ], 'server');
});


Package.onTest((api) => {
    api.use([
        'ecmascript',
        'modules',
    ], ['client', 'server']);
    api.use([
        'reywood:publish-composite',
    ], 'server');

    api.addFiles('tests/common.js', ['client', 'server']);
    api.addFiles('tests/client.js', 'client');
    api.addFiles('tests/server.js', 'server');
});
