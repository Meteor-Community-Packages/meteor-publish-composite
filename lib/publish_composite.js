Meteor.publishComposite = function(name, options) {
    return Meteor.publish(name, function() {
        var subscription = new Subscription(this);
        var args = Array.prototype.slice.apply(arguments);
        var instanceOptions = prepareOptions.call(this, options, args);
        var pubs = [];

        _.each(instanceOptions, function(opt) {
            var pub = new Publication(subscription, opt);
            pub.publish();
            pubs.push(pub);
        });

        this.onStop(function() {
            _.each(pubs, function(pub) {
                pub.unpublish();
            });
        });

        this.ready();
    });
};

debugLog = function() { };

Meteor.publishComposite.enableDebugLogging = function() {
    debugLog = function(source, message) {
        while (source.length < 35) { source += ' '; }
        console.log('[' + source + '] ' + message);
    };
};

var prepareOptions = function(options, args) {
    var preparedOptions = options;

    if (typeof preparedOptions === 'function') {
        preparedOptions = preparedOptions.apply(this, args);
    }

    if (!preparedOptions) {
        return [];
    }

    if (!_.isArray(preparedOptions)) {
        preparedOptions = [ preparedOptions ];
    }

    return preparedOptions;
};
