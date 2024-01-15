import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { enableDebugLogging, publishComposite } from 'meteor/reywood:publish-composite'

import { Authors, Comments, Posts } from './common'
import { debugLog } from '../lib/logging'

enableDebugLogging()

/**
 * Set up publications for testing
 */
const postPublicationChildren = [
  {
    find (post) {
      return Authors.find({ username: post.author })
    }
  },
  {
    find (post) {
      return Comments.find({ postId: post._id })
    },
    children: [
      {
        find (comment) {
          return Authors.find({ username: comment.author })
        }
      }
    ]
  }
]

publishComposite('allPosts', {
  find () {
    return Posts.find()
  },
  children: postPublicationChildren
})

publishComposite('allPostsAsync', async () => {
  return {
    find () {
      return Posts.find()
    },
    children: postPublicationChildren
  }
})

publishComposite('allPostsWithChildrenAsFunction', {
  find () {
    return Posts.find()
  },
  children: parentPost => (parentPost.author === 'albert'
    ? [{
      find (post) {
        return Authors.find({ username: post.author })
      }
    }]
    : postPublicationChildren)
})

publishComposite('userPosts', username => ({
  find () {
    debugLog('userPosts', 'userPosts.find() called')
    return Posts.find({ author: username })
  },
  children: postPublicationChildren
}))

publishComposite('postsAsArticles', {
  collectionName: 'articles',
  find () {
    return Posts.find()
  }
})

publishComposite('pubWithChildThatReturnsNullIfAuthorIsMarie', {
  find () {
    return Posts.find()
  },
  children: [
    {
      find (post) {
        if (post.author === 'marie') {
          return null
        }

        return Comments.find({ postId: post._id })
      }
    }
  ]
})

publishComposite('publishCommentAuthorsInAltClientCollection', {
  find () {
    return Posts.find()
  },
  children: [
    {
      find (post) {
        return Authors.find({ username: post.author })
      }
    },
    {
      find (post) {
        return Comments.find({ postId: post._id })
      },
      children: [
        {
          collectionName: 'commentAuthors',
          find (comment) {
            return Authors.find({ username: comment.author })
          }
        }
      ]
    }
  ]
})

publishComposite('publishCommentAuthorsWithChildrenAsFunctionMultipleLevel', {
  find () {
    return Posts.find()
  },
  children: [
    {
      find (post) {
        return Authors.find({ username: post.author })
      }
    },
    {
      find (post) {
        return Comments.find({ postId: post._id })
      },
      children: (parentComment, parentPost) => (parentComment.author === 'richard'
        ? [{
          collectionName: 'commentAuthors',
          find (comment) {
            return Authors.find({ username: comment.author })
          }
        }]
        : [])
    }
  ]
})

publishComposite('twoUsersPosts', (username1, username2) => [
  {
    find () {
      return Posts.find({ author: username1 })
    },
    children: postPublicationChildren
  },
  {
    find () {
      return Posts.find({ author: username2 })
    },
    children: postPublicationChildren
  }
])

publishComposite('twoFixedAuthors', [
  {
    find () {
      return Authors.find({ username: 'marie' })
    }
  },
  {
    find () {
      return Authors.find({ username: 'albert' })
    }
  }
])

publishComposite('returnNothing', () => undefined)


// TODO: when the method returns on the client, in some cases
//  the subscription still has old data in it, which makes some
//  tests fail. The problem is that they are nonetheless still
//  flaky. We must replace sleep with something more reliable and
//  predictable in the frontend, using Tracker or observeChanges
const sleep = async function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
};



/**
 * Utility methods
 */
Meteor.methods({
  async initTestData () {
    await removeAllData()
    await sleep(100)
    await initUsers()
    await initPosts()
  },

  log (message) {
    debugLog('client', message)
  }
})

async function removeAllData () {
  await Comments.removeAsync({})
  await Posts.removeAsync({})
  await Authors.removeAsync({})
}

async function initUsers () {
  await Authors.insertAsync({ _id: new Mongo.ObjectID(), username: 'marie' })
  await Authors.insertAsync({ _id: new Mongo.ObjectID(), username: 'albert' })
  await Authors.insertAsync({ _id: new Mongo.ObjectID(), username: 'richard' })
  await Authors.insertAsync({ _id: new Mongo.ObjectID(), username: 'stephen' })
  await Authors.insertAsync({ _id: new Mongo.ObjectID(), username: 'john' })
}

async function initPosts () {
  await insertPost('Marie\'s first post', 'marie', [{
    text: 'Comment text',
    author: 'albert'
  }])

  await insertPost('Marie\'s second post', 'marie', [
    {
      text: 'Richard\'s comment',
      author: 'richard'
    },
    {
      text: 'Stephen\'s comment',
      author: 'stephen'
    },
    {
      text: 'Marie\'s comment',
      author: 'marie'
    }
  ])

  await insertPost('Post with one comment', 'albert', [{
    text: 'Comment text',
    author: 'richard'
  }])

  await insertPost('Post with no comments', 'stephen')
}

async function insertPost (title, author, comments) {
  const postId = new Mongo.ObjectID()
  let commentId
  let commentData

  await Posts.insertAsync({
    _id: postId,
    title,
    author
  })

  if (comments) {
    for (let i = 0; i < comments.length; i++) {
      commentId = new Mongo.ObjectID()
      commentData = Object.assign({ _id: commentId, postId }, comments[i])
      await Comments.insertAsync(commentData)
    }
  }
}


/**
 * Utility methods
 */
Meteor.methods({
  async removePost (postId) {
    console.log('calling removePost')
    await Posts.removeAsync(postId)
    await sleep(100)
  },

  async removeComment (commentId) {
    console.log('calling removeComment')
    await Comments.removeAsync(commentId)
    await sleep(100)
  },

  async updatePostAuthor (postId, newAuthor) {
    console.log(`calling updatePostAuthor, postId: ${postId}, newAuthor: ${newAuthor}`)
    await Posts.updateAsync({ _id: postId }, { $set: { author: newAuthor } })
    await sleep(100)
  },

  async updateCommentAuthor (commentId, newAuthor) {
    console.log(`calling updateCommentAuthor, commentId: ${commentId}, newAuthor: ${newAuthor}`)
    await Comments.updateAsync({ _id: commentId }, { $set: { author: newAuthor } })
    await sleep(100)
  },

  async unsetCommentText (commentId) {
    console.log(`calling unsetCommentText, commentId: ${commentId}`)
    await Comments.updateAsync({ _id: commentId }, { $unset: { text: '' } })
    await sleep(100)
  }
})
