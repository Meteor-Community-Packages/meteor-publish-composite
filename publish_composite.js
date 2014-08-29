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


var Subscription = function(meteorSub) {
    var self = this;
    this.meteorSub = meteorSub;
    this.docHash = {};
    this.refCounter = new DocumentRefCounter({
        onChange: function(collectionName, docId, refCount) {
            debugLog("Subscription.refCounter.onChange", collectionName + ":" + docId.valueOf() + " " + refCount);
            if (refCount <= 0) {
                meteorSub.removed(collectionName, docId);
                self._removeDocHash(docId);
            }
        }
    });
};

Subscription.prototype.added = function(collectionName, doc) {
    this.refCounter.increment(collectionName, doc._id);

    if (this._hasDocChanged(doc)) {
        debugLog("Subscription.added", collectionName + ":" + doc._id);
        this.meteorSub.added(collectionName, doc._id, doc);
        this._addDocHash(doc);
    }
};

Subscription.prototype.changed = function(collectionName, doc) {
    if (this._hasDocChanged(doc)) {
        debugLog("Subscription.changed", collectionName + ":" + doc._id);
        this.meteorSub.changed(collectionName, doc._id, doc);
        this._addDocHash(doc);
    }
};

Subscription.prototype.removed = function(collectionName, docId) {
    debugLog("Subscription.removed", collectionName + ":" + docId.valueOf());
    this.refCounter.decrement(collectionName, docId);
};

Subscription.prototype._addDocHash = function(doc) {
    this.docHash[doc._id.valueOf()] = doc;
};

Subscription.prototype._hasDocChanged = function(doc) {
    var existingDoc = this.docHash[doc._id.valueOf()];

    if (!existingDoc) { return true; }

    return !_.isEqual(doc, existingDoc);
};

Subscription.prototype._removeDocHash = function(docId) {
    delete this.docHash[docId.valueOf()];
};



var Publication = function(subscription, options, args) {
    this.subscription = subscription;
    this.options = options;
    this.args = args || [];
    this.children = options.children || [];
    this.childPublications = [];
    this.collectionName = options.collectionName;
};

Publication.prototype.publish = function() {
    this.cursor = this._getCursor();

    if (!this.cursor) { return; }

    var collectionName = this._getCollectionName();
    var self = this;

    this.observeHandle = this.cursor.observe({
        added: function(doc) {
            var alreadyPublished = !!self.childPublications[doc._id];

            if (alreadyPublished) {
                debugLog("Publication.observeHandle.added", collectionName + ":" + doc._id + " already published");
                self.subscription.changed(collectionName, doc);
                self._republishChildrenOf(doc);
            } else {
                self.subscription.added(collectionName, doc);
                self._publishChildrenOf(doc);
            }
        },
        changed: function(doc) {
            debugLog("Publication.observeHandle.changed", collectionName + ":" + doc._id);
            self.subscription.changed(collectionName, doc);
            self._republishChildrenOf(doc);
        },
        removed: function(doc) {
            debugLog("Publication.observeHandle.removed", collectionName + ":" + doc._id);
            self._unpublishChildrenOf(doc._id);
            self.subscription.removed(collectionName, doc._id);
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

Publication.prototype.republish = function() {
    var self = this;
    var collectionName = this._getCollectionName();

    var oldPublishedIds;
    if (this.cursor) {
        this.cursor.rewind();
        oldPublishedIds = this.cursor.map(function(doc) { return doc._id; });
    } else {
        oldPublishedIds = [];
    }

    debugLog("Publication.republish", "stop observing old cursor");
    if (this.observeHandle) {
        this.observeHandle.stop();
        delete this.observeHandle;
    }

    debugLog("Publication.republish", "run .publish again");
    this.publish();

    var newPublishedIds;
    if (this.cursor) {
        this.cursor.rewind();
        newPublishedIds = this.cursor.map(function(doc) { return doc._id.valueOf(); });
    } else {
        newPublishedIds = [];
    }

    var docsToRemove = _.filter(oldPublishedIds, function(oldId) {
        oldId = oldId.valueOf();
        return !_.any(newPublishedIds, function(newId) { return newId === oldId; });
    });

    debugLog("Publication.republish", "unpublish docs from old cursor, " + JSON.stringify(docsToRemove));
    _.each(docsToRemove, function(docId) {
        self._unpublishChildrenOf(docId);
        self.subscription.removed(collectionName, docId);
    });
};

Publication.prototype._getCursor = function() {
    return this.options.find.apply(this.subscription.meteorSub, this.args);
};

Publication.prototype._getCollectionName = function() {
    return this.collectionName || (this.cursor && this.cursor._getCollectionName());
};

Publication.prototype._publishChildrenOf = function(doc) {
    this.childPublications[doc._id] = [];

    _.each(this.children, function(options) {
        var pub = new Publication(this.subscription, options, [ doc ].concat(this.args));
        this.childPublications[doc._id].push(pub);
        pub.publish();
    }, this);
};

Publication.prototype._republishChildrenOf = function(doc) {
    if (this.childPublications[doc._id]) {
        _.each(this.childPublications[doc._id], function(pub) {
            pub.args[0] = doc;
            pub.republish();
        });
    }
};

Publication.prototype._unpublishChildrenOf = function(docId) {
    docId = docId.valueOf();

    debugLog("Publication._unpublishChildrenOf", "unpublishing children of " + this._getCollectionName() + ":" + docId);
    if (this.childPublications[docId]) {
        _.each(this.childPublications[docId], function(pub) {
            pub.unpublish();
        });
    }
    delete this.childPublications[docId];
};

Publication.prototype._removeAllCursorDocuments = function() {
    if (!this.cursor) { return; }

    var collectionName = this._getCollectionName();

    this.cursor.rewind();
    this.cursor.forEach(function(doc) {
        this.subscription.removed(collectionName, doc._id);
    }, this);
};

Publication.prototype._unpublishChildPublications = function() {
    for (var docId in this.childPublications) {
        this._unpublishChildrenOf(docId);
        delete this.childPublications[docId];
    }
};


var DocumentRefCounter = function(observer) {
    this.heap = {};
    this.observer = observer;
};

DocumentRefCounter.prototype.increment = function(collectionName, docId) {
    var key = collectionName + ":" + docId.valueOf();
    if (!this.heap[key]) {
        this.heap[key] = 0;
    }
    this.heap[key]++;
};

DocumentRefCounter.prototype.decrement = function(collectionName, docId) {
    var key = collectionName + ":" + docId.valueOf();
    if (this.heap[key]) {
        this.heap[key]--;

        this.observer.onChange(collectionName, docId, this.heap[key]);
    }
};


var enableDebugLogging = false;
var debugLog = enableDebugLogging ? function(source, message) {
    while (source.length < 35) { source += " "; }
    console.log("[" + source + "] " + message);
} : function() { };
