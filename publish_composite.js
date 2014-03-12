Meteor.publishComposite = function(name, options) {
    return Meteor.publish(name, function() {
        var subscription = this,
            instanceOptions = options,
            args = Array.prototype.slice.apply(arguments);

        if (typeof instanceOptions === 'function') {
            instanceOptions = instanceOptions.apply(subscription, args);
        }

        var refCounter = new DocumentRefCounter({
            onChange: function(collectionName, doc, refCount) {
                if (refCount <= 0) {
                    subscription.removed(collectionName, doc._id);
                }
            }
        });
        var pub = new Pub(subscription, instanceOptions, refCounter);
        pub.publish();

        subscription.onStop(function() {
            pub.unpublish();
        });

        subscription.ready();
    });
};


var Pub = function(subscription, options, refCounter, args) {
    this.subscription = subscription;
    this.options = options;
    this.refCounter = refCounter;
    this.args = args || [];
    this.children = options.children || [];
    this.childPublications = [];
};

Pub.prototype.publish = function() {
    this.cursor = this.options.find.apply(this.subscription, this.args);

    if (!this.cursor) { return; }

    this.collectionName = this.cursor._getCollectionName();
    var self = this;

    this.observeHandle = this.cursor.observe({
        added: function(doc) {
            self.refCounter.increment(self.collectionName, doc);
            self.subscription.added(self.collectionName, doc._id, doc);
            self._publishChildrenOf(doc);
        },
        changed: function(doc) {
            self.subscription.changed(self.collectionName, doc._id, doc);
        },
        removed: function(doc) {
            self._unpublishChildrenOf(doc);
            self.refCounter.decrement(self.collectionName, doc);
        }
    });
};

Pub.prototype.unpublish = function() {
    this.observeHandle.stop();

    this._dereferenceAllCursorDocuments();
    this._unpublishChildPublications();
};

Pub.prototype._publishChildrenOf = function(doc) {
    _.each(this.children, function(options) {
        var pub = new Pub(this.subscription, options, this.refCounter, [ doc ].concat(this.args));
        this.childPublications[doc._id] = pub;
        pub.publish();
    }, this);
};

Pub.prototype._unpublishChildrenOf = function(doc) {
    if (this.childPublications[doc._id]) {
        this.childPublications[doc._id].unpublish();
    }
    delete this.childPublications[doc._id];
};

Pub.prototype._dereferenceAllCursorDocuments = function() {
    this.cursor.rewind();
    this.cursor.forEach(function(doc) {
        this.refCounter.decrement(this.collectionName, doc);
    }, this);
};

Pub.prototype._unpublishChildPublications = function() {
    for (var i in this.childPublications) {
        this.childPublications[i].unpublish();
        delete this.childPublications[i];
    }
};


var DocumentRefCounter = function(observer) {
    this.heap = {};
    this.observer = observer;
};

DocumentRefCounter.prototype.increment = function(collectionName, doc) {
    var key = collectionName + ":" + doc._id;
    if (!this.heap[key]) {
        this.heap[key] = 0;
    }
    this.heap[key]++;
};

DocumentRefCounter.prototype.decrement = function(collectionName, doc) {
    var key = collectionName + ":" + doc._id;
    if (this.heap[key]) {
        this.heap[key]--;

        this.observer.onChange(collectionName, doc, this.heap[key]);
    }
};
