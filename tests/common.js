/* eslint-disable no-console */

import { Meteor } from 'meteor/meteor';

/**
 * Define collections used in tests
 */
const Posts = new Meteor.Collection('posts');
const Authors = new Meteor.Collection('authors');
const Comments = new Meteor.Collection('comments');

const allow = () => true;
Posts.allow({ insert: allow, update: allow, remove: allow });
Authors.allow({ insert: allow, update: allow, remove: allow });
Comments.allow({ insert: allow, update: allow, remove: allow });

/**
 * Utility methods
 */
Meteor.methods({
    removePost(postId) {
        console.log('calling removePost');
        Posts.remove(postId);
    },

    removeComment(commentId) {
        console.log('calling removeComment');
        Comments.remove(commentId);
    },

    updatePostAuthor(postId, newAuthor) {
        console.log(`calling updatePostAuthor, postId: ${postId}, newAuthor: ${newAuthor}`);
        Posts.update({ _id: postId }, { $set: { author: newAuthor } });
    },

    updateCommentAuthor(commentId, newAuthor) {
        console.log(`calling updateCommentAuthor, commentId: ${commentId}, newAuthor: ${newAuthor}`);
        Comments.update({ _id: commentId }, { $set: { author: newAuthor } });
    },

    unsetCommentText(commentId) {
        console.log(`calling unsetCommentText, commentId: ${commentId}`);
        Comments.update({ _id: commentId }, { $unset: { text: '' } });
    },
});


export {
    Posts,
    Authors,
    Comments,
};
