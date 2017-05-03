import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { enableDebugLogging, publishComposite } from 'meteor/reywood:publish-composite';

import { Authors, Comments, Posts } from './common';
import { debugLog } from '../lib/logging';


enableDebugLogging();

/**
 * Set up publications for testing
 */
const postPublicationChildren = [
    {
        find(post) {
            return Authors.find({ username: post.author });
        },
    },
    {
        find(post) {
            return Comments.find({ postId: post._id });
        },
        children: [
            {
                find(comment) {
                    return Authors.find({ username: comment.author });
                },
            },
        ],
    },
];

publishComposite('allPosts', {
    find() {
        return Posts.find();
    },
    children: postPublicationChildren,
});

publishComposite('userPosts', username => ({
    find() {
        debugLog('userPosts', 'userPosts.find() called');
        return Posts.find({ author: username });
    },
    children: postPublicationChildren,
}));

publishComposite('postsAsArticles', {
    collectionName: 'articles',
    find() {
        return Posts.find();
    },
});

publishComposite('pubWithChildThatReturnsNullIfAuthorIsMarie', {
    find() {
        return Posts.find();
    },
    children: [
        {
            find(post) {
                if (post.author === 'marie') {
                    return null;
                }

                return Comments.find({ postId: post._id });
            },
        },
    ],
});

publishComposite('publishCommentAuthorsInAltClientCollection', {
    find() {
        return Posts.find();
    },
    children: [
        {
            find(post) {
                return Authors.find({ username: post.author });
            },
        },
        {
            find(post) {
                return Comments.find({ postId: post._id });
            },
            children: [
                {
                    collectionName: 'commentAuthors',
                    find(comment) {
                        return Authors.find({ username: comment.author });
                    },
                },
            ],
        },
    ],
});

publishComposite('twoUsersPosts', (username1, username2) => [
    {
        find() {
            return Posts.find({ author: username1 });
        },
        children: postPublicationChildren,
    },
    {
        find() {
            return Posts.find({ author: username2 });
        },
        children: postPublicationChildren,
    },
]);

publishComposite('twoFixedAuthors', [
    {
        find() {
            return Authors.find({ username: 'marie' });
        },
    },
    {
        find() {
            return Authors.find({ username: 'albert' });
        },
    },
]);

publishComposite('returnNothing', () => undefined);


/**
 * Utility methods
 */
Meteor.methods({
    initTestData() {
        removeAllData();
        initUsers();
        initPosts();
    },

    log(message) {
        debugLog('client', message);
    },
});

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
