/**
 * Define collections used in tests
 */
Posts = new Meteor.Collection("posts");
Authors = new Meteor.Collection("authors");
Comments = new Meteor.Collection("comments");

var allow = function() { return true; };
Posts.allow({ insert: allow, update: allow, remove: allow });
Authors.allow({ insert: allow, update: allow, remove: allow });
Comments.allow({ insert: allow, update: allow, remove: allow });


/**
 * Set up publications for testing
 */
if (Meteor.isServer) {
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

    Meteor.publishComposite("allPosts", {
        find: function() {
            return Posts.find();
        },
        children: postPublicationChildren
    });

    Meteor.publishComposite("userPosts", function(username) {
        return {
            find: function() {
                return Posts.find({ author: username });
            },
            children: postPublicationChildren
        }
    });
}


/**
 * Define tests
 */
if (Meteor.isClient) {
    Tinytest.addAsync("Should publish all posts", function(test, onComplete) {
        Meteor.call("initTestData");

        var subscription = Meteor.subscribe("allPosts", function() {
            var posts = Posts.find();
            test.equal(posts.count(), 3, "Post count");

            subscription.stop();
            onComplete();
        });
    });

    Tinytest.addAsync("Should publish all post authors", function(test, onComplete) {
        Meteor.call("initTestData");
        
        var subscription = Meteor.subscribe("allPosts", function() {
            var posts = Posts.find();

            posts.forEach(function(post) {
                var author = Authors.findOne({ username: post.author });
                test.isTrue(typeof author !== "undefined", "Post author");
            });

            subscription.stop();
            onComplete();
        });
    });

    Tinytest.addAsync("Should publish all post comments", function(test, onComplete) {
        Meteor.call("initTestData");
        
        var subscription = Meteor.subscribe("allPosts", function() {
            var comments = Comments.find();
            test.equal(comments.count(), 5, "Comment count");

            subscription.stop();
            onComplete();
        });
    });

    Tinytest.addAsync("Should publish all post comment authors", function(test, onComplete) {
        Meteor.call("initTestData");
        
        var subscription = Meteor.subscribe("allPosts", function() {
            var comments = Comments.find();

            comments.forEach(function(comment) {
                var author = Authors.findOne({ username: comment.author });
                test.isTrue(typeof author !== "undefined", "Comment author");
            });

            subscription.stop();
            onComplete();
        });
    });

    Tinytest.addAsync("Should publish one user's posts", function(test, onComplete) {
        Meteor.call("initTestData");
        
        var subscription = Meteor.subscribe("userPosts", "marie", function() {
            var allSubscribedPosts = Posts.find();
            test.equal(allSubscribedPosts.count(), 2, "Post count");

            var postsByOtherAuthors = Posts.find({ author: { $ne: "marie" } });
            test.equal(postsByOtherAuthors.count(), 0, "Post count");

            subscription.stop();
            onComplete();
        });
    });

    Tinytest.addAsync("Should remove author when comment is deleted", function(test, onComplete) {
        Meteor.call("initTestData");
        
        var subscription = Meteor.subscribe("userPosts", "marie", function() {
            var mariesSecondPost = Posts.findOne({ title: "Marie's second post" });

            test.equal(Authors.find({ "username": "richard" }).count(), 1, "Author present pre-delete");

            var comment = Comments.findOne({ postId: mariesSecondPost._id, text: "Richard's comment" });
            Meteor.call("removeComment", comment._id, function(err) {
                test.isUndefined(err);

                test.equal(Authors.find({ "username": "richard" }).count(), 0, "Author absent post-delete");

                subscription.stop();
                onComplete();
            });
        });
    });

    Tinytest.addAsync("Should not remove author when comment is deleted if author record still needed", function(test, onComplete) {
        Meteor.call("initTestData");
        
        var subscription = Meteor.subscribe("userPosts", "marie", function() {
            var mariesSecondPost = Posts.findOne({ title: "Marie's second post" });

            test.equal(Authors.find({ "username": "marie" }).count(), 1, "Author present pre-delete");

            var comment = Comments.findOne({ postId: mariesSecondPost._id, text: "Marie's comment" });
            Meteor.call("removeComment", comment._id, function(err) {
                test.isUndefined(err);

                test.equal(Authors.find({ "username": "marie" }).count(), 1, "Author still present post-delete");

                subscription.stop();
                onComplete();
            });
        });
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
                Authors.insert({ username: "marie" });
                Authors.insert({ username: "albert" });
                Authors.insert({ username: "richard" });
                Authors.insert({ username: "stephen" });
                Authors.insert({ username: "john" });
            }

            function initPosts() {
                insertPost("Marie's first post", "marie", [{
                    text: "Comment text",
                    author: "albert"
                }]);

                insertPost("Marie's second post", "marie", [
                    {
                        text: "Richard's comment",
                        author: "richard"
                    },
                    {
                        text: "Stephen's comment",
                        author: "stephen"
                    },
                    {
                        text: "Marie's comment",
                        author: "marie"
                    }
                ]);

                insertPost("Albert's first post", "albert", [{
                    text: "Comment text",
                    author: "richard"
                }]);
            }

            function insertPost(title, author, comments) {
                var postId = Posts.insert({
                    title: title,
                    author: author
                });

                var commentData;
                for (var i = 0; i < comments.length; i++) {
                    commentData = _.extend({}, comments[i], { postId: postId });

                    Comments.insert(commentData);
                }
            }
        }()),

        removeComment: function(commentId) {
            var count = Comments.remove(commentId);
        }
    });
}