/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @fileoverview Global constants.
 */
const os = require('os');
const fs = require('fs');
const path = require('path');

const yaml = require('yaml');

const globals = module.exports = {};

const userConfigFile = path.resolve(__dirname, '../../../../adref-config.yml');

let userConfig = {};

if (fs.existsSync(userConfigFile)) {
  const file = fs.readFileSync(userConfigFile, 'utf8');
  userConfig = yaml.parse(file);
}

//
//
// Global Settings and configurations
//

globals.token = userConfig.token || 'osx_polas_dev';

// Puts the system in test mode, no actual pings are performed.
globals.TEST_MODE = false;

// filename of where to save the new adref folder location.
globals.NEW_AGENT_FILE = 'new-adref.txt';

// The API endpoint to submit to.
globals.apiEndpoint = userConfig.apiEndpoint
  || 'https://adref.projects.sirodoht.com/pings_two/';

// How many pings to sample for determining spike severity
globals.spikePingSample = 5;

// LED Brightness
globals.brightness = userConfig.brightness || 40;

// Every how many pings to submit to the API
globals.apiSubmitPingsInterval = userConfig.apiSubmitPingsInterval || 300;

// Local watcher that controls the LEDs calculation interval in milliseconds.
globals.localWatcherInterval = userConfig.localWatcherInterval || 5000;

globals.isOsx = os.platform() === 'darwin';

// The internet IP to ping
globals.targetInternetIp = '8.8.8.8';

// Interval time in ms to keep-alive the LEDs.
globals.keepAliveTime = 2 * 60 * 1000; // 2 mins

// Every how often to check for an update
globals.checkUpdateInterval = 60 * 60 * 1000; // 1 hour
