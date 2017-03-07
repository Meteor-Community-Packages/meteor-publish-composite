/* eslint-disable no-console */

let debugLoggingEnabled = false;

function debugLog(source, message) {
    if (!debugLoggingEnabled) { return; }
    let paddedSource = source;
    while (paddedSource.length < 35) { paddedSource += ' '; }
    console.log(`[${paddedSource}] ${message}`);
}

function enableDebugLogging() {
    debugLoggingEnabled = true;
}

export {
    debugLog,
    enableDebugLogging,
};
