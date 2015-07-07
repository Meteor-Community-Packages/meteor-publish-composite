Meteor.publishComposite = function(name, options) {
    return Meteor.publish(name, function() {

        var subscription = null,
            pub = null,
            instanceOptions = options,
            args = Array.prototype.slice.apply(arguments);

        if (typeof instanceOptions === "function") {
            instanceOptions = instanceOptions.apply(this, args);
        }

        if(!instanceOptions || typeof instanceOptions.find === "undefined")
          return [];

        subscription = new Subscription(this);
        pub = new Publication(subscription, instanceOptions);
        pub.publish();

        this.onStop(function() {
            pub.unpublish();
        });

        this.ready();
    });
};

debugLog = function() { };

Meteor.publishComposite.enableDebugLogging = function() {
    debugLog = function(source, message) {
        while (source.length < 35) { source += " "; }
        console.log("[" + source + "] " + message);
    };
};
