Meteor.publishComposite = function(name, options) {
    return Meteor.publish(name, function() {
        var subscription = this,
            instanceOptions = options,
            args = Array.prototype.slice.apply(arguments);

        if (typeof instanceOptions === 'function') {
            instanceOptions = instanceOptions.apply(subscription, args);
        }

        var pub = new Pub(subscription, instanceOptions);

        subscription.onStop(function() {
            pub.unpublish();
        });

        subscription.ready();
    });
};


var Pub = function(subscription, options, args) {
    this.subscription = subscription;
    this.options = options;
    this.args = args || [];
    this.children = options.children || [];
    this.childPublications = [];

    this._startPublishing();
};

Pub.prototype.unpublish = function() {
    this.observeHandle && this.observeHandle.stop();
    for (var i in this.childPublications) {
        this.childPublications[i].unpublish();
        delete this.childPublications[i];
    }
};

Pub.prototype._startPublishing = function() {
    var cursor = this.options.find.apply(this.subscription, this.args);

    if (!cursor) { return; }

    var collectionName = cursor._getCollectionName();
    var self = this;

    this.observeHandle = cursor.observe({
        added: function(doc) {
            self.subscription.added(collectionName, doc._id, doc);
            self._publishChildrenOf(doc);
        },
        changed: function(doc) {
            self.subscription.changed(collectionName, doc._id, doc);
        },
        removed: function(doc) {
            self._unpublishChildrenOf(doc);
            self.subscription.removed(collectionName, doc._id);
        }
    });
};

Pub.prototype._publishChildrenOf = function(doc) {
    _.each(this.children, function(options) {
        var pub = new Pub(this.subscription, options, [ doc ].concat(this.args));
        this.childPublications[doc._id] = pub;
    }, this);
};

Pub.prototype._unpublishChildrenOf = function(doc) {
    this.childPublications[doc._id] && this.childPublications[doc._id].unpublish();
    delete this.childPublications[doc._id];
};
