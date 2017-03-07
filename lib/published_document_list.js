import { _ } from 'meteor/underscore';

import PublishedDocument from './published_document';


class PublishedDocumentList {
    constructor() {
        this.documents = {};
    }

    add(collectionName, docId) {
        const key = valueOfId(docId);

        if (!this.documents[key]) {
            this.documents[key] = new PublishedDocument(collectionName, docId);
        }
    }

    addChildPub(docId, publication) {
        if (!publication) { return; }

        const key = valueOfId(docId);
        const doc = this.documents[key];

        if (typeof doc === 'undefined') {
            throw new Error(`Doc not found in list: ${key}`);
        }

        this.documents[key].addChildPub(publication);
    }

    get(docId) {
        const key = valueOfId(docId);
        return this.documents[key];
    }

    remove(docId) {
        const key = valueOfId(docId);
        delete this.documents[key];
    }

    has(docId) {
        return !!this.get(docId);
    }

    eachDocument(callback, context) {
        _.each(this.documents, function execCallbackOnDoc(doc) {
            callback.call(this, doc);
        }, context || this);
    }

    eachChildPub(docId, callback) {
        const doc = this.get(docId);

        if (doc) {
            doc.eachChildPub(callback);
        }
    }

    getIds() {
        const docIds = [];

        this.eachDocument((doc) => {
            docIds.push(doc.docId);
        });

        return docIds;
    }

    unflagForRemoval(docId) {
        const doc = this.get(docId);

        if (doc) {
            doc.unflagForRemoval();
        }
    }

    flagAllForRemoval() {
        this.eachDocument((doc) => {
            doc.flagForRemoval();
        });
    }
}

function valueOfId(docId) {
    if (docId === null) {
        throw new Error('Document ID is null');
    }
    if (typeof docId === 'undefined') {
        throw new Error('Document ID is undefined');
    }
    return docId.valueOf();
}

export default PublishedDocumentList;
