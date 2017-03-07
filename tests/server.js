/* eslint-disable no-console */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { enableDebugLogging } from 'meteor/reywood:publish-composite';

import { Authors, Comments, Posts } from './common';
import { debugLog } from '../lib/logging';


enableDebugLogging();

/**
 * Set up publications for testing
 */
const postPublicationChildren = [
    {
        find: function find(post) {
            return Authors.find({ username: post.author });
        },
    },
    {
        find: function find(post) {
            return Comments.find({ postId: post._id });
        },
        children: [
            {
                find: function find(comment) {
                    return Authors.find({ username: comment.author });
                },
            },
        ],
    },
];

Meteor.publishComposite('allPosts', {
    find: function find() {
        return Posts.find();
    },
    children: postPublicationChildren,
});

Meteor.publishComposite('userPosts', username => ({
    find: function find() {
        console.log('userPosts.find() called');
        return Posts.find({ author: username });
    },
    children: postPublicationChildren,
}));

Meteor.publishComposite('postsAsArticles', {
    collectionName: 'articles',
    find: function find() {
        return Posts.find();
    },
});

Meteor.publishComposite('pubWithChildThatReturnsNullIfAuthorIsMarie', {
    find: function find() {
        return Posts.find();
    },
    children: [
        {
            find: function find(post) {
                if (post.author === 'marie') {
                    return null;
                }

                return Comments.find({ postId: post._id });
            },
        },
    ],
});

Meteor.publishComposite('publishCommentAuthorsInAltClientCollection', {
    find: function find() {
        return Posts.find();
    },
    children: [
        {
            find: function find(post) {
                return Authors.find({ username: post.author });
            },
        },
        {
            find: function find(post) {
                return Comments.find({ postId: post._id });
            },
            children: [
                {
                    collectionName: 'commentAuthors',
                    find: function find(comment) {
                        return Authors.find({ username: comment.author });
                    },
                },
            ],
        },
    ],
});

Meteor.publishComposite('twoUsersPosts', (username1, username2) => [
    {
        find: function find() {
            return Posts.find({ author: username1 });
        },
        children: postPublicationChildren,
    },
    {
        find: function find() {
            return Posts.find({ author: username2 });
        },
        children: postPublicationChildren,
    },
]);

Meteor.publishComposite('twoFixedAuthors', [
    {
        find: function find() {
            return Authors.find({ username: 'marie' });
        },
    },
    {
        find: function find() {
            return Authors.find({ username: 'albert' });
        },
    },
]);

Meteor.publishComposite('returnNothing', () => undefined);


/**
 * Utility methods
 */
Meteor.methods({
    initTestData: (() => {
        function removeAllData() {
            Comments.remove({});
            Posts.remove({});
            Authors.remove({});
        }

        function initUsers() {
            Authors.insert({ _id: new Mongo.ObjectID(), username: 'marie' });
            Authors.insert({ _id: new Mongo.ObjectID(), username: 'albert' });
            Authors.insert({ _id: new Mongo.ObjectID(), username: 'richard' });
            Authors.insert({ _id: new Mongo.ObjectID(), username: 'stephen' });
            Authors.insert({ _id: new Mongo.ObjectID(), username: 'john' });
        }

        function insertPost(title, author, comments) {
            const postId = new Mongo.ObjectID();
            let commentId;
            let commentData;

            Posts.insert({
                _id: postId,
                title,
                author,
            });

            if (comments) {
                for (let i = 0; i < comments.length; i++) {
                    commentId = new Mongo.ObjectID();
                    commentData = _.extend({ _id: commentId, postId }, comments[i]);

                    Comments.insert(commentData);
                }
            }
        }

        function initPosts() {
            insertPost('Marie\'s first post', 'marie', [{
                text: 'Comment text',
                author: 'albert',
            }]);

            insertPost('Marie\'s second post', 'marie', [
                {
                    text: 'Richard\'s comment',
                    author: 'richard',
                },
                {
                    text: 'Stephen\'s comment',
                    author: 'stephen',
                },
                {
                    text: 'Marie\'s comment',
                    author: 'marie',
                },
            ]);

            insertPost('Post with one comment', 'albert', [{
                text: 'Comment text',
                author: 'richard',
            }]);

            insertPost('Post with no comments', 'stephen');
        }

        return function initTestData() {
            removeAllData();
            initUsers();
            initPosts();
        };
    })(),

    log: function log(message) {
        debugLog('client', message);
    },
});
