const PublishedDocument = function PublishedDocument(collectionName, docId) {
    this.collectionName = collectionName;
    this.docId = docId;
    this.childPublications = [];
    this._isFlaggedForRemoval = false;
};

PublishedDocument.prototype.addChildPub = function addChildPub(childPublication) {
    this.childPublications.push(childPublication);
};

PublishedDocument.prototype.eachChildPub = function eachChildPub(callback) {
    this.childPublications.forEach(callback);
};

PublishedDocument.prototype.isFlaggedForRemoval = function isFlaggedForRemoval() {
    return this._isFlaggedForRemoval;
};

PublishedDocument.prototype.unflagForRemoval = function unflagForRemoval() {
    this._isFlaggedForRemoval = false;
};

PublishedDocument.prototype.flagForRemoval = function flagForRemoval() {
    this._isFlaggedForRemoval = true;
};

export default PublishedDocument;
