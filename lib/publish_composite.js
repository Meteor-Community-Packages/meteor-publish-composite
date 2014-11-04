Meteor.publishComposite = function(name, options) {
    return Meteor.publish(name, function() {
        var subscription = new Subscription(this),
            instanceOptions = options,
            args = Array.prototype.slice.apply(arguments);

        if (typeof instanceOptions === "function") {
            instanceOptions = instanceOptions.apply(this, args);
        }

        var pub = new Publication(subscription, instanceOptions);
        pub.publish();

        this.onStop(function() {
            pub.unpublish();
        });

        this.ready();
    });
};


var enableDebugLogging = false;

debugLog = enableDebugLogging ?
    function(source, message) {
        while (source.length < 35) { source += " "; }
        console.log("[" + source + "] " + message);
    } :
    function() { };
