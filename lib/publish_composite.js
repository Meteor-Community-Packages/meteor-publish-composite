/* eslint-disable no-console */

import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import Publication from './publication';
import Subscription from './subscription';


const prepareOptions = function prepareOptions(options, args) {
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
};

Meteor.publishComposite = function publishComposite(name, options) {
    return Meteor.publish(name, function publish(...args) {
        const subscription = new Subscription(this);
        const instanceOptions = prepareOptions.call(this, options, args);
        const pubs = [];

        _.each(instanceOptions, (opt) => {
            const pub = new Publication(subscription, opt);
            pub.publish();
            pubs.push(pub);
        });

        this.onStop(() => {
            _.each(pubs, (pub) => {
                pub.unpublish();
            });
        });

        this.ready();
    });
};

let debugLoggingEnabled = false;

const debugLog = (source, message) => {
    if (!debugLoggingEnabled) { return; }
    let paddedSource = source;
    while (paddedSource.length < 35) { paddedSource += ' '; }
    console.log(`[${paddedSource}] ${message}`);
};

const enableDebugLogging = function enableDebugLogging() {
    debugLoggingEnabled = true;
};

export {
    debugLog,
    enableDebugLogging,
};
