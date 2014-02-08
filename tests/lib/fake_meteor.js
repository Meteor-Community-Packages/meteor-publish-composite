require('./fake_subscription');

var publications = {};

Meteor = {
    user: function() {
        return this._user;
    },

    login: function(user) {
        this._user = user;
    },

    reset: function() {
        this._user = undefined;
        publications = {};
    },

    publish: function(name, handler) {
        publications[name] = handler;
    },

    subscribe: function(name) {
        var subscription = new FakeSubscription();
        var args = Array.prototype.slice.apply(arguments);
        args.shift();

        publications[name].apply(subscription, args);

        return subscription;
    }
};

Meteor.Error = function(code, reason) {
    this.code = code;
    this.reason = reason;
    this.message = code + ": " + reason;
};
