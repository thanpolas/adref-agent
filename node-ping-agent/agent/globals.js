/**
 * @fileoverview Global constants.
 */

const globals = module.exports = {};

globals.isOsx = true;


globals.token = 'osx_polas_dev';

// The API endpoint to submit to.
globals.apiEndpoint = '';

// How many pings to sample for determining spike severity
globals.spikePingSample = 5;

// Every how many pings to submit to the API
globals.apiSubmitPingsInterval = 10;

// Local watcher that controls the LEDs calculation interval in milliseconds.
globals.localWatcherInterval = 2000;
