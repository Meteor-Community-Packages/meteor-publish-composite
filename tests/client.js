/* global describe, it */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { expect } from 'chai'
import { Authors, Comments, Groups, Posts } from './common'

const Articles = new Mongo.Collection('articles')
const CommentAuthors = new Mongo.Collection('commentAuthors')

describe('publishComposite', () => {
  /**
   * Define test helper
   */
  const testPublication = (testName, options) => {
    it(testName, (onComplete) => {
      let subscription
      const onSubscriptionReady = function onSubscriptionReady () {
        Meteor.call('log', 'Sub ready, starting test', () => {
          options.testHandler((error) => {
            Meteor.call('log', 'Test finished, stopping sub', () => {
              subscription.stop()
              Meteor.call('log', 'TEST COMPLETE', () => {
                onComplete(error)
              })
            })
          }, subscription)
        })
      }
      const args = [options.publication].concat(options.args || [])
      args.push(onSubscriptionReady)

      Meteor.call('initTestData', () => {
        Meteor.call('log', `** ${testName}: Subscribing`, () => {
          subscription = Meteor.subscribe(...args)
        })
      })
    })
  }

  const tryExpect = (expectAction, onComplete) => {
    try {
      expectAction()
    } catch (error) {
      onComplete(error)
      throw error
    }
  }

  const expectCursorCountToEqual = (cursor, value, onComplete) => {
    return tryExpect(() => expect(cursor.fetch().length).to.equal(value), onComplete)
  }

  const expectValueToBeUndefined = (value, onComplete) => {
    return tryExpect(() => expect(value).to.be.undefined, onComplete)
  }

  const expectValueToBeDefined = (value, onComplete) => {
    return tryExpect(() => expect(value).to.not.be.undefined, onComplete)
  }

  const validateAuthorsGroups = (groupId, count, onComplete) => {
    const group = Groups.findOne({ _id: groupId })
    expectValueToBeDefined(group, onComplete)
    tryExpect(() => expect(group.authors.length).to.equal(count), onComplete)
    expectCursorCountToEqual(Authors.find({ groupIds: groupId }), count, onComplete)
  }

  /**
   * Define tests
   */
  testPublication('Should publish all groups', {
    publication: 'allGroups',

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Groups.find(), 2, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish group authors', {
    publication: 'allGroups',

    testHandler: (onComplete) => {
      validateAuthorsGroups('Writers', 4, onComplete)
      validateAuthorsGroups('Editors', 1, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish author added to new group', {
    publication: 'allGroups',

    testHandler: (onComplete) => {
      validateAuthorsGroups('Editors', 1, onComplete)

      Meteor.call('addAuthorToGroup', 'stephen', 'Editors', (error) => {
        expectValueToBeUndefined(error, onComplete)
        validateAuthorsGroups('Writers', 4, onComplete)
        validateAuthorsGroups('Editors', 2, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should unpublish author removed from group', {
    publication: 'allGroups',

    testHandler: (onComplete) => {
      validateAuthorsGroups('Writers', 4, onComplete)

      Meteor.call('removeAuthorFromGroup', 'richard', 'Writers', (error) => {
        expectValueToBeUndefined(error, onComplete)
        validateAuthorsGroups('Writers', 3, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should publish/unpublish author added to/removed from group', {
    publication: 'allGroups',

    testHandler: (onComplete) => {
      validateAuthorsGroups('Editors', 1, onComplete)

      Meteor.call('addAuthorToGroup', 'stephen', 'Editors', (error) => {
        expectValueToBeUndefined(error, onComplete)
        validateAuthorsGroups('Editors', 2, onComplete)

        Meteor.call('removeAuthorFromGroup', 'stephen', 'Editors', (error) => {
          expectValueToBeUndefined(error, onComplete)
          validateAuthorsGroups('Editors', 1, onComplete)

          Meteor.call('removeAuthorFromGroup', 'john', 'Editors', (error) => {
            expectValueToBeUndefined(error, onComplete)
            validateAuthorsGroups('Editors', 0, onComplete)

            onComplete()
          })
        })
      })
    }
  })

  testPublication('Should publish all posts', {
    publication: 'allPosts',

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Posts.find(), 4, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish all posts via async callback', {
    publication: 'allPostsAsync',

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Posts.find(), 4, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish all post authors', {
    publication: 'allPosts',

    testHandler: (onComplete) => {
      const posts = Posts.find().fetch()

      tryExpect(() => expect(posts.length).to.be.greaterThan(0), onComplete)
      posts.forEach((post) => {
        const postAuthor = Authors.findOne({ username: post.author })
        expectValueToBeDefined(postAuthor, onComplete)
      })

      onComplete()
    }
  })

  testPublication('Should publish all post comments', {
    publication: 'allPosts',

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Comments.find(), 5, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish all post comment authors', {
    publication: 'allPosts',

    testHandler: (onComplete) => {
      const comments = Comments.find().fetch()

      tryExpect(() => expect(comments.length).to.be.greaterThan(0), onComplete)
      comments.forEach((comment) => {
        const commentAuthor = Authors.findOne({ username: comment.author })
        expectValueToBeDefined(commentAuthor, onComplete)
      })

      onComplete()
    }
  })

  testPublication('Should publish all post comment authors with children as Function', {
    publication: 'allPostsWithChildrenAsFunction',

    testHandler: (onComplete) => {
      const comments = Comments.find().fetch()

      tryExpect(() => expect(comments.length).to.be.greaterThan(0), onComplete)
      comments.forEach((comment) => {
        const commentAuthor = Authors.findOne({ username: comment.author })
        expectValueToBeDefined(commentAuthor, onComplete)
      })

      onComplete()
    }
  })

  testPublication('Should publish one user\'s posts', {
    publication: 'userPosts',
    args: ['marie'],

    testHandler: (onComplete) => {
      const allSubscribedPosts = Posts.find()
      expectCursorCountToEqual(allSubscribedPosts, 2, onComplete)

      const postsByOtherAuthors = Posts.find({ author: { $ne: 'marie' } })
      expectCursorCountToEqual(postsByOtherAuthors, 0, onComplete)

      onComplete()
    }
  })

  testPublication('Should remove author when comment is deleted', {
    publication: 'userPosts',
    args: ['marie'],

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Authors.find({ username: 'richard' }), 1, onComplete)

      const mariesSecondPost = Posts.findOne({ title: 'Marie\'s second post' })
      const richardsComment = Comments.findOne({ postId: mariesSecondPost._id, author: 'richard' })

      Meteor.call('removeComment', richardsComment._id, (error) => {
        expectValueToBeUndefined(error, onComplete)
        expectCursorCountToEqual(Authors.find({ username: 'richard' }), 0, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should not remove author when comment is deleted if author record still needed', {
    publication: 'userPosts',
    args: ['marie'],

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Authors.find({ username: 'marie' }), 1, onComplete)

      const mariesSecondPost = Posts.findOne({ title: 'Marie\'s second post' })
      const mariesComment = Comments.findOne({ postId: mariesSecondPost._id, author: 'marie' })

      Meteor.call('removeComment', mariesComment._id, (error) => {
        expectValueToBeUndefined(error, onComplete)
        expectCursorCountToEqual(Authors.find({ username: 'marie' }), 1, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should remove both post and author if post author is changed', {
    publication: 'userPosts',
    args: ['stephen'],

    testHandler: (onComplete) => {
      const post = Posts.findOne({ title: 'Post with no comments' })
      expectValueToBeDefined(post, onComplete)
      expectCursorCountToEqual(Authors.find({ username: 'stephen' }), 1, onComplete)

      Meteor.call('updatePostAuthor', post._id, 'marie', (error) => {
        expectValueToBeUndefined(error, onComplete)
        expectCursorCountToEqual(Posts.find(), 0, onComplete)
        expectCursorCountToEqual(Authors.find(), 0, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should publish new author and remove old if comment author is changed', {
    publication: 'userPosts',
    args: ['albert'],

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Authors.find({ username: 'richard' }), 1, onComplete)
      expectCursorCountToEqual(Authors.find({ username: 'john' }), 0, onComplete)

      const albertsPost = Posts.findOne({ title: 'Post with one comment' })
      const comment = Comments.findOne({ postId: albertsPost._id, author: 'richard' })

      Meteor.call('updateCommentAuthor', comment._id, 'john', (error) => {
        expectValueToBeUndefined(error, onComplete)
        expectCursorCountToEqual(Authors.find({ username: 'richard' }), 0, onComplete)
        expectCursorCountToEqual(Authors.find({ username: 'john' }), 1, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should remove post, comment, and comment author if post is deleted', {
    publication: 'userPosts',
    args: ['marie'],

    testHandler: (onComplete) => {
      const mariesFirstPost = Posts.findOne({ title: 'Marie\'s first post' })

      expectValueToBeDefined(mariesFirstPost, onComplete)
      expectCursorCountToEqual(Comments.find({ postId: mariesFirstPost._id, author: 'albert' }), 1, onComplete)
      expectCursorCountToEqual(Authors.find({ username: 'albert' }), 1, onComplete)

      Meteor.call('removePost', mariesFirstPost._id, (error) => {
        expectValueToBeUndefined(error, onComplete)
        expectCursorCountToEqual(Posts.find({ title: 'Marie\'s first post' }), 0, onComplete)
        expectCursorCountToEqual(Comments.find({ postId: mariesFirstPost._id, author: 'albert' }), 0, onComplete)
        expectCursorCountToEqual(Authors.find({ username: 'albert' }), 0, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should publish posts to client side collection named "articles"', {
    publication: 'postsAsArticles',

    testHandler: (onComplete) => {
      expectCursorCountToEqual(Posts.find(), 0, onComplete)
      expectCursorCountToEqual(Articles.find(), 4, onComplete)

      onComplete()
    }
  })

  testPublication('Should handle going from null cursor to non-null cursor when republishing', {
    publication: 'pubWithChildThatReturnsNullIfAuthorIsMarie',

    testHandler: (onComplete) => {
      const mariesFirstPost = Posts.findOne({ title: 'Marie\'s first post' })
      expectValueToBeDefined(mariesFirstPost, onComplete)
      expectCursorCountToEqual(Comments.find({ postId: mariesFirstPost._id }), 0, onComplete)

      Meteor.call('updatePostAuthor', mariesFirstPost._id, 'albert', (error) => {
        expectValueToBeUndefined(error, onComplete)
        const newComments = Comments.find({ postId: mariesFirstPost._id }).fetch()
        tryExpect(() => expect(newComments.length).to.be.greaterThan(0), onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should handle going from non-null cursor to null cursor when republishing', {
    publication: 'pubWithChildThatReturnsNullIfAuthorIsMarie',

    testHandler: (onComplete) => {
      const albertsPost = Posts.findOne({ author: 'albert' })
      expectValueToBeDefined(albertsPost, onComplete)
      const oldComments = Comments.find({ postId: albertsPost._id }).fetch()
      tryExpect(() => expect(oldComments.length).to.be.greaterThan(0), onComplete)

      Meteor.call('updatePostAuthor', albertsPost._id, 'marie', (error) => {
        expectValueToBeUndefined(error, onComplete)
        expectCursorCountToEqual(Comments.find({ postId: albertsPost._id }), 0, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should remove field from document when it is unset', {
    publication: 'allPosts',

    testHandler: (onComplete) => {
      const albertsPost = Posts.findOne({ author: 'albert' })
      expectValueToBeDefined(albertsPost, onComplete)
      const oldComment = Comments.findOne({ postId: albertsPost._id })
      expectValueToBeDefined(oldComment.text, onComplete)

      Meteor.call('unsetCommentText', oldComment._id, (error) => {
        expectValueToBeUndefined(error, onComplete)

        const newComment = Comments.findOne({ postId: albertsPost._id })
        expectValueToBeUndefined(newComment.text, onComplete)

        onComplete()
      })
    }
  })

  testPublication('Should publish authors to both Authors and CommentAuthors collections', {
    publication: 'publishCommentAuthorsInAltClientCollection',

    testHandler: (onComplete) => {
      const albertAsAuthor = Authors.findOne({ username: 'albert' })
      const albertAsCommentAuthor = CommentAuthors.findOne({ username: 'albert' })

      expectValueToBeDefined(albertAsAuthor, onComplete)
      expectValueToBeDefined(albertAsCommentAuthor, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish authors to both Authors with children as Function with Multiple Level', {
    publication: 'publishCommentAuthorsWithChildrenAsFunctionMultipleLevel',

    testHandler: (onComplete) => {
      const marieAsAuthor = Authors.findOne({ username: 'marie' })
      const stephenAsCommentAuthor = CommentAuthors.findOne({ username: 'stephen' })

      expectValueToBeDefined(marieAsAuthor, onComplete)
      expectValueToBeUndefined(stephenAsCommentAuthor, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish two top level publications specified with a function', {
    publication: 'twoUsersPosts',
    args: ['marie', 'albert'],

    testHandler: (onComplete) => {
      const mariesPost = Posts.findOne({ author: 'marie' })
      const albertsPost = Posts.findOne({ author: 'albert' })

      expectValueToBeDefined(mariesPost, onComplete)
      expectValueToBeDefined(albertsPost, onComplete)

      onComplete()
    }
  })

  testPublication('Should publish two top level publications specified with an array', {
    publication: 'twoFixedAuthors',

    testHandler: (onComplete) => {
      const marie = Authors.findOne({ username: 'marie' })
      const albert = Authors.findOne({ username: 'albert' })

      expectValueToBeDefined(marie, onComplete)
      expectValueToBeDefined(albert, onComplete)

      onComplete()
    }
  })

  testPublication('Should gracefully return if publication handler returns nothing', {
    publication: 'returnNothing',

    testHandler: (onComplete, subscription) => {
      tryExpect(() => expect(subscription.ready()).to.be.true, onComplete)

      onComplete()
    }
  })
})
