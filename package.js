Package.describe({
    name: "reywood:publish-composite",
    summary: "Publish a set of documents and their child documents in one publication",
    version: "1.3.0",
    git: "https://github.com/englue/meteor-publish-composite.git"
});

Package.on_use(function (api) {
    api.versionsFrom("METEOR@0.9.0");
    api.use("underscore", "server");
    api.add_files([ "publish_composite.js" ], "server");
});


Package.on_test(function(api) {
    api.use("reywood:publish-composite");
    api.use(["tinytest", "test-helpers"]);

    api.add_files([ "tests.js" ]);
});
