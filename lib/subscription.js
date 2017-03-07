import { _ } from 'meteor/underscore';

import DocumentRefCounter from './doc_ref_counter';
import { debugLog } from './logging';


class Subscription {
    constructor(meteorSub) {
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
    }

    added(collectionName, doc) {
        this.refCounter.increment(collectionName, doc._id);

        if (this._hasDocChanged(collectionName, doc._id, doc)) {
            debugLog('Subscription.added', `${collectionName}:${doc._id}`);
            this.meteorSub.added(collectionName, doc._id, doc);
            this._addDocHash(collectionName, doc);
        }
    }

    changed(collectionName, id, changes) {
        if (this._shouldSendChanges(collectionName, id, changes)) {
            debugLog('Subscription.changed', `${collectionName}:${id}`);
            this.meteorSub.changed(collectionName, id, changes);
            this._updateDocHash(collectionName, id, changes);
        }
    }

    removed(collectionName, id) {
        debugLog('Subscription.removed', `${collectionName}:${id.valueOf()}`);
        this.refCounter.decrement(collectionName, id);
    }

    _addDocHash(collectionName, doc) {
        this.docHash[buildHashKey(collectionName, doc._id)] = doc;
    }

    _updateDocHash(collectionName, id, changes) {
        const key = buildHashKey(collectionName, id);
        const existingDoc = this.docHash[key] || {};
        this.docHash[key] = _.extend(existingDoc, changes);
    }

    _shouldSendChanges(collectionName, id, changes) {
        return this._isDocPublished(collectionName, id) &&
            this._hasDocChanged(collectionName, id, changes);
    }

    _isDocPublished(collectionName, id) {
        const key = buildHashKey(collectionName, id);
        return !!this.docHash[key];
    }

    _hasDocChanged(collectionName, id, doc) {
        const existingDoc = this.docHash[buildHashKey(collectionName, id)];

        if (!existingDoc) { return true; }

        return _.any(_.keys(doc), key => !_.isEqual(doc[key], existingDoc[key]));
    }

    _removeDocHash(collectionName, id) {
        const key = buildHashKey(collectionName, id);
        delete this.docHash[key];
    }
}

function buildHashKey(collectionName, id) {
    return `${collectionName}::${id.valueOf()}`;
}

export default Subscription;
