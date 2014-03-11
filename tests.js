Posts = new Meteor.Collection('posts');
Authors = new Meteor.Collection('authors');

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
                    return Authors.find({ _id: post.authorId }, { fields: { profile: 1 } });
                }
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
            test.equal(posts.count(), 4);

            var authors = Authors.find();
            test.equal(authors.count(), 3);

            subscription.stop();
        }));
    }]);

    testAsyncMulti("Should publish one user's posts", [function(test, expect) {
        var subscription = Meteor.subscribe('userPosts', 'marie', expect(function() {
            var posts = Posts.find();
            test.equal(posts.count(), 2);

            var authors = Authors.find();
            test.equal(authors.count(), 1);

            subscription.stop();
        }));
    }]);
}


// Util functions
var initData = function() {
    initUsers();
    initPosts();
};

var initUsers = function() {
    if (Authors.find().count() <= 0) {
        console.log('no users found, adding some');
        Authors.insert({
            username: 'marie',
            password: '123456',
            profile: {
                name: 'Marie Curie'
            }
        });
        Authors.insert({
            username: 'albert',
            password: '123456',
            profile: {
                name: 'Albert Einstein'
            }
        });
        Authors.insert({
            username: 'richard',
            password: '123456',
            profile: {
                name: 'Richard Feynman'
            }
        });
    }
};

var initPosts = function() {
    if (Posts.find().count() <= 0) {
        var marie = Authors.findOne({ username: 'marie' });
        var albert = Authors.findOne({ username: 'albert' });
        var richard = Authors.findOne({ username: 'richard' });

        Posts.insert({
            title: 'Marie\'s first post',
            authorId: marie._id
        });

        Posts.insert({
            title: 'Marie\'s second post',
            authorId: marie._id
        });

        Posts.insert({
            title: 'Albert\'s first post',
            authorId: albert._id
        });

        Posts.insert({
            title: 'Richard\'s first post',
            authorId: richard._id
        });
    }
};
