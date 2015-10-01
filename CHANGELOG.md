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
