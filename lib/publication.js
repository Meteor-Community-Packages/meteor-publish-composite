Publication = function(subscription, options, args) {
    this.subscription = subscription;
    this.options = options;
    this.args = args || [];
    this.childrenOptions = options.children || [];
    this.publishedDocs = new PublishedDocumentList();
    this.collectionName = options.collectionName;
};

Publication.prototype.publish = function() {
    this.cursor = this._getCursor();

    if (!this.cursor) { return; }

    var collectionName = this._getCollectionName();
    var self = this;

    this.observeHandle = this.cursor.observe({
        added: function(doc) {
            var alreadyPublished = self.publishedDocs.has(doc._id);

            if (alreadyPublished) {
                debugLog("Publication.observeHandle.added", collectionName + ":" + doc._id + " already published");
                self.subscription.changed(collectionName, doc._id, doc);
                self._republishChildrenOf(doc);
            } else {
                self.publishedDocs.add(doc._id);
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
            self._removeDoc(collectionName, doc._id);
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
    debugLog("Publication.unpublish", this._getCollectionName());
    this._stopObservingCursor();
    this._unpublishAllDocuments();
};

Publication.prototype._republish = function() {
    var collectionName = this._getCollectionName();
    var oldPublishedIds = this.publishedDocs.getIds();

    debugLog("Publication._republish", "stop observing old cursor");
    this._stopObservingCursor();

    debugLog("Publication._republish", "run .publish again");
    this.publish();

    var newPublishedIds = this._getPublishedIds();
    var docsToRemove = _.difference(oldPublishedIds, newPublishedIds);

    debugLog("Publication._republish", "unpublish docs from old cursor");
    _.each(docsToRemove, function(docId) {
        this._removeDoc(collectionName, docId);
    }, this);
};

Publication.prototype._getCursor = function() {
    find = this.options.find;
    return find ? find.apply(this.subscription.meteorSub, this.args) : null;
};

Publication.prototype._getCollectionName = function() {
    return this.collectionName || (this.cursor && this.cursor._getCollectionName());
};

Publication.prototype._publishChildrenOf = function(doc) {
    _.each(this.childrenOptions, function(options) {
        var pub = new Publication(this.subscription, options, [ doc ].concat(this.args));
        this.publishedDocs.addChildPub(doc._id, pub);
        pub.publish();
    }, this);
};

Publication.prototype._republishChildrenOf = function(doc) {
    this.publishedDocs.eachChildPub(doc._id, function(publication) {
        publication.args[0] = doc;
        publication._republish();
    });
};

Publication.prototype._unpublishAllDocuments = function() {
    var collectionName = this._getCollectionName();

    this.publishedDocs.eachDocument(function(docId) {
        this._removeDoc(collectionName, docId);
    }, this);
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

Publication.prototype._removeDoc = function(collectionName, docId) {
    this.subscription.removed(collectionName, docId);
    this._unpublishChildrenOf(docId);
    this.publishedDocs.remove(docId);
};

Publication.prototype._unpublishChildrenOf = function(docId) {
    debugLog("Publication._unpublishChildrenOf", "unpublishing children of " + this._getCollectionName() + ":" + docId);

    this.publishedDocs.eachChildPub(docId, function(publication) {
        publication.unpublish();
    });
};


var PublishedDocumentList = function() {
    this.documents = [];
};

PublishedDocumentList.prototype.add = function(docId) {
    var key = docId.valueOf();

    if (!this.documents[key]) {
        this.documents[key] = new PublishedDocument(docId);
    }
};

PublishedDocumentList.prototype.addChildPub = function(docId, publication) {
    var key = docId.valueOf();

    this.add(docId);

    if (publication) {
        this.documents[key].addChildPub(publication);
    }
};

PublishedDocumentList.prototype.get = function(docId) {
    var key = docId.valueOf();
    return this.documents[key];
};

PublishedDocumentList.prototype.remove = function(docId) {
    var key = docId.valueOf();
    delete this.documents[key];
};

PublishedDocumentList.prototype.has = function(docId) {
    return !!this.get(docId);
};

PublishedDocumentList.prototype.eachDocument = function(callback, context) {
    for (var key in this.documents) {
        if (this.documents.hasOwnProperty(key)) {
            callback.call(context || this, this.documents[key].docId);
        }
    }
};

PublishedDocumentList.prototype.eachChildPub = function(docId, callback) {
    var doc = this.get(docId);

    if (doc) {
        doc.eachChildPub(callback);
    }
};

PublishedDocumentList.prototype.getIds = function() {
    var docIds = [];

    this.eachDocument(function(docId) {
        docIds.push(docId);
    });

    return docIds;
};


var PublishedDocument = function(docId) {
    this.docId = docId;
    this.childPublications = [];
};

PublishedDocument.prototype.addChildPub = function(childPublication) {
    this.childPublications.push(childPublication);
};

PublishedDocument.prototype.eachChildPub = function(callback) {
    for (var i = 0; i < this.childPublications.length; i++) {
        callback(this.childPublications[i]);
    }
};
