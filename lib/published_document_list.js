import PublishedDocument from './published_document'
import { valueOfId } from './utils'

class PublishedDocumentList {
  constructor () {
    this.documents = {}
  }

  add (collectionName, docId) {
    const key = valueOfId(docId, true)

    if (!this.documents[key]) {
      this.documents[key] = new PublishedDocument(collectionName, docId)
    }
  }

  addChildPub (docId, publication) {
    if (!publication) { return }

    const key = valueOfId(docId, true)
    const doc = this.documents[key]

    if (typeof doc === 'undefined') {
      throw new Error(`Doc not found in list: ${key}`)
    }

    this.documents[key].addChildPub(publication)
  }

  get (docId) {
    const key = valueOfId(docId, true)
    return this.documents[key]
  }

  remove (docId) {
    const key = valueOfId(docId, true)
    delete this.documents[key]
  }

  has (docId) {
    return !!this.get(docId)
  }

  eachDocument (callback, context) {
    Object.values(this.documents).forEach(function execCallbackOnDoc (doc) {
      callback.call(this, doc)
    }, context || this)
  }

  eachChildPub (docId, callback) {
    const doc = this.get(docId)

    if (doc) {
      doc.eachChildPub(callback)
    }
  }

  getIds () {
    const docIds = []

    this.eachDocument((doc) => {
      docIds.push(doc.docId)
    })

    return docIds
  }

  unflagForRemoval (docId) {
    const doc = this.get(docId)

    if (doc) {
      doc.unflagForRemoval()
    }
  }

  flagAllForRemoval () {
    this.eachDocument((doc) => {
      doc.flagForRemoval()
    })
  }
}

export default PublishedDocumentList
