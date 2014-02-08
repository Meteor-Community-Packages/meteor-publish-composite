module.exports = function(grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks('grunt-simple-mocha');

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        jshint: {
            options: {
                "curly": true,
                "eqeqeq": true,
                "immed": true,
                "indent": 4,
                "newcap": true,
                "unused": true,
                "trailing": true,

                "-W030": false
            },

            files: {
                src: [
                    "../publish_composite.js",
                    "lib/**/*.js",
                    "specs/**/*.js"
                ]
            }
        },

        simplemocha: {
            options: {
                ignoreLeaks: false,
                ui: "bdd",
                useColors: !grunt.option("no-color")
            },

            all: {
                src: [
                    "specs/**/*_spec.js"
                ]
            }
        }
    });

    grunt.registerTask("default", [ "test" ]);

    grunt.registerTask("test", [
        "jshint",
        "simplemocha"
    ]);
};
