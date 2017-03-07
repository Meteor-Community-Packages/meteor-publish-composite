import { _ } from 'meteor/underscore';

import PublishedDocument from './published_document';


const PublishedDocumentList = function PublishedDocumentList() {
    this.documents = {};
};

PublishedDocumentList.prototype.add = function add(collectionName, docId) {
    const key = this._valueOfId(docId);

    if (!this.documents[key]) {
        this.documents[key] = new PublishedDocument(collectionName, docId);
    }
};

PublishedDocumentList.prototype.addChildPub = function addChildPub(docId, publication) {
    if (!publication) { return; }

    const key = this._valueOfId(docId);
    const doc = this.documents[key];

    if (typeof doc === 'undefined') {
        throw new Error(`Doc not found in list: ${key}`);
    }

    this.documents[key].addChildPub(publication);
};

PublishedDocumentList.prototype.get = function get(docId) {
    const key = this._valueOfId(docId);
    return this.documents[key];
};

PublishedDocumentList.prototype.remove = function remove(docId) {
    const key = this._valueOfId(docId);
    delete this.documents[key];
};

PublishedDocumentList.prototype.has = function has(docId) {
    return !!this.get(docId);
};

PublishedDocumentList.prototype.eachDocument = function eachDocument(callback, context) {
    _.each(this.documents, function execCallbackOnDoc(doc) {
        callback.call(this, doc);
    }, context || this);
};

PublishedDocumentList.prototype.eachChildPub = function eachChildPub(docId, callback) {
    const doc = this.get(docId);

    if (doc) {
        doc.eachChildPub(callback);
    }
};

PublishedDocumentList.prototype.getIds = function getIds() {
    const docIds = [];

    this.eachDocument((doc) => {
        docIds.push(doc.docId);
    });

    return docIds;
};

PublishedDocumentList.prototype.unflagForRemoval = function unflagForRemoval(docId) {
    const doc = this.get(docId);

    if (doc) {
        doc.unflagForRemoval();
    }
};

PublishedDocumentList.prototype.flagAllForRemoval = function flagAllForRemoval() {
    this.eachDocument((doc) => {
        doc.flagForRemoval();
    });
};

PublishedDocumentList.prototype._valueOfId = function _valueOfId(docId) {
    if (docId === null) {
        throw new Error('Document ID is null');
    }
    if (typeof docId === 'undefined') {
        throw new Error('Document ID is undefined');
    }
    return docId.valueOf();
};

export default PublishedDocumentList;
