Package.describe({
    name: "okland:publish-composite",
    summary: "Publish a set of related documents from multiple collections with a reactive join",
    version: "1.4.2",
    git: "https://github.com/englue/meteor-publish-composite.git"
});

Package.on_use(function (api) {
    api.versionsFrom("METEOR@0.9.0");
    api.use(["underscore", "diff-sequence"], "server");
    api.add_files([
        "lib/doc_ref_counter.js",
        "lib/publication.js",
        "lib/subscription.js",
        "lib/publish_composite.js"
    ], "server");
});


Package.on_test(function(api) {
    api.use("okland:publish-composite");
    api.imply(["mongo", "ddp-client", "ddp-server","underscore"]);
    api.use(["tinytest", "test-helpers"]);

    api.add_files([ "tests.js" ]);
});
