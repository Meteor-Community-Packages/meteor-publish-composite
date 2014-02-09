meteor-publish-composite
========================

Meteor.publishComposite provides a flexible way to publish a set of documents and their
child documents in one go. In this way, a whole tree of documents can be published.

## Installation

```sh
$ mrt add publish-composite
```


## Usage

This package defines one new Meteor function:

#### Meteor.publishComposite(name, options) -- *Server*

Arguments

* **name** -- *string*

    The name of the publication

* **options** -- *object literal or callback function*

    An object literal specifying the configuration of the composite publication **or** a function that will
    receive some arguments from a call to `Meteor.subscribe(...)` (much like the function argument used with
    [`Meteor.publish`](http://docs.meteor.com/#meteor_publish)) and return an object literal. Basically,
    if your publication will take **no** arguments, pass an object literal for this argument. If your
    publication **will** take arguments, use a function that returns an object literal.

    The object literal should have two properties, `find` and `children`. The `find` property's value should
    be a function that returns a cursor of your top level documents. The `children` property's value should
    be an array containing any number of object literals with the same structure.

    ```javascript
    {
        find: function() {
            // Should return a cursor containing top level documents
        },
        children: [
            {
                find: function(topLevelDocument) {
                    // Called for each top level document. Top level document is passed
                    // in as an argument.
                    // Should return a cursor of second tier documents.
                },
                children: [
                    {
                        find: function(secondTierDocument, topLevelDocument) {
                            // Called for each second tier document. These find functions
                            // will receive all parent documents starting with the nearest
                            // parent and working all the way up to the top level as
                            // arguments.
                            // Should return a cursor of third tier documents.
                        },
                        children: [
                           // Repeat as many levels deep as you like
                        ]
                    }
                ]
            },
            {
                find: function(topLevelDocument) {
                    // Also called for each top level document.
                    // Should return another cursor of second tier documents.
                }
                // The children property is optional at every level.
            }
        ]
    }
    ```


## Examples

This example illustrates a publication that takes **no** arguments.

```javascript
// Server
Meteor.publishComposite('topTenPosts', {
    find: function() {
        // Find top ten scoring posts
        return Posts.find({}, { sort: { score: -1 }, limit: 10 });
    },
    children: [
        {
            find: function(post) {
                // Find top two comments on post
                return Comments.find({ postId: post._id }, { sort: { score: -1 }, limit: 2 });
            },
            children: [
                {
                    find: function(comment, post) {
                        // Find user that authored comment
                        return Users.find({ _id: comment.authorId }, { limit: 1 });
                    }
                }
            ]
        },
        {
            find: function(post) {
                // Find records from another collection related to posts
            }
        }
    ]
});

// Client
Meteor.subscribe('topTenPosts');
```

This example illustrates a publication that **does** take arguments. Note a function is passed for the `options` argument to `Meteor.publishComposite`.

```javascript
// Server
Meteor.publishComposite('postsByUser', function(userId, limit) {
    return {
        find: function() {
            // Find posts made by user. Note arguments for callback function being used in query.
            return Posts.find({ author: userId }, { limit: limit });
        },
        children: [
            // This section will be similar to the previous example. You could potentially store this
            // array in a variable and use it for both publications (as long as they don't utilize the
            // arguments passed to your publishComposite function param).
        ]
    }
});

// Client
var userId = 1, limit = 10;
Meteor.subscribe('postsByUser', userId, limit);
```
