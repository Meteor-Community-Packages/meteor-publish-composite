// Definitions by: Robbie Van Gorkom <https://github.com/vangorra>
//                 Matthew Zartman <https://github.com/mattmm3d>
//                 Jan Dvorak <https://github.com/storytellercz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 4.1

import { Mongo } from 'meteor/mongo'

type RepeatingOptions = {
  find: (topLevelDocument: object) => Mongo.Cursor
  children?: RepeatingOptions[] | ((topLevelDocument: object) => RepeatingOptions[])
  collectionName?: string
}

/**
 * `publishComposite(...)` provides a flexible way to publish a set of related documents from various collections using a reactive join. This makes it easy to publish a whole tree of documents at once. The published collections are reactive and will update when additions/changes/deletions are made.
 *
 * @module PublishComposite
 */
declare namespace PublishComposite {
  function publishComposite(name: string, options: RepeatingOptions);
} // module
