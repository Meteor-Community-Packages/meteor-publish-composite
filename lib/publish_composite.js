import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import Publication from './publication';
import Subscription from './subscription';
import { debugLog, enableDebugLogging } from './logging';


function publishComposite(name, options) {
    return Meteor.publish(name, function publish(...args) {
        const subscription = new Subscription(this);
        const instanceOptions = prepareOptions.call(this, options, args);
        const publications = [];

        instanceOptions.forEach((opt) => {
            const pub = new Publication(subscription, opt);
            pub.publish();
            publications.push(pub);
        });

        this.onStop(() => {
            publications.forEach(pub => pub.unpublish());
        });

        debugLog('Meteor.publish', 'ready');
        this.ready();
    });
}

// For backwards compatibility
Meteor.publishComposite = publishComposite;

function prepareOptions(options, args) {
    let preparedOptions = options;

    if (typeof preparedOptions === 'function') {
        preparedOptions = preparedOptions.apply(this, args);
    }

    if (!preparedOptions) {
        return [];
    }

    if (!_.isArray(preparedOptions)) {
        preparedOptions = [preparedOptions];
    }

    return preparedOptions;
}


export {
    enableDebugLogging,
    publishComposite,
};
