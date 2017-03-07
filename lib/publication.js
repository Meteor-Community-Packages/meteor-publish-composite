import { _ } from 'meteor/underscore';

import { debugLog } from './publish_composite';
import PublishedDocumentList from './published_document_list';


const Publication = function Publication(subscription, options, args) {
    this.subscription = subscription;
    this.options = options;
    this.args = args || [];
    this.childrenOptions = options.children || [];
    this.publishedDocs = new PublishedDocumentList();
    this.collectionName = options.collectionName;
};

Publication.prototype.publish = function publish() {
    this.cursor = this._getCursor();
    if (!this.cursor) { return; }

    const collectionName = this._getCollectionName();

    this.observeHandle = this.cursor.observe({
        added: (doc) => {
            const alreadyPublished = this.publishedDocs.has(doc._id);

            if (alreadyPublished) {
                debugLog('Publication.observeHandle.added', `${collectionName}:${doc._id} already published`);
                this.publishedDocs.unflagForRemoval(doc._id);
                this.subscription.changed(collectionName, doc._id, doc);
                this._republishChildrenOf(doc);
            } else {
                this.publishedDocs.add(collectionName, doc._id);
                this.subscription.added(collectionName, doc);
                this._publishChildrenOf(doc);
            }
        },
        changed: (newDoc) => {
            debugLog('Publication.observeHandle.changed', `${collectionName}:${newDoc._id}`);
            this._republishChildrenOf(newDoc);
        },
        removed: (doc) => {
            debugLog('Publication.observeHandle.removed', `${collectionName}:${doc._id}`);
            this._removeDoc(collectionName, doc._id);
        },
    });

    this.observeChangesHandle = this.cursor.observeChanges({
        changed: (id, fields) => {
            debugLog('Publication.observeChangesHandle.changed', `${collectionName}:${id}`);
            this.subscription.changed(collectionName, id, fields);
        },
    });
};

Publication.prototype.unpublish = function unpublish() {
    debugLog('Publication.unpublish', this._getCollectionName());
    this._stopObservingCursor();
    this._unpublishAllDocuments();
};

Publication.prototype._republish = function _republish() {
    this._stopObservingCursor();

    this.publishedDocs.flagAllForRemoval();

    debugLog('Publication._republish', 'run .publish again');
    this.publish();

    debugLog('Publication._republish', 'unpublish docs from old cursor');
    this._removeFlaggedDocs();
};

Publication.prototype._getCursor = function _getCursor() {
    return this.options.find.apply(this.subscription.meteorSub, this.args);
};

Publication.prototype._getCollectionName = function _getCollectionName() {
    return this.collectionName || (this.cursor && this.cursor._getCollectionName());
};

Publication.prototype._publishChildrenOf = function _publishChildrenOf(doc) {
    _.each(this.childrenOptions, function createChildPublication(options) {
        const pub = new Publication(this.subscription, options, [doc].concat(this.args));
        this.publishedDocs.addChildPub(doc._id, pub);
        pub.publish();
    }, this);
};

Publication.prototype._republishChildrenOf = function _republishChildrenOf(doc) {
    this.publishedDocs.eachChildPub(doc._id, (publication) => {
        publication.args[0] = doc;
        publication._republish();
    });
};

Publication.prototype._unpublishAllDocuments = function _unpublishAllDocuments() {
    this.publishedDocs.eachDocument((doc) => {
        this._removeDoc(doc.collectionName, doc.docId);
    }, this);
};

Publication.prototype._stopObservingCursor = function _stopObservingCursor() {
    debugLog('Publication._stopObservingCursor', 'stop observing cursor');

    if (this.observeHandle) {
        this.observeHandle.stop();
        delete this.observeHandle;
    }

    if (this.observeChangesHandle) {
        this.observeChangesHandle.stop();
        delete this.observeChangesHandle;
    }
};

Publication.prototype._removeFlaggedDocs = function _removeFlaggedDocs() {
    this.publishedDocs.eachDocument((doc) => {
        if (doc.isFlaggedForRemoval()) {
            this._removeDoc(doc.collectionName, doc.docId);
        }
    }, this);
};

Publication.prototype._removeDoc = function _removeDoc(collectionName, docId) {
    this.subscription.removed(collectionName, docId);
    this._unpublishChildrenOf(docId);
    this.publishedDocs.remove(docId);
};

Publication.prototype._unpublishChildrenOf = function _unpublishChildrenOf(docId) {
    debugLog('Publication._unpublishChildrenOf', `unpublishing children of ${this._getCollectionName()}:${docId}`);

    this.publishedDocs.eachChildPub(docId, (publication) => {
        publication.unpublish();
    });
};

export default Publication;
