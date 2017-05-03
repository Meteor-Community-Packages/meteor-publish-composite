/* eslint-disable no-unused-expressions */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { describe, it } from 'meteor/practicalmeteor:mocha';
import { expect } from 'meteor/practicalmeteor:chai';
import { Authors, Comments, Posts } from './common';


const Articles = new Mongo.Collection('articles');
const CommentAuthors = new Mongo.Collection('commentAuthors');

describe('publishComposite', () => {
    /**
     * Define test helper
     */
    const testPublication = (testName, options) => {
        it(testName, (onComplete) => {
            let subscription;
            const onSubscriptionReady = function onSubscriptionReady() {
                Meteor.call('log', 'Sub ready, starting test', () => {
                    options.testHandler((error) => {
                        Meteor.call('log', 'Test finished, stopping sub', () => {
                            subscription.stop();
                            Meteor.call('log', 'TEST COMPLETE', () => {
                                onComplete(error);
                            });
                        });
                    }, subscription);
                });
            };
            const args = [options.publication].concat(options.args || []);
            args.push(onSubscriptionReady);

            Meteor.call('initTestData');

            Meteor.call('log', `** ${testName}: Subscribing`, () => {
                subscription = Meteor.subscribe(...args);
            });
        });
    };

    const asyncExpect = (expectAction, onComplete) => {
        try {
            expectAction();
        } catch (error) {
            onComplete(error);
            throw error;
        }
    };


    /**
     * Define tests
     */
    testPublication('Should publish all posts', {
        publication: 'allPosts',

        testHandler: (onComplete) => {
            const posts = Posts.find();
            asyncExpect(() => expect(posts.count()).to.equal(4), onComplete);

            onComplete();
        },
    });

    testPublication('Should publish all post authors', {
        publication: 'allPosts',

        testHandler: (onComplete) => {
            const posts = Posts.find();

            posts.forEach((post) => {
                const postAuthor = Authors.findOne({ username: post.author });
                asyncExpect(() => expect(postAuthor).to.be.defined, onComplete);
            });

            onComplete();
        },
    });

    testPublication('Should publish all post comments', {
        publication: 'allPosts',

        testHandler: (onComplete) => {
            const comments = Comments.find();
            asyncExpect(() => expect(comments.count()).to.equal(5), onComplete);

            onComplete();
        },
    });

    testPublication('Should publish all post comment authors', {
        publication: 'allPosts',

        testHandler: (onComplete) => {
            const comments = Comments.find();

            comments.forEach((comment) => {
                const commentAuthor = Authors.findOne({ username: comment.author });
                asyncExpect(() => expect(commentAuthor).to.be.defined, onComplete);
            });

            onComplete();
        },
    });

    testPublication('Should publish one user\'s posts', {
        publication: 'userPosts',
        args: ['marie'],

        testHandler: (onComplete) => {
            const allSubscribedPosts = Posts.find();
            asyncExpect(() => expect(allSubscribedPosts.count()).to.equal(2), onComplete);

            const postsByOtherAuthors = Posts.find({ author: { $ne: 'marie' } });
            asyncExpect(() => expect(postsByOtherAuthors.count()).to.equal(0), onComplete);

            onComplete();
        },
    });

    testPublication('Should remove author when comment is deleted', {
        publication: 'userPosts',
        args: ['marie'],

        testHandler: (onComplete) => {
            const mariesSecondPost = Posts.findOne({ title: 'Marie\'s second post' });

            asyncExpect(() => expect(Authors.find({ username: 'richard' }).count()).to.equal(1), onComplete);

            const richardsComment = Comments.findOne({ postId: mariesSecondPost._id, author: 'richard' });

            Meteor.call('removeComment', richardsComment._id, (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                asyncExpect(() => expect(Authors.find({ username: 'richard' }).count()).to.equal(0), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should not remove author when comment is deleted if author record still needed', {
        publication: 'userPosts',
        args: ['marie'],

        testHandler: (onComplete) => {
            const mariesSecondPost = Posts.findOne({ title: 'Marie\'s second post' });

            asyncExpect(() => expect(Authors.find({ username: 'marie' }).count()).to.equal(1), onComplete);

            const mariesComment = Comments.findOne({ postId: mariesSecondPost._id, author: 'marie' });

            Meteor.call('removeComment', mariesComment._id, (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                asyncExpect(() => expect(Authors.find({ username: 'marie' }).count()).to.equal(1), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should remove both post and author if post author is changed', {
        publication: 'userPosts',
        args: ['stephen'],

        testHandler: (onComplete) => {
            const post = Posts.findOne({ title: 'Post with no comments' });

            asyncExpect(() => expect(post).to.be.defined, onComplete);
            asyncExpect(() => expect(Authors.find({ username: 'stephen' }).count()).to.equal(1), onComplete);

            Meteor.call('updatePostAuthor', post._id, 'marie', (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                asyncExpect(() => expect(Posts.find().count()).to.equal(0), onComplete);
                asyncExpect(() => expect(Authors.find().count()).to.equal(0), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should publish new author and remove old if comment author is changed', {
        publication: 'userPosts',
        args: ['albert'],

        testHandler: (onComplete) => {
            const albertsPost = Posts.findOne({ title: 'Post with one comment' });
            const comment = Comments.findOne({ postId: albertsPost._id, author: 'richard' });

            asyncExpect(() => expect(Authors.find({ username: 'richard' }).count()).to.equal(1), onComplete);
            asyncExpect(() => expect(Authors.find({ username: 'john' }).count()).to.equal(0), onComplete);

            Meteor.call('updateCommentAuthor', comment._id, 'john', (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                asyncExpect(() => expect(Authors.find({ username: 'richard' }).count()).to.equal(0), onComplete);
                asyncExpect(() => expect(Authors.find({ username: 'john' }).count()).to.equal(1), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should remove post, comment, and comment author if post is deleted', {
        publication: 'userPosts',
        args: ['marie'],

        testHandler: (onComplete) => {
            const mariesFirstPost = Posts.findOne({ title: 'Marie\'s first post' });

            asyncExpect(() => expect(mariesFirstPost).to.be.defined, onComplete);
            const oldCommentCount = Comments.find({ postId: mariesFirstPost._id, author: 'albert' }).count();
            asyncExpect(() => expect(oldCommentCount).to.equal(1), onComplete);
            asyncExpect(() => expect(Authors.find({ username: 'albert' }).count()).to.equal(1), onComplete);

            Meteor.call('removePost', mariesFirstPost._id, (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                const newPostCount = Posts.find({ title: 'Marie\'s first post' }).count();
                asyncExpect(() => expect(newPostCount).to.equal(0), onComplete);
                const newCommentCount = Comments.find({ postId: mariesFirstPost._id, author: 'albert' }).count();
                asyncExpect(() => expect(newCommentCount).to.equal(0), onComplete);
                asyncExpect(() => expect(Authors.find({ username: 'albert' }).count()).to.equal(0), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should publish posts to client side collection named "articles"', {
        publication: 'postsAsArticles',

        testHandler: (onComplete) => {
            asyncExpect(() => expect(Posts.find().count()).to.equal(0), onComplete);
            asyncExpect(() => expect(Articles.find().count()).to.equal(4), onComplete);

            onComplete();
        },
    });

    testPublication('Should handle going from null cursor to non-null cursor when republishing', {
        publication: 'pubWithChildThatReturnsNullIfAuthorIsMarie',

        testHandler: (onComplete) => {
            const mariesFirstPost = Posts.findOne({ title: 'Marie\'s first post' });
            const oldComments = Comments.find({ postId: mariesFirstPost._id });

            asyncExpect(() => expect(oldComments.count()).to.equal(0), onComplete);

            Meteor.call('updatePostAuthor', mariesFirstPost._id, 'albert', (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                const newComments = Comments.find({ postId: mariesFirstPost._id });
                asyncExpect(() => expect(newComments.count()).to.be.greaterThan(0), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should handle going from non-null cursor to null cursor when republishing', {
        publication: 'pubWithChildThatReturnsNullIfAuthorIsMarie',

        testHandler: (onComplete) => {
            const albertsPost = Posts.findOne({ author: 'albert' });
            const oldComments = Comments.find({ postId: albertsPost._id });

            asyncExpect(() => expect(oldComments.count()).to.be.greaterThan(0), onComplete);

            Meteor.call('updatePostAuthor', albertsPost._id, 'marie', (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                const newComments = Comments.find({ postId: albertsPost._id });
                asyncExpect(() => expect(newComments.count()).to.equal(0), onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should remove field from document when it is unset', {
        publication: 'allPosts',

        testHandler: (onComplete) => {
            const albertsPost = Posts.findOne({ author: 'albert' });
            const oldComment = Comments.findOne({ postId: albertsPost._id });

            asyncExpect(() => expect(oldComment.text).to.be.defined, onComplete);

            Meteor.call('unsetCommentText', oldComment._id, (error) => {
                asyncExpect(() => expect(error).to.not.be.defined, onComplete);

                const newComment = Comments.findOne({ postId: albertsPost._id });
                asyncExpect(() => expect(newComment.text).to.not.be.defined, onComplete);

                onComplete();
            });
        },
    });

    testPublication('Should publish authors to both Authors and CommentAuthors collections', {
        publication: 'publishCommentAuthorsInAltClientCollection',

        testHandler: (onComplete) => {
            const albertAsAuthor = Authors.findOne({ username: 'albert' });
            const albertAsCommentAuthor = CommentAuthors.findOne({ username: 'albert' });

            asyncExpect(() => expect(albertAsAuthor).to.be.defined, onComplete);
            asyncExpect(() => expect(albertAsCommentAuthor).to.be.defined, onComplete);

            onComplete();
        },
    });

    testPublication('Should publish two top level publications specified with a function', {
        publication: 'twoUsersPosts',
        args: ['marie', 'albert'],

        testHandler: (onComplete) => {
            const mariesPost = Posts.findOne({ author: 'marie' });
            const albertsPost = Posts.findOne({ author: 'albert' });

            asyncExpect(() => expect(mariesPost).to.be.defined, onComplete);
            asyncExpect(() => expect(albertsPost).to.be.defined, onComplete);

            onComplete();
        },
    });

    testPublication('Should publish two top level publications specifed with an array', {
        publication: 'twoFixedAuthors',

        testHandler: (onComplete) => {
            const marie = Authors.findOne({ username: 'marie' });
            const albert = Authors.findOne({ username: 'albert' });

            asyncExpect(() => expect(marie).to.be.defined, onComplete);
            asyncExpect(() => expect(albert).to.be.defined, onComplete);

            onComplete();
        },
    });

    testPublication('Should gracefully return if publication handler returns nothing', {
        publication: 'returnNothing',

        testHandler: (onComplete, subscription) => {
            asyncExpect(() => expect(subscription.ready()).to.be.true, onComplete);

            onComplete();
        },
    });
});
