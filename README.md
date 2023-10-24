# meteor-publish-composite

`publishComposite(...)` provides a flexible way to publish a set of related documents from various collections using a reactive join. This makes it easy to publish a whole tree of documents at once. The published collections are reactive and will update when additions/changes/deletions are made.

## Project

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
![GitHub](https://img.shields.io/github/license/Meteor-Community-Packages/meteor-publish-composite)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/Meteor-Community-Packages/meteor-publish-composite.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/Meteor-Community-Packages/meteor-publish-composite/context:javascript)
![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/Meteor-Community-Packages/meteor-publish-composite?label=latest&sort=semver)
[![](https://img.shields.io/badge/semver-2.0.0-success)](http://semver.org/spec/v2.0.0.html) <!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

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

    * **`children`** -- *array (optional)* or *function*

        - An array containing any number of object literals with this same structure
        - A function with top level documents as arguments. It helps dynamically build
        the array based on conditions ( like documents fields values)

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

    Example with children as function:

    ```javascript
    {
      find() {
          return Notifications.find();
      },
      children(parentNotification) {
        // children is a function that returns an array of objects.
        // It takes parent documents as arguments and dynamically builds children array.
        if (parentNotification.type === 'about_post') {
          return [{
            find(notification) {
              return Posts.find(parentNotification.objectId);
            }
          }];
        }
        return [
          {
            find(notification) {
              return Comments.find(parentNotification.objectId);
            }
          }
        ]
      }
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

### Example 3: A publication from async function

Note a function is passed for the `options` argument to `publishComposite`.

```javascript
// Server
import { publishComposite } from 'meteor/reywood:publish-composite';

publishComposite('postsByUser', async function(userId) {
    const user = await Users.findOneAsync(userId)
    const limit = user.limit

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

## Alternatives

While we are happy that you find this package of value, there are limitations, especially on high traffic applications.
There are also other solutions that can solve the problems that publish-composite solves, so here is a list of possible alternatives:

### MongoDB Aggregations

MongoDB itself has a functionality called Aggregations which allows you to combine data from multiple collections into
one document. It also has other useful features that you can utilize. The downside is that unless you use [reactive-aggregate](https://atmospherejs.com/tunguska/reactive-aggregate)
package the aggregations are not reactive and things it is not the easiest to learn or master.

* [Learn more](https://www.mongodb.com/docs/manual/meta/aggregation-quick-reference/)

### GraphQL

GraphQL allows you to specify exactly which data you need and even embed child documents. Apollo GraphQL also has an [official package]((https://atmospherejs.com/meteor/apollo))
and there is the `apollo` starter skeleton in Meteor itself to get you started quickly.

* [Official Meteor Apollo package](https://atmospherejs.com/meteor/apollo)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://braindump.io"><img src="https://avatars3.githubusercontent.com/u/1796302?v=4?s=100" width="100px;" alt="Sean Dwyer"/><br /><sub><b>Sean Dwyer</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=reywood" title="Code">💻</a> <a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=reywood" title="Documentation">📖</a> <a href="#ideas-reywood" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sebakerckhof"><img src="https://avatars0.githubusercontent.com/u/88471?v=4?s=100" width="100px;" alt="Seba Kerckhof"/><br /><sub><b>Seba Kerckhof</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=sebakerckhof" title="Code">💻</a> <a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/pulls?q=is%3Apr+reviewed-by%3Asebakerckhof" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=sebakerckhof" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rclai"><img src="https://avatars0.githubusercontent.com/u/1316261?v=4?s=100" width="100px;" alt="Richard Lai"/><br /><sub><b>Richard Lai</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/issues?q=author%3Arclai" title="Bug reports">🐛</a> <a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=rclai" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zimme"><img src="https://avatars3.githubusercontent.com/u/1215414?v=4?s=100" width="100px;" alt="Simon Fridlund"/><br /><sub><b>Simon Fridlund</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=zimme" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/patrickml"><img src="https://avatars3.githubusercontent.com/u/7581369?v=4?s=100" width="100px;" alt="Patrick Lewis"/><br /><sub><b>Patrick Lewis</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=patrickml" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nabiltntn"><img src="https://avatars1.githubusercontent.com/u/223719?v=4?s=100" width="100px;" alt="nabiltntn"/><br /><sub><b>nabiltntn</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=nabiltntn" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/czeslaaw"><img src="https://avatars2.githubusercontent.com/u/1939060?v=4?s=100" width="100px;" alt="Krzysztof Czech"/><br /><sub><b>Krzysztof Czech</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=czeslaaw" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/StorytellerCZ"><img src="https://avatars2.githubusercontent.com/u/1715235?v=4?s=100" width="100px;" alt="Jan Dvorak"/><br /><sub><b>Jan Dvorak</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=StorytellerCZ" title="Code">💻</a> <a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=StorytellerCZ" title="Documentation">📖</a> <a href="#infra-StorytellerCZ" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-StorytellerCZ" title="Maintenance">🚧</a> <a href="#tool-StorytellerCZ" title="Tools">🔧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://duodeka.nl/"><img src="https://avatars2.githubusercontent.com/u/12446296?v=4?s=100" width="100px;" alt="Koen [XII]"/><br /><sub><b>Koen [XII]</b></sub></a><br /><a href="https://github.com/Meteor-Community-Packages/meteor-publish-composite/commits?author=KoenLav" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
