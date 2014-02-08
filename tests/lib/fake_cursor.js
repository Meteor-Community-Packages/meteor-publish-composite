var _ = require('underscore');

FakeCursor = function(collectionName, members) {
    this.collectionName = collectionName;
    this.members = members;
    this.addObserver = null;
    this.changeObserver = null;
    this.removeObserver = null;
};

_.extend(FakeCursor.prototype, {
    observe: function(options) {
        this.addObserver = options.added;
        this.changeObserver = options.changed;
        this.removeObserver = options.removed;

        if (options.added && this.members) {
            _.each(this.members, function(member) {
                options.added(member);
            });
        }
    },

    _getCollectionName: function() {
        return this.collectionName;
    },

    simulateAdd: function(doc) {
        this.addObserver && this.addObserver(doc);
    }
});
