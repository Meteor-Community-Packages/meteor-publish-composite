Package.describe({
    summary: "Meteor.publishComposite provides a flexible way to publish a set of documents and their child documents in one go. In this way, a whole tree of documents can be published."
});

Package.on_use(function (api) {
    api.use("underscore", "server");
    api.add_files([ "publish_composite.js" ], "server");
});


Package.on_test(function(api) {
    api.use("publish-composite");
    api.use(["tinytest", "test-helpers"]);

    api.add_files([ "tests.js" ]);
});
