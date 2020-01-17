/**
 * @fileoverview Global constants.
 */
const fs = require('fs');
const path = require('path');

const yaml = require('yaml');

const globals = module.exports = {};


const userConfigFile = path.resolve(__dirname, '../../adref-config.yml');

let userConfig = {};

if (fs.existsSync(userConfigFile)) {
  const file = fs.readFileSync(userConfigFile, 'utf8');
  userConfig = yaml.parse(file);
}

//
//
// Global Settings Start
//

globals.token = userConfig.token || 'osx_polas_dev';

// The API endpoint to submit to.
globals.apiEndpoint = userConfig.apiEndpoint ||
  'https://adref.projects.sirodoht.com/pings_two/';

// How many pings to sample for determining spike severity
globals.spikePingSample = 5;

// Every how many pings to submit to the API
globals.apiSubmitPingsInterval = userConfig.apiSubmitPingsInterval || 300;

// Local watcher that controls the LEDs calculation interval in milliseconds.
globals.localWatcherInterval = userConfig.localWatcherInterval || 5000;

globals.isOsx = true;
