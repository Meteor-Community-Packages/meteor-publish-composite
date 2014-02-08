var _ = require('underscore');

FakeSubscription = function() {
    this.addedDocs = [];
};

_.extend(FakeSubscription.prototype, {
    added: function(collectionName, id, doc) {
        this.addedDocs.push({
            collectionName: collectionName,
            id: id,
            doc: doc
        });
    },
    changed: function() {},
    removed: function() {},

    onStop: function() {},
    ready: function() {}
});
