/**
 * @fileOverview Ping library.
 */
const spawn = require('child_process').spawn;

const Promise = require('bluebird');
const log = require('./logger');

const pingLib = module.exports = {};

/**
 * The worker process.
 *
 * @param {Object} data Data specific for this job.
 *   @param {string} ping_ip The IP to ping.
 *   @param {number=} wait How long to wait between pings in secongs, default 0.5.
 *   @param {number=} waitTime How long to wait in milliseconds for each packet until it times out, default 0.5.
 *   @param {number=} packets How many packets to send, default 5.
 *   @param {number=} timeout Ultimate timeout in seconds, default 8.
 * @return {Promise} A Promise.
 */
pingLib.run = async (data) => {
  response = pingLib._getResponse();
  response.ping_ip = data.ping_ip;
  response.pingParams.wait = data.wait || 0.5;
  response.pingParams.waitTime = data.waitTime || 2500;
  response.pingParams.packets = data.packets || 300;
  response.pingParams.timeout = data.timeout || 4;


  const pingArgs = pingLib._preparePingArguments(data.ip);

  const pingResult = await pingLib._invokePing(pingArgs);

  await pingLib_processPingResults(pingResult, response);

  return response;
};

/**
 * Constructs the response object.
 *
 * @return {Object}
 * @private
 */
pingLib._getResponse = () => {
  return {
    pingParams: {
      wait: NaN,
      waitTime: NaN,
      timeout: NaN,
      packets: NaN,
    },
    ping_ip: '',
    scanRealId: '',
    latencyResults: {
      rawOutput: '',
      packetsSent: 0,
      packetsReceived: 0,
      min: 0,
      avg: 0,
      max: 0,
      stddev: 0,
      mdev: 0,
      time: 0,
      // Packet Loss in a string 0%
      packetLoss: '',
      // Packet Loss in Float
      packetLossFlt: 0,
    },
  };
};

/**
 * Prepare the ping arguments.
 *
 * @param {string} ping_ip The IP to ping.
 * @return {string} The ping's parameters.
 * @private
 */
pingLib._preparePingArguments = function(ping_ip) {
  const pingArgs = [
    '-c ' + this.response.pingParams.packets, // number of pings
    '-i ' + this.response.pingParams.wait, // time to wait between pings in seconds
  ];

  // in OSX there's a slight difference in the ping options
  if (globals.isOsx) {
    // ultimate timeout
    pingArgs.push('-t ' + this.response.pingParams.timeout);
    // Per packet timeout
    pingArgs.push('-W ' + this.response.pingParams.waitTime);
  } else {
    // ultimate timeout
    pingArgs.push('-w ' + this.response.pingParams.timeout);
    // Per packet timeout
    pingArgs.push('-W ' + this.response.pingParams.waitTime / 1000);
  }

  pingArgs = pingArgs.concat([
    // Numeric output only.
    // No attempt will be made to lookup symbolic names for host addresses.
    '-n',
    ip,
  ]);

  return pingArgs;
};

/**
 * Invoke the Ping command.
 *
 * @param {Array} pingArgs Arguments for ping command.
 * @return {Promise(string)} A promise with the ping's output.
 * @private
 */
pingLib._invokePing = async function(pingArgs) {
  return new Promise(function(resolve, reject) {
    const rawOutput = [];

    log.finer('invokePing() :: Invoking ping with args:', pingArgs);

    const child = spawn('ping', pingArgs);

    child.stdout.on('data', function(buffer) {
      rawOutput.push(buffer.toString());
    });

    child.stderr.on('data', function(buffer) {
      log.finer('invokePing() :: stderr data:', buffer.toString());
    });
    child.on('error', function(err) {
      log.warn('invokePing() Error:', err);
      reject(err);
    });
    child.on('close', function(code, signal) {
      if (code) {
        if (code === 1) {
          log.fine('invokePing() :: exited with code 1, will process. Raw Output:',
            rawOutput);
          resolve(rawOutput.join(''));
          return;
        }
        log.warn('invokePing() :: ping exited with code ', code);
        log.fine('rawOutput:', rawOutput);
        log.fine('signal:', signal);
        reject(new Error('ping exited with code ' + code));
      } else if (signal) {
        log.warn('invokePing() :: ping exited with signal ', signal);
        log.fine('rawOutput:', rawOutput);
        reject(new Error('ping exited with signal ' + signal));
      } else {
        resolve(rawOutput.join(''));
      }
    });
  });
};

/**
 * Process the ping results.
 *
 * @param {string} results Raw Ping Results.
 */
pingLib._processPingResults = function (results_raw, response) {
  log.info('RESULTS:', results_raw)
  response.latencyResults.rawOutput = results;

};
