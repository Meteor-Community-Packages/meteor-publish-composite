import { _ } from 'meteor/underscore';

import { debugLog } from './logging';
import PublishedDocumentList from './published_document_list';


class Publication {
    constructor(subscription, options, args) {
        this.subscription = subscription;
        this.options = options;
        this.args = args || [];
        this.childrenOptions = options.children || [];
        this.publishedDocs = new PublishedDocumentList();
        this.collectionName = options.collectionName;
    }

    publish() {
        this.cursor = this._getCursor();
        if (!this.cursor) { return; }

        const collectionName = this._getCollectionName();

        // Use Meteor.bindEnvironment to make sure the callbacks are run with the same
        // environmentVariables as when publishing the "parent".
        // It's only needed when publish is being recursively run.
        this.observeHandle = this.cursor.observe({
            added: Meteor.bindEnvironment((doc) => {
                const alreadyPublished = this.publishedDocs.has(doc._id);

                if (alreadyPublished) {
                    debugLog('Publication.observeHandle.added', `${collectionName}:${doc._id} already published`);
                    this.publishedDocs.unflagForRemoval(doc._id);
                    this._republishChildrenOf(doc);
                    this.subscription.changed(collectionName, doc._id, doc);
                } else {
                    this.publishedDocs.add(collectionName, doc._id);
                    this._publishChildrenOf(doc);
                    this.subscription.added(collectionName, doc);
                }
            }),
            changed: Meteor.bindEnvironment((newDoc) => {
                debugLog('Publication.observeHandle.changed', `${collectionName}:${newDoc._id}`);
                this._republishChildrenOf(newDoc);
            }),
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
    }

    unpublish() {
        debugLog('Publication.unpublish', this._getCollectionName());
        this._stopObservingCursor();
        this._unpublishAllDocuments();
    }

    _republish() {
        this._stopObservingCursor();

        this.publishedDocs.flagAllForRemoval();

        debugLog('Publication._republish', 'run .publish again');
        this.publish();

        debugLog('Publication._republish', 'unpublish docs from old cursor');
        this._removeFlaggedDocs();
    }

    _getCursor() {
        return this.options.find.apply(this.subscription.meteorSub, this.args);
    }

    _getCollectionName() {
        return this.collectionName || (this.cursor && this.cursor._getCollectionName());
    }

    _publishChildrenOf(doc) {
        _.each(this.childrenOptions, function createChildPublication(options) {
            const pub = new Publication(this.subscription, options, [doc].concat(this.args));
            this.publishedDocs.addChildPub(doc._id, pub);
            pub.publish();
        }, this);
    }

    _republishChildrenOf(doc) {
        this.publishedDocs.eachChildPub(doc._id, (publication) => {
            publication.args[0] = doc;
            publication._republish();
        });
    }

    _unpublishAllDocuments() {
        this.publishedDocs.eachDocument((doc) => {
            this._removeDoc(doc.collectionName, doc.docId);
        }, this);
    }

    _stopObservingCursor() {
        debugLog('Publication._stopObservingCursor', 'stop observing cursor');

        if (this.observeHandle) {
            this.observeHandle.stop();
            delete this.observeHandle;
        }

        if (this.observeChangesHandle) {
            this.observeChangesHandle.stop();
            delete this.observeChangesHandle;
        }
    }

    _removeFlaggedDocs() {
        this.publishedDocs.eachDocument((doc) => {
            if (doc.isFlaggedForRemoval()) {
                this._removeDoc(doc.collectionName, doc.docId);
            }
        }, this);
    }

    _removeDoc(collectionName, docId) {
        this.subscription.removed(collectionName, docId);
        this._unpublishChildrenOf(docId);
        this.publishedDocs.remove(docId);
    }

    _unpublishChildrenOf(docId) {
        debugLog('Publication._unpublishChildrenOf', `unpublishing children of ${this._getCollectionName()}:${docId}`);

        this.publishedDocs.eachChildPub(docId, (publication) => {
            publication.unpublish();
        });
    }
}

export default Publication;
