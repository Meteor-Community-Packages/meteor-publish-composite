/**
 * Define collections used in tests
 */
Posts = new Meteor.Collection('posts');
Authors = new Meteor.Collection('authors');
Comments = new Meteor.Collection('comments');

var allow = function() { return true; };
Posts.allow({ insert: allow, update: allow, remove: allow });
Authors.allow({ insert: allow, update: allow, remove: allow });
Comments.allow({ insert: allow, update: allow, remove: allow });


/**
 * Set up publications for testing
 */
if (Meteor.isServer) {
    Meteor.publishComposite.enableDebugLogging();

    var postPublicationChildren = [
        {
            find: function(post) {
                return Authors.find({ username: post.author });
            }
        },
        {
            find: function(post) {
                return Comments.find({ postId: post._id });
            },
            children: [
                {
                    find: function(comment) {
                        return Authors.find({ username: comment.author });
                    }
                }
            ]
        }
    ];

    Meteor.publishComposite('allPosts', {
        find: function() {
            return Posts.find();
        },
        children: postPublicationChildren
    });

    Meteor.publishComposite('userPosts', function(username) {
        return {
            find: function() {
                console.log('userPosts.find() called');
                return Posts.find({ author: username });
            },
            children: postPublicationChildren
        };
    });

    Meteor.publishComposite('postsAsArticles', {
        collectionName: 'articles',
        find: function() {
            return Posts.find();
        }
    });

    Meteor.publishComposite('pubWithChildThatReturnsNullIfAuthorIsMarie', {
        find: function() {
            return Posts.find();
        },
        children: [
            {
                find: function(post) {
                    if (post.author === 'marie') {
                        return null;
                    }

                    return Comments.find({ postId: post._id });
                }
            }
        ]
    });

    Meteor.publishComposite('publishCommentAuthorsInAltClientCollection', {
        find: function() {
            return Posts.find();
        },
        children: [
            {
                find: function(post) {
                    return Authors.find({ username: post.author });
                }
            },
            {
                find: function(post) {
                    return Comments.find({ postId: post._id });
                },
                children: [
                    {
                        collectionName: 'commentAuthors',
                        find: function(comment) {
                            return Authors.find({ username: comment.author });
                        }
                    }
                ]
            }
        ]
    });

    Meteor.publishComposite('twoUsersPosts', function(username1, username2) {
        return [
            {
                find: function() {
                    return Posts.find({ author: username1 });
                },
                children: postPublicationChildren
            },
            {
                find: function() {
                    return Posts.find({ author: username2 });
                },
                children: postPublicationChildren
            }
        ];
    });

    Meteor.publishComposite('twoFixedAuthors', [
        {
            find: function() {
                return Authors.find({ username: 'marie' });
            }
        },
        {
            find: function() {
                return Authors.find({ username: 'albert' });
            }
        }
    ]);

    Meteor.publishComposite('returnNothing', function() {
    });
}

if (Meteor.isClient) {
    Articles = new Meteor.Collection('articles');
    CommentAuthors = new Meteor.Collection('commentAuthors');
}


/**
 * Define test helper
 */
var testPublication = function(testName, options) {
    options.args = options.args || [];

    Tinytest.addAsync(testName, function(assert, onComplete) {
        var subscription;
        var args = [ options.publication ].concat(options.args);

        args.push(function onSubscriptionReady() {
            Meteor.call('log', 'Sub ready, starting test', function() {
                options.testHandler(assert, function() {
                    Meteor.call('log', 'stopping sub', function() {
                        subscription.stop();
                        Meteor.call('log', 'test complete', function() {
                            onComplete();
                        });
                    });
                }, subscription);
            });
        });

        Meteor.call('initTestData');

        Meteor.call('log', '** ' + testName + ': Subscribing', function() {
            subscription = Meteor.subscribe.apply(Meteor, args);
        });
    });
};


/**
 * Define tests
 */
if (Meteor.isClient) {
    testPublication('Should publish all posts', {
        publication: 'allPosts',

        testHandler: function(assert, onComplete) {
            var posts = Posts.find();
            assert.equal(posts.count(), 4, 'Post count');

            onComplete();
        }
    });

    testPublication('Should publish all post authors', {
        publication: 'allPosts',

        testHandler: function(assert, onComplete) {
            var posts = Posts.find();

            posts.forEach(function(post) {
                var author = Authors.findOne({ username: post.author });
                assert.isTrue(typeof author !== 'undefined', 'Post author');
            });

            onComplete();
        }
    });

    testPublication('Should publish all post comments', {
        publication: 'allPosts',

        testHandler: function(assert, onComplete) {
            var comments = Comments.find();
            assert.equal(comments.count(), 5, 'Comment count');

            onComplete();
        }
    });

    testPublication('Should publish all post comment authors', {
        publication: 'allPosts',

        testHandler: function(assert, onComplete) {
            var comments = Comments.find();

            comments.forEach(function(comment) {
                var author = Authors.findOne({ username: comment.author });
                assert.isTrue(typeof author !== 'undefined', 'Comment author');
            });

            onComplete();
        }
    });

    testPublication('Should publish one user\'s posts', {
        publication: 'userPosts',
        args: [ 'marie' ],

        testHandler: function(assert, onComplete) {
            var allSubscribedPosts = Posts.find();
            assert.equal(allSubscribedPosts.count(), 2, 'Post count');

            var postsByOtherAuthors = Posts.find({ author: { $ne: 'marie' } });
            assert.equal(postsByOtherAuthors.count(), 0, 'Post count');

            onComplete();
        }
    });

    testPublication('Should remove author when comment is deleted', {
        publication: 'userPosts',
        args: [ 'marie' ],

        testHandler: function(assert, onComplete) {
            var mariesSecondPost = Posts.findOne({ title: 'Marie\'s second post' });

            assert.equal(Authors.find({ 'username': 'richard' }).count(), 1, 'Author present pre-delete');

            var richardsComment = Comments.findOne({ postId: mariesSecondPost._id, author: 'richard' });

            Meteor.call('removeComment', richardsComment._id, function(err) {
                assert.isUndefined(err);

                assert.equal(Authors.find({ 'username': 'richard' }).count(), 0, 'Author absent post-delete');

                onComplete();
            });
        }
    });

    testPublication('Should not remove author when comment is deleted if author record still needed', {
        publication: 'userPosts',
        args: [ 'marie' ],

        testHandler: function(assert, onComplete) {
            var mariesSecondPost = Posts.findOne({ title: 'Marie\'s second post' });

            assert.equal(Authors.find({ 'username': 'marie' }).count(), 1, 'Author present pre-delete');

            var mariesComment = Comments.findOne({ postId: mariesSecondPost._id, author: 'marie' });

            Meteor.call('removeComment', mariesComment._id, function(err) {
                assert.isUndefined(err);

                assert.equal(Authors.find({ 'username': 'marie' }).count(), 1, 'Author still present post-delete');

                onComplete();
            });
        }
    });

    testPublication('Should remove both post and author if post author is changed', {
        publication: 'userPosts',
        args: [ 'stephen' ],

        testHandler: function(assert, onComplete) {
            var post = Posts.findOne({ title: 'Post with no comments' });

            assert.isTrue(typeof post !== 'undefined' , 'Post present pre-change');
            assert.equal(Authors.find({ 'username': 'stephen' }).count(), 1, 'Author present pre-change');

            Meteor.call('updatePostAuthor', post._id, 'marie', function(err) {
                assert.isUndefined(err);

                assert.equal(Posts.find().count(), 0, 'Post absent post-change');
                assert.equal(Authors.find().count(), 0, 'Author absent post-change');

                onComplete();
            });
        }
    });

    testPublication('Should publish new author and remove old if comment author is changed', {
        publication: 'userPosts',
        args: [ 'albert' ],

        testHandler: function(assert, onComplete) {
            var albertsPost = Posts.findOne({ title: 'Post with one comment' });
            var comment = Comments.findOne({ postId: albertsPost._id, author: 'richard' });

            assert.equal(Authors.find({ 'username': 'richard' }).count(), 1, 'Old author present pre-change');
            assert.equal(Authors.find({ 'username': 'john' }).count(), 0, 'New author absent pre-change');

            Meteor.call('updateCommentAuthor', comment._id, 'john', function(err) {
                assert.isUndefined(err);

                assert.equal(Authors.find({ 'username': 'richard' }).count(), 0, 'Old author absent post-change');
                assert.equal(Authors.find({ 'username': 'john' }).count(), 1, 'New author present post-change');

                onComplete();
            });
        }
    });

    testPublication('Should remove post, comment, and comment author if post is deleted', {
        publication: 'userPosts',
        args: [ 'marie' ],

        testHandler: function(assert, onComplete) {
            var mariesFirstPost = Posts.findOne({ title: 'Marie\'s first post' });

            assert.isTrue(typeof mariesFirstPost !== 'undefined', 'Post present pre-change');
            assert.equal(Comments.find({ postId: mariesFirstPost._id, author: 'albert' }).count(), 1, 'Comment present pre-change');
            assert.equal(Authors.find({ username: 'albert' }).count(), 1, 'Comment author present pre-change');

            Meteor.call('removePost', mariesFirstPost._id, function(err) {
                assert.isUndefined(err);

                assert.equal(Posts.find({ title: 'Marie\'s first post' }).count(), 0, 'Post absent post-change');
                assert.equal(Comments.find({ postId: mariesFirstPost._id, author: 'albert' }).count(), 0, 'Comment absent post-change');
                assert.equal(Authors.find({ username: 'albert' }).count(), 0, 'Comment author absent post-change');

                onComplete();
            });
        }
    });

    testPublication('Should publish posts to client side collection named "articles"', {
        publication: 'postsAsArticles',

        testHandler: function(assert, onComplete) {
            assert.equal(Posts.find().count(), 0, 'Posts collection empty on client');
            assert.equal(Articles.find().count(), 4, 'Articles collection not empty on client');

            onComplete();
        }
    });

    testPublication('Should handle going from null cursor to non-null cursor when republishing', {
        publication: 'pubWithChildThatReturnsNullIfAuthorIsMarie',

        testHandler: function(assert, onComplete) {
            var mariesFirstPost = Posts.findOne({ title: 'Marie\'s first post' });
            var comments = Comments.find({ postId: mariesFirstPost._id });

            assert.isTrue(comments.count() === 0, 'No comments published');

            Meteor.call('updatePostAuthor', mariesFirstPost._id, 'albert', function(err) {
                assert.isUndefined(err);

                comments = Comments.find({ postId: mariesFirstPost._id });
                assert.isTrue(comments.count() > 0, 'Comments published');

                onComplete();
            });
        }
    });

    testPublication('Should handle going from non-null cursor to null cursor when republishing', {
        publication: 'pubWithChildThatReturnsNullIfAuthorIsMarie',

        testHandler: function(assert, onComplete) {
            var albertsPost = Posts.findOne({ author: 'albert' });
            var comments = Comments.find({ postId: albertsPost._id });

            assert.isTrue(comments.count() > 0, 'Comments published');

            Meteor.call('updatePostAuthor', albertsPost._id, 'marie', function(err) {
                assert.isUndefined(err);

                comments = Comments.find({ postId: albertsPost._id });
                assert.isTrue(comments.count() === 0, 'No comments published');

                onComplete();
            });
        }
    });

    testPublication('Should remove field from document when it is unset', {
        publication: 'allPosts',

        testHandler: function(assert, onComplete) {
            var albertsPost = Posts.findOne({ author: 'albert' });
            var comment = Comments.findOne({ postId: albertsPost._id });

            assert.isTrue(typeof comment.text !== 'undefined', 'Comment has text field');

            Meteor.call('unsetCommentText', comment._id, function(err) {
                assert.isUndefined(err);

                comment = Comments.findOne({ postId: albertsPost._id });
                assert.isTrue(typeof comment.text === 'undefined', 'Comment no longer has text field');

                onComplete();
            });
        }
    });

    testPublication('Should publish authors to both Authors and CommentAuthors collections', {
        publication: 'publishCommentAuthorsInAltClientCollection',

        testHandler: function(assert, onComplete) {
            var albertAsAuthor = Authors.findOne({ username: 'albert' });
            var albertAsCommentAuthor = CommentAuthors.findOne({ username: 'albert' });

            assert.isTrue(typeof albertAsAuthor !== 'undefined', 'Albert present in Authors collection');
            assert.isTrue(typeof albertAsCommentAuthor !== 'undefined', 'Albert present in CommentAuthors collection');

            onComplete();
        }
    });

    testPublication('Should publish two top level publications specified with a function', {
        publication: 'twoUsersPosts',
        args: [ 'marie', 'albert' ],

        testHandler: function(assert, onComplete) {
            var mariesPost = Posts.findOne({ author: 'marie' });
            var albertsPost = Posts.findOne({ author: 'albert' });

            assert.isTrue(typeof mariesPost !== 'undefined', 'Marie\'s post present');
            assert.isTrue(typeof albertsPost !== 'undefined', 'Albert\'s post present');

            onComplete();
        }
    });

    testPublication('Should publish two top level publications specifed with an array', {
        publication: 'twoFixedAuthors',

        testHandler: function(assert, onComplete) {
            var marie = Authors.findOne({ username: 'marie' });
            var albert = Authors.findOne({ username: 'albert' });

            assert.isTrue(typeof marie !== 'undefined', 'Marie present');
            assert.isTrue(typeof albert !== 'undefined', 'Albert present');

            onComplete();
        }
    });

    testPublication('Should gracefully return if publication handler returns nothing', {
        publication: 'returnNothing',

        testHandler: function(assert, onComplete, subscription) {
            assert.isTrue(subscription.ready(), 'Subscription is ready');

            onComplete();
        }
    });
}


/**
 * Utility methods
 */
if (Meteor.isServer) {
    Meteor.methods({
        initTestData: (function() {
            return function() {
                removeAllData();
                initUsers();
                initPosts();
            };

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
                    author: 'albert'
                }]);

                insertPost('Marie\'s second post', 'marie', [
                    {
                        text: 'Richard\'s comment',
                        author: 'richard'
                    },
                    {
                        text: 'Stephen\'s comment',
                        author: 'stephen'
                    },
                    {
                        text: 'Marie\'s comment',
                        author: 'marie'
                    }
                ]);

                insertPost('Post with one comment', 'albert', [{
                    text: 'Comment text',
                    author: 'richard'
                }]);

                insertPost('Post with no comments', 'stephen');
            }

            function insertPost(title, author, comments) {
                var postId = new Mongo.ObjectID();
                var commentId, commentData;

                Posts.insert({
                    _id: postId,
                    title: title,
                    author: author
                });

                if (comments) {
                    for (var i = 0; i < comments.length; i++) {
                        commentId = new Mongo.ObjectID();
                        commentData = _.extend({ _id: commentId, postId: postId }, comments[i]);

                        Comments.insert(commentData);
                    }
                }
            }
        }()),

        log: function(message) {
            console.log(message);
        }
    });
}

Meteor.methods({
    removePost: function(postId) {
        console.log('calling removePost');
        Posts.remove(postId);
    },

    removeComment: function(commentId) {
        console.log('calling removeComment');
        Comments.remove(commentId);
    },

    updatePostAuthor: function(postId, newAuthor) {
        console.log('calling updatePostAuthor, postId: ' + postId + ', newAuthor: ' + newAuthor);
        Posts.update({ _id: postId }, { $set: { author: newAuthor } });
    },

    updateCommentAuthor: function(commentId, newAuthor) {
        console.log('calling updateCommentAuthor, commentId: ' + commentId + ', newAuthor: ' + newAuthor);
        Comments.update({ _id: commentId }, { $set: { author: newAuthor } });
    },

    unsetCommentText: function(commentId) {
        console.log('calling unsetCommentText, commentId: ' + commentId);
        Comments.update({ _id: commentId }, { $unset: { text: '' } });
    }
});
