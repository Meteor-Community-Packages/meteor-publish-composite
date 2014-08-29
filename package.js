Package.describe({
    summary: "Meteor.publishComposite provides a flexible way to publish a set of documents and their child documents in one go. In this way, a whole tree of documents can be published.",
    version: "1.2.2",
    git: "https://github.com/englue/meteor-publish-composite.git"
});

Package.on_use(function (api) {
    api.versionsFrom("METEOR@0.9.0");
    api.use("underscore", "server");
    api.add_files([ "publish_composite.js" ], "server");
});


Package.on_test(function(api) {
    api.use("mrt:publish-composite");
    api.use(["tinytest", "test-helpers"]);

    api.add_files([ "tests.js" ]);
});
