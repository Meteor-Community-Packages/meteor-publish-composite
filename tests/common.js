/* eslint-disable no-console */

import { Mongo } from 'meteor/mongo'

/**
 * Define collections used in tests
 */
const Posts = new Mongo.Collection('posts')
const Authors = new Mongo.Collection('authors')
const Comments = new Mongo.Collection('comments')


export {
  Posts,
  Authors,
  Comments
}
