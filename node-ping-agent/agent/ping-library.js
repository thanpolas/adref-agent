/**
 * @fileOverview Ping library.
 */
const spawn = require('child_process').spawn;

const Promise = require('bluebird');


const log = require('./logger');
const globals = require('./globals');

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
  response.pingParams.wait = data.wait || 1;
  response.pingParams.waitTime = data.waitTime || 2500;
  response.pingParams.packets = data.packets || 4;
  response.pingParams.timeout = data.timeout || 5;


  const pingArgs = pingLib._preparePingArguments(response);

  const pingResult = await pingLib._invokePing(pingArgs);

  await pingLib._processPingResults(pingResult, response);

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
    pingItems: [],
  };
};

/**
 * Prepare the ping arguments.
 *
 * @param {Object} response the Response object.
 * @return {string} The ping's parameters.
 * @private
 */
pingLib._preparePingArguments = function(response) {
  const pingArgs = [
    '-c ' + response.pingParams.packets, // number of pings
    '-i ' + response.pingParams.wait, // time to wait between pings in seconds
  ];

  // in OSX there's a slight difference in the ping options
  if (globals.isOsx) {
    // ultimate timeout
    pingArgs.push('-t ' + response.pingParams.timeout);
    // Per packet timeout
    pingArgs.push('-W ' + response.pingParams.waitTime);
  } else {
    // ultimate timeout
    pingArgs.push('-w ' + response.pingParams.timeout);
    // Per packet timeout
    pingArgs.push('-W ' + response.pingParams.waitTime / 1000);
  }

  const finalPingArgs = pingArgs.concat([
    // Numeric output only.
    // No attempt will be made to lookup symbolic names for host addresses.
    '-n',
    response.ping_ip,
  ]);

  return finalPingArgs;
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

    log.fine('invokePing() :: Invoking ping with args:', pingArgs);

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
  const lines = results_raw.split('\n');

  // The last lines are statistics we don't care about.
  lines.splice(-5, 5);

  // The first line we also don't care about.
  lines.splice(0, 1);

  lines.map((line) => {
    if (!line) {
      return;
    }

    const parts = line.split(' ');

    const pingObj = pingLib._getPingObject();
    pingObj.bytes = parts[0];

    // IP has a colon at the end so remove last char.
    pingObj.target_ip = parts[3].slice(0, -1);

    // ICMP Sequence starts with "icmp_seq=3" so remove first chars
    pingObj.icmp_seq = parseInt(parts[4].substring(9), 10);

    // pingtime is "time=3.430" so remove first chars.
    pingObj.time = parseFloat(parts[6].substring(5));

    response.pingItems.push(pingObj);
  });
};

pingLib._getPingObject = () => {
  return {
    bytes: NaN,
    target_ip: '',
    icmp_seq: NaN,
    time: 0.0,
  };
};
