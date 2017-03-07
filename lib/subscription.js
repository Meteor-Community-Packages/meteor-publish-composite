import { _ } from 'meteor/underscore';

import DocumentRefCounter from './doc_ref_counter';
import { debugLog } from './logging';


const Subscription = function Subscription(meteorSub) {
    this.meteorSub = meteorSub;
    this.docHash = {};
    this.refCounter = new DocumentRefCounter({
        onChange: (collectionName, docId, refCount) => {
            debugLog('Subscription.refCounter.onChange', `${collectionName}:${docId.valueOf()} ${refCount}`);
            if (refCount <= 0) {
                meteorSub.removed(collectionName, docId);
                this._removeDocHash(collectionName, docId);
            }
        },
    });
};

Subscription.prototype.added = function added(collectionName, doc) {
    this.refCounter.increment(collectionName, doc._id);

    if (this._hasDocChanged(collectionName, doc._id, doc)) {
        debugLog('Subscription.added', `${collectionName}:${doc._id}`);
        this.meteorSub.added(collectionName, doc._id, doc);
        this._addDocHash(collectionName, doc);
    }
};

Subscription.prototype.changed = function changed(collectionName, id, changes) {
    if (this._shouldSendChanges(collectionName, id, changes)) {
        debugLog('Subscription.changed', `${collectionName}:${id}`);
        this.meteorSub.changed(collectionName, id, changes);
        this._updateDocHash(collectionName, id, changes);
    }
};

Subscription.prototype.removed = function removed(collectionName, id) {
    debugLog('Subscription.removed', `${collectionName}:${id.valueOf()}`);
    this.refCounter.decrement(collectionName, id);
};

Subscription.prototype._addDocHash = function _addDocHash(collectionName, doc) {
    this.docHash[this._buildHashKey(collectionName, doc._id)] = doc;
};

Subscription.prototype._updateDocHash = function _updateDocHash(collectionName, id, changes) {
    const key = this._buildHashKey(collectionName, id);
    const existingDoc = this.docHash[key] || {};
    this.docHash[key] = _.extend(existingDoc, changes);
};

Subscription.prototype._shouldSendChanges = function _shouldSendChanges(collectionName, id, changes) {
    return this._isDocPublished(collectionName, id) &&
        this._hasDocChanged(collectionName, id, changes);
};

Subscription.prototype._isDocPublished = function _isDocPublished(collectionName, id) {
    const key = this._buildHashKey(collectionName, id);
    return !!this.docHash[key];
};

Subscription.prototype._hasDocChanged = function _hasDocChanged(collectionName, id, doc) {
    const existingDoc = this.docHash[this._buildHashKey(collectionName, id)];

    if (!existingDoc) { return true; }

    return _.any(_.keys(doc), key => !_.isEqual(doc[key], existingDoc[key]));
};

Subscription.prototype._removeDocHash = function _removeDocHash(collectionName, id) {
    const key = this._buildHashKey(collectionName, id);
    delete this.docHash[key];
};

Subscription.prototype._buildHashKey = function _buildHashKey(collectionName, id) {
    return `${collectionName}::${id.valueOf()}`;
};

export default Subscription;
