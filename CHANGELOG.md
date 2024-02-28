## v1.8.7
* `valueOfId` moved to `utils.js`
* Fixed race condition waiting for documents to be added [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/179) [@redabourial](https://github.com/redabourial)
* Fix conflicting cursor events [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/177) [@gabrielcazacu96](https://github.com/gabrielcazacu96)
* Fixed test dependencies [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/178) [@manueltimita](https://github.com/manueltimita)

## v1.8.6
* Fixed `this.ready()` being fired too early [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/174) [manueltimita](https://github.com/manueltimita)
* Added `ddp` dependency that is needed for Meteor 3.0 and version support for Meteor `3.0-beta.0` [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Updated `zodern:types` to v1.0.11 [@storytellercz](https://github.com/sponsors/StorytellerCZ)

## v1.8.4

* Added basic TypeScript types [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/166) [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Update `zodern:types` to v1.0.10 [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Replace "for of" with "Promise.all" to keep the parallelism in _publishChildrenOf [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/172) [aboire](https://github.com/aboire)

## v1.8.3

* Fix an issue with improper use of `Object.entries` instead of `Object.values` [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Replace underscore/lodash references in _.any() and _.isequal() with natives [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/162) [@Nandika-A](https://github.com/Nandika-A)

## v1.8.2

* Find and children async [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/160) [@aboire](https://github.com/aboire)

## v1.8.1

* Update dev dependencies [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Add installation compatibility with Meteor `3.0-alpha.15` [@storytellercz](https://github.com/sponsors/StorytellerCZ)

## v1.8.0

* Allow to pass async function to publishComposite [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/156) [@alisnic](https://github.com/alisnic)
* Added Meteor v2.8.1 as an additional minimum build target [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Remove observeChanges subscription [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/133) [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* Fix wrong topLevelDocument in third Level find & remove underscore in `publication.js` [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/132) [@storytellercz](https://github.com/sponsors/StorytellerCZ)
* feature(ci): add comment issue workflow [PR](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/148) [@jankapunkt](https://github.com/sponsors/jankapunkt)

## v1.7.4

* Reformat code to StandardJS & add other community standards

## v1.7.3

* Update dependencies
* Do not publish to client

## v1.7.2

* Add test target to makefile
* Revert the changes from "Handle stopping a publication early [#121](https://github.com/Meteor-Community-Packages/meteor-publish-composite/pull/121)

## v1.7.1

* Handle stopping a publication early

## v1.7.0

* Allow `children` to be declared as a function

## v1.5.2

* Fix issue #102: userId is undefined in child publications, wrap `cursor.observe` callbacks with `Meteor.bindEnvironment`
* Publish children before publishing parents to mitigate rendering incomplete data
* Run `check` on `options` to make it easier to troubleshoot/identify incorrect values


## v1.5.1

* Support for new ES6/ES2015 style imports


## v1.5.0

* Update for meteor 1.4
* Change from LGPL to MIT license


## v1.4.2

* Merge branch 'patrickml-issue/#46'
* Merge branch 'issue/#46' of https://github.com/patrickml/meteor-publish-composite into patrickml-issue/#46


## v1.4.1

* Merge branch 'Profab-user-logout-fix'
* Merge branch 'user-logout-fix' of https://github.com/Profab/meteor-publish-composite into Profab-user-logout-fix


## v1.4.0

* Support multiple top level publications
* Make sure instance options is not empty
* Completed issue #46 (Error when logging out)


## v1.3.6

* Improve logic for removing unneeded docs on republish


## v1.3.5

* Fix bug: odd behavior when documents have ObjectIDs as IDs instead of strings


## v1.3.4

* Check to see if doc is published before sending changes
* Make sure the correct key value is used when accessing childPublications


## v1.3.3

* Fix issue #17, docs are not published to both primary collection and alternate collection when they overlap


## v1.3.2

* Update package description
* Update versions.json


## v1.3.1

* Use cursor.observeChanges so only actual changes are sent to client
* Merge pull request #15 from czeslaaw/master
* problem with unset fix
* Update package summary
* Fix links in README
* Add info about collectionName property to README
* Add "More Info" section to README
* Update version of meteor in  versions.json to 1.1.0
* Rename package to reywood:publish-composite
* Merge branch 'develop'
* Update installation instructions in README
* Specify package name and shorten description so "meteor publish" succeeds


## v1.3.0

* Upgrade to Meteor 0.9


## v1.2.2

* Fix bug #10: Exception when republishing null cursor


## v1.2.1

* Disable debug logging


## v1.2.0

* Allow records to be published to an alternate client side collection


## v1.1.2

* Fix bug when sub.removed is called with a string ID instead of an ObjectID


## v1.1.0

* Do not send duplicate documents across the wire unless they have changed
* Turn off debug logging
* Improve logic for republishing a changed document
* Update README
* Minor formatting update to README


## v1.0.6

* Set correct context for find function


## v1.0.5

* Fix null reference bug when unpublishing
* Add license


## v1.0.4

* Update description
* Update README


## v1.0.3

* Update subscription docs when "foreign keys" change, resolves #2


## v1.0.2

* Remove old tests
* Remove child documents when parent is removed
* Add tinytests
* Update README


## v1.0.1

* Fix homepage in smart.json


## v1.0.0

* Initial commit
