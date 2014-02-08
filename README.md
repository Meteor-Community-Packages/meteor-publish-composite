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

* **name** -- *String*

    The name of the publication

* **options** -- *JSON object or callback function*

    A JSON object specifying the configuration of the composite **or** a function that will
    receive some arguments from a call to `Meteor.subscribe(...)` and return a JSON object. Basically,
    if your publication will take **no** arguments, pass a JSON object for this argument. If your
    publication **will** take arguments, use a function that returns the JSON object.

    The JSON object should be formatted as follows:

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


## Example

This example illustrates a publication that takes **no** arguments.

```javascript
// Server
Meteor.publishComposite('topTenPosts', {
    find: function() {
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
            // This section will be similar to the previous example
        ]
    }
});

// Client
var userId = 1, limit = 10;
Meteor.subscribe('postsByUser', userId, limit);
```
