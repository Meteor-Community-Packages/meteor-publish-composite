_ = require('underscore');
require('should');
require('../lib/fake_cursor');
require('../lib/fake_meteor');
require('../../publish_composite');

describe('compositePublication', function() {
    it('should find child documents', function() {
        var postsCursor = new FakeCursor('posts', [
                { _id: 101, title: 'Post #1' },
                { _id: 102, title: 'Post #2' }
            ]),
            bestCommentsCursors = {
                post101: new FakeCursor('comments', [
                    { _id: 201, postId: 101, authorId: 301, text: 'Best comment #1 on post #1' },
                    { _id: 202, postId: 101, authorId: 302, text: 'Best comment #2 on post #1' }
                ]),
                post102: new FakeCursor('comments', [
                    { _id: 203, postId: 102, authorId: 301, text: 'Best comment #1 on post #2' }
                ])
            },
            newestCommentsCursors = {
                post101: new FakeCursor('comments', [
                    { _id: 204, postId: 101, authorId: 301, text: 'Newest comment #1 on post #1' }
                ]),
                post102: new FakeCursor('comments', [
                    { _id: 205, postId: 102, authorId: 301, text: 'Newest comment #1 on post #2' },
                    { _id: 206, postId: 102, authorId: 302, text: 'Newest comment #2 on post #2' }
                ])
            },
            userCursors = {
                user301: new FakeCursor('users', [
                    { _id: 301, name: 'Marie Curie' }
                ]),
                user302: new FakeCursor('users', [
                    { _id: 302, name: 'Richard Feynman' }
                ])
            };

        Meteor.publishComposite('publishCompositeTest', {
            find: function() {
                return postsCursor;
            },
            children: [
                {
                    find: function(post) {
                        return bestCommentsCursors['post' + post._id];
                    },
                    children: [
                        {
                            find: function(comment, post) {
                                post._id.should.equal(comment.postId);
                                return userCursors['user' + comment.authorId];
                            }
                        }
                    ]
                },
                {
                    find: function(post) {
                        return newestCommentsCursors['post' + post._id];
                    },
                    children: [
                        {
                            find: function(comment, post) {
                                post._id.should.equal(comment.postId);
                                return userCursors['user' + comment.authorId];
                            }
                        }
                    ]
                }
            ]
        });

        var subscription = Meteor.subscribe('publishCompositeTest');

        subscription.addedDocs.length.should.equal(14);
        subscription.addedDocs[0].id.should.equal(101);
        subscription.addedDocs[1].id.should.equal(201);
        subscription.addedDocs[2].id.should.equal(301);
        subscription.addedDocs[3].id.should.equal(202);
        subscription.addedDocs[4].id.should.equal(302);
        subscription.addedDocs[5].id.should.equal(204);
        subscription.addedDocs[6].id.should.equal(301);
        subscription.addedDocs[7].id.should.equal(102);
        subscription.addedDocs[8].id.should.equal(203);
        subscription.addedDocs[9].id.should.equal(301);
        subscription.addedDocs[10].id.should.equal(205);
        subscription.addedDocs[11].id.should.equal(301);
        subscription.addedDocs[12].id.should.equal(206);
        subscription.addedDocs[13].id.should.equal(302);
    });

    it('should send subscribe arguments through correctly on successive calls', function() {
        var capturedArg;

        Meteor.publishComposite('publishCompositeTest', function(arg) {
            return {
                find: function() {
                    capturedArg = arg;
                }
            };
        });

        Meteor.subscribe('publishCompositeTest', 'foo');
        capturedArg.should.equal('foo');

        Meteor.subscribe('publishCompositeTest', 'bar');
        capturedArg.should.equal('bar');
    });
});
