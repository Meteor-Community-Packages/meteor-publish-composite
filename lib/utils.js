import { Meteor } from 'meteor/meteor'
import { Log } from 'meteor/logging'

export function valueOfId (docId, doNotThrow) {
  if (docId === null) {
    if (doNotThrow) {
      Log.debug('Document ID is null')
      return ''
    }
    throw new Meteor.Error('Document ID is null')
  }
  if (typeof docId === 'undefined') {
    if (doNotThrow) {
      Log.debug('Document ID is undefined')
      return ''
    }
    throw new Meteor.Error('Document ID is undefined')
  }
  if (typeof docId === 'string') return docId
  return docId?.valueOf() || ''
}
