meteor-publish-composite
========================

`publishComposite(...)` provides a flexible way to publish a set of related documents from various collections using a reactive join. This makes it easy to publish a whole tree of documents at once. The published collections are reactive and will update when additions/changes/deletions are made.

This project differs from many other parent/child relationship mappers in its flexibility. The relationship between a parent and its children can be based on almost anything. For example, let's say you have a site that displays news articles. On each article page, you would like to display a list at the end containing a couple of related articles. You could use `publishComposite` to publish the primary article, scan the body for keywords which are then used to search for other articles, and publish these related articles as children. Of course, the keyword extraction and searching are up to you to implement.

*Found a problem with this package? [See below for instructions on reporting](#reporting-issuesbugs).*

## Installation

```sh
$ meteor add reywood:publish-composite
```


## Usage

This package exports a function on the server:

#### publishComposite(name, options)

Arguments

* **`name`** -- *string*

    The name of the publication

* **`options`** -- *object literal or callback function*

    An object literal specifying the configuration of the composite publication **or** a function that returns said object literal. If a function is used, it will receive the arguments passed to `Meteor.subscribe('myPub', arg1, arg2, ...)` (much like the `func` argument of [`Meteor.publish`](http://docs.meteor.com/#meteor_publish)). Basically, if your publication will take **no** arguments, pass an object literal for this argument. If your publication **will** take arguments, use a function that returns an object literal.

    The object literal must have a `find` property, and can optionally have `children` and `collectionName` properties.

    * **`find`** -- *function (required)*

        A function that returns a MongoDB cursor (e.g., `return Meteor.users.find({ active: true });`)

    * **`children`** -- *array (optional)*

        An array containing any number of object literals with this same structure

    * **`collectionName`** -- *string (optional)*

        A string specifying an alternate collection name to publish documents to (see [this blog post][blog-collection-name] for more details)

    Example:

    ```javascript
    {
        find() {
            // Must return a cursor containing top level documents
        },
        children: [
            {
                find(topLevelDocument) {
                    // Called for each top level document. Top level document is passed
                    // in as an argument.
                    // Must return a cursor of second tier documents.
                },
                children: [
                    {
                        collectionName: 'alt', // Docs from this find will be published to the 'alt' collection
                        find(secondTierDocument, topLevelDocument) {
                            // Called for each second tier document. These find functions
                            // will receive all parent documents starting with the nearest
                            // parent and working all the way up to the top level as
                            // arguments.
                            // Must return a cursor of third tier documents.
                        },
                        children: [
                           // Repeat as many levels deep as you like
                        ]
                    }
                ]
            },
            {
                find(topLevelDocument) {
                    // Also called for each top level document.
                    // Must return another cursor of second tier documents.
                }
                // The children property is optional at every level.
            }
        ]
    }
    ```


## Examples

### Example 1: A publication that takes **no** arguments.

First, we'll create our publication on the server.

```javascript
// Server
import { publishComposite } from 'meteor/reywood:publish-composite';

publishComposite('topTenPosts', {
    find() {
        // Find top ten highest scoring posts
        return Posts.find({}, { sort: { score: -1 }, limit: 10 });
    },
    children: [
        {
            find(post) {
                // Find post author. Even though we only want to return
                // one record here, we use "find" instead of "findOne"
                // since this function should return a cursor.
                return Meteor.users.find(
                    { _id: post.authorId },
                    { fields: { profile: 1 } });
            }
        },
        {
            find(post) {
                // Find top two comments on post
                return Comments.find(
                    { postId: post._id },
                    { sort: { score: -1 }, limit: 2 });
            },
            children: [
                {
                    find(comment, post) {
                        // Find user that authored comment.
                        return Meteor.users.find(
                            { _id: comment.authorId },
                            { fields: { profile: 1 } });
                    }
                }
            ]
        }
    ]
});
```

Next, we subscribe to our publication on the client.

```javascript
// Client
Meteor.subscribe('topTenPosts');
```

Now we can use the published data in one of our templates.

```handlebars
<template name="topTenPosts">
    <h1>Top Ten Posts</h1>
    <ul>
        {{#each posts}}
            <li>{{title}} -- {{postAuthor.profile.name}}</li>
        {{/each}}
    </ul>
</template>
```

```javascript
Template.topTenPosts.helpers({
    posts() {
        return Posts.find({}, { sort: { score: -1 }, limit: 10 });
    },

    postAuthor() {
        // We use this helper inside the {{#each posts}} loop, so the context
        // will be a post object. Thus, we can use this.authorId.
        return Meteor.users.findOne(this.authorId);
    }
})
```

### Example 2: A publication that **does** take arguments

Note a function is passed for the `options` argument to `publishComposite`.

```javascript
// Server
import { publishComposite } from 'meteor/reywood:publish-composite';

publishComposite('postsByUser', function(userId, limit) {
    return {
        find() {
            // Find posts made by user. Note arguments for callback function
            // being used in query.
            return Posts.find({ authorId: userId }, { limit: limit });
        },
        children: [
            // This section will be similar to that of the previous example.
        ]
    }
});
```

```javascript
// Client
var userId = 1, limit = 10;
Meteor.subscribe('postsByUser', userId, limit);
```

## Known issues

**Avoid publishing very large sets of documents**

This package is great for publishing small sets of related documents. If you use it for large sets of documents with many child publications, you'll probably experience performance problems. Using this package to publish documents for a page with infinite scrolling is probably a bad idea. It's hard to offer exact numbers (i.e. don't publish more than X parent documents with Y child publications) so some experimentation may be necessary on your part to see what works for your application.

**Arrow functions**

You will not be able to access `this.userId` inside your `find` functions if you use [arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions).


## Reporting issues/bugs

If you are experiencing an issue with this package, please create a GitHub repo with the simplest possible Meteor app that demonstrates the problem. This will go a long way toward helping me to diagnose the problem.

## More info

For more info on how to use `publishComposite`, check out these blog posts:

* [Publishing Reactive Joins in Meteor][blog-reactive-joins]
* [Publishing to an Alternative Client-side Collection in Meteor][blog-collection-name]

Note that these articles use the old pre-import notation, `Meteor.publishComposite`, which is still available for backward compatibility.


[blog-reactive-joins]: http://braindump.io/meteor/2014/09/12/publishing-reactive-joins-in-meteor.html
[blog-collection-name]: http://braindump.io/meteor/2014/09/20/publishing-to-an-alternative-clientside-collection-in-meteor.html
