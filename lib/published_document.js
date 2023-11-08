class PublishedDocument {
  constructor (collectionName, docId) {
    this.collectionName = collectionName
    this.docId = docId
    this.childPublications = []
    this._isFlaggedForRemoval = false
  }

  addChildPub (childPublication) {
    this.childPublications.push(childPublication)
  }

  eachChildPub (callback) {
    for (const child of this.childPublications) {
      callback(child)
    }
  }

  isFlaggedForRemoval () {
    return this._isFlaggedForRemoval
  }

  unflagForRemoval () {
    this._isFlaggedForRemoval = false
  }

  flagForRemoval () {
    this._isFlaggedForRemoval = true
  }
}

export default PublishedDocument
