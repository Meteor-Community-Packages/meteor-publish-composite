Meteor.publishComposite = function(name, options) {
    return Meteor.publish(name, function() {
        var subscription = new Subscription(this),
            instanceOptions = options,
            args = Array.prototype.slice.apply(arguments);

        if (typeof instanceOptions === 'function') {
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


var Subscription = function(meteorSub) {
    this.meteorSub = meteorSub;
    this.refCounter = new DocumentRefCounter({
        onChange: function(collectionName, doc, refCount) {
            if (refCount <= 0) {
                meteorSub.removed(collectionName, doc._id);
            }
        }
    });
};

Subscription.prototype.added = function(collectionName, doc) {
    this.refCounter.increment(collectionName, doc);
    this.meteorSub.added(collectionName, doc._id, doc);
};

Subscription.prototype.changed = function(collectionName, doc) {
    this.meteorSub.changed(collectionName, doc._id, doc);
};

Subscription.prototype.removed = function(collectionName, doc) {
    this.refCounter.decrement(collectionName, doc);
};



var Publication = function(subscription, options, args) {
    this.subscription = subscription;
    this.options = options;
    this.args = args || [];
    this.children = options.children || [];
    this.childPublications = [];
};

Publication.prototype.publish = function() {
    this.cursor = this.options.find.apply(this.subscription.meteorSub, this.args);

    if (!this.cursor) { return; }

    this.collectionName = this.cursor._getCollectionName();
    var self = this;

    this.observeHandle = this.cursor.observe({
        added: function(doc) {
            self.subscription.added(self.collectionName, doc);
            self._publishChildrenOf(doc);
        },
        changed: function(doc) {
            self._unpublishChildrenOf(doc._id);
            self._publishChildrenOf(doc);
            self.subscription.changed(self.collectionName, doc);
        },
        removed: function(doc) {
            self._unpublishChildrenOf(doc._id);
            self.subscription.removed(self.collectionName, doc);
        }
    });
};

Publication.prototype.unpublish = function() {
    if (this.observeHandle) {
        this.observeHandle.stop();
    }

    this._removeAllCursorDocuments();
    this._unpublishChildPublications();
};

Publication.prototype._publishChildrenOf = function(doc) {
    this.childPublications[doc._id] = [];

    _.each(this.children, function(options) {
        var pub = new Publication(this.subscription, options, [ doc ].concat(this.args));
        this.childPublications[doc._id].push(pub);
        pub.publish();
    }, this);
};

Publication.prototype._unpublishChildrenOf = function(docId) {
    if (this.childPublications[docId]) {
        _.each(this.childPublications[docId], function(pub) {
            pub.unpublish();
        });
    }
    delete this.childPublications[docId];
};

Publication.prototype._removeAllCursorDocuments = function() {
    if (!this.cursor) { return; }
    
    this.cursor.rewind();
    this.cursor.forEach(function(doc) {
        this.subscription.removed(this.collectionName, doc);
    }, this);
};

Publication.prototype._unpublishChildPublications = function() {
    for (var i in this.childPublications) {
        this._unpublishChildrenOf(i);
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
