Publication = function(subscription, options, args) {
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
            var alreadyPublished = !!self.childPublications[doc._id.valueOf()];

            if (alreadyPublished) {
                debugLog("Publication.observeHandle.added", collectionName + ":" + doc._id + " already published");
                self.subscription.changed(collectionName, doc._id, doc);
                self._republishChildrenOf(doc);
            } else {
                self.subscription.added(collectionName, doc);
                self._publishChildrenOf(doc);
            }
        },
        changed: function(newDoc) {
            debugLog("Publication.observeHandle.changed", collectionName + ":" + newDoc._id);
            self._republishChildrenOf(newDoc);
        },
        removed: function(doc) {
            debugLog("Publication.observeHandle.removed", collectionName + ":" + doc._id);
            self._unpublishChildrenOf(doc._id);
            self.subscription.removed(collectionName, doc._id);
        }
    });

    this.observeChangesHandle = this.cursor.observeChanges({
        changed: function(id, fields) {
            debugLog("Publication.observeChangesHandle.changed", collectionName + ":" + id);
            self.subscription.changed(collectionName, id, fields);
        }
    });
};

Publication.prototype.unpublish = function() {
    this._stopObservingCursor();
    this._removeAllCursorDocuments();
    this._unpublishChildPublications();
};

Publication.prototype._republish = function() {
    var collectionName = this._getCollectionName();
    var oldPublishedIds = this._getPublishedIds();

    debugLog("Publication._republish", "stop observing old cursor");
    this._stopObservingCursor();

    debugLog("Publication._republish", "run .publish again");
    this.publish();

    var newPublishedIds = this._getPublishedIds();
    var docsToRemove = _.difference(oldPublishedIds, newPublishedIds);

    debugLog("Publication._republish", "unpublish docs from old cursor, " + JSON.stringify(docsToRemove));
    _.each(docsToRemove, function(docId) {
        this._unpublishChildrenOf(docId);
        this.subscription.removed(collectionName, docId);
    }, this);
};

Publication.prototype._getCursor = function() {
    return this.options.find.apply(this.subscription.meteorSub, this.args);
};

Publication.prototype._getCollectionName = function() {
    return this.collectionName || (this.cursor && this.cursor._getCollectionName());
};

Publication.prototype._publishChildrenOf = function(doc) {
    var docId = doc._id.valueOf();

    this.childPublications[docId] = [];

    _.each(this.children, function(options) {
        var pub = new Publication(this.subscription, options, [ doc ].concat(this.args));
        this.childPublications[docId].push(pub);
        pub.publish();
    }, this);
};

Publication.prototype._republishChildrenOf = function(doc) {
    var docId = doc._id.valueOf();

    if (this.childPublications[docId]) {
        _.each(this.childPublications[docId], function(pub) {
            pub.args[0] = doc;
            pub._republish();
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

Publication.prototype._getPublishedIds = function() {
    if (this.cursor) {
        this.cursor.rewind();
        return this.cursor.map(function(doc) { return doc._id; });
    } else {
        return [];
    }
};

Publication.prototype._stopObservingCursor = function() {
    if (this.observeHandle) {
        this.observeHandle.stop();
        delete this.observeHandle;
    }

    if (this.observeChangesHandle) {
        this.observeChangesHandle.stop();
        delete this.observeChangesHandle;
    }
};
