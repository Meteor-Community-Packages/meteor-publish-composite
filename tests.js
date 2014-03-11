Posts = new Meteor.Collection('posts');
Authors = new Meteor.Collection('authors');
Comments = new Meteor.Collection('comments');

if (Meteor.isServer) {
    Meteor.startup(function () {
        initData();
    });

    Meteor.publishComposite('allPosts', {
        find: function() {
            return Posts.find();
        },
        children: [
            {
                find: function(post) {
                    return Authors.find({ _id: post.authorId });
                }
            },
            {
                find: function(post) {
                    return Comments.find({ postId: post._id });
                },
                children: [
                    {
                        find: function(comment) {
                            return Authors.find({ _id: comment.authorId });
                        }
                    }
                ]
            }
        ]
    });

    Meteor.publishComposite("userPosts", function(username) {
        return {
            find: function() {
                var user = Authors.findOne({ username: username });
                return Posts.find({ authorId: user._id });
            },
            children: [
                {
                    find: function(post) {
                        return Authors.find({ _id: post.authorId }, { fields: { profile: 1 } });
                    }
                }
            ]
        }
    });
}

if (Meteor.isClient) {
    testAsyncMulti("Should publish all posts and authors", [function(test, expect) {
        var subscription = Meteor.subscribe('allPosts', expect(function() {
            var posts = Posts.find();
            test.equal(posts.count(), 3, "Post count");

            var authors = Authors.find();
            test.equal(authors.count(), 4, "Author count");

            var comments = Comments.find();
            test.equal(comments.count(), 4, "Comment count");

            subscription.stop();
        }));
    }]);

    testAsyncMulti("Should publish one user's posts", [function(test, expect) {
        var subscription = Meteor.subscribe('userPosts', 'marie', expect(function() {
            var posts = Posts.find();
            test.equal(posts.count(), 2, "Post count");

            var authors = Authors.find();
            test.equal(authors.count(), 1, "Author count");

            subscription.stop();
        }));
    }]);
}


// Util functions
var initData = (function() {
    return function() {
        removeAllData();
        initUsers();
        initPosts();
    };

    function removeAllData() {
        Comments.remove();
        Posts.remove();
        Authors.remove();
    }

    function initUsers() {
        if (Authors.find().count() <= 0) {
            console.log('no users found, adding some');

            Authors.insert({ username: 'marie' });
            Authors.insert({ username: 'albert' });
            Authors.insert({ username: 'richard' });
            Authors.insert({ username: 'stephen' });
            Authors.insert({ username: 'john' });
        }
    };

    function initPosts() {
        if (Posts.find().count() <= 0) {
            console.log('no posts found, adding some');

            var marie = Authors.findOne({ username: 'marie' });
            var albert = Authors.findOne({ username: 'albert' });
            var richard = Authors.findOne({ username: 'richard' });
            var stephen = Authors.findOne({ username: 'stephen' });

            insertPost('Marie\'s first post', marie._id, [{
                text: "Comment text",
                authorId: albert._id
            }]);

            insertPost('Marie\'s second post', marie._id, [
                {
                    text: "Comment one",
                    authorId: richard._id
                },
                {
                    text: "Comment two",
                    authorId: stephen._id
                }
            ]);

            insertPost('Albert\'s first post', albert._id, [{
                text: "Comment text",
                authorId: richard._id
            }]);
        }
    };

    function insertPost(title, authorId, comments) {
        var postId = Posts.insert({
            title: title,
            authorId: authorId
        });

        var commentData;
        for (var i = 0; i < comments.length; i++) {
            commentData = _.extend({}, comments[i], { postId: postId });

            Comments.insert(commentData);
        }
    };
}());
