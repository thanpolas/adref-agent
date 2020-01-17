/**
 * @fileoverview Responsible for launching and monitoring ping commands.
 */

const { spawn } = require('child_process');

const log = require('./logger');
const eventBus = require('./event-bus');
const { isOsx } = require('./globals');
const { sleep } = require('./utils');

const ping = module.exports = {};

/**
 * Start a ping and stream the results via eventBus.
 *
 * @param {Object} pingOpts Options for the ping command.
 *    @param {string} pingOpts.id REQUIRED A unique identifier.
 *    @param {string} pingOpts.pingIp REQUIRED The IP to ping.
 * @return {void}
 */
ping.startPing = async (pingTarget) => {

  // Get arguments for ping based on OS.
  let pingArgs;
   if (isOsx) {
    pingArgs = ping.preparePingArgumentsOsx(pingTarget);
   } else {
    pingArgs = ping.preparePingArgumentsLinux(pingTarget);
   }

  eventBus.on(pingTarget.id + '-on_close', async () => {
    // ping exited, restart.
    await ping.invokePing(pingTarget.id, pingArgs)
      .catch(ping._invokePingErrorHandler);
  });

  await ping.invokePing(pingTarget.id, pingArgs)
    .catch(ping._invokePingErrorHandler);

};

/**
 * Stop a ping command.
 *
 * @param {string} id The unique id.
 */
ping.stopPing = (id) => {

};

/**
 * Prepare the ping arguments when on OSX.
 *
 * @param {Object} pingTarget Options for the ping command.
 * @return {string} The ping's parameters.
 */
ping.preparePingArgumentsOsx = (pingTarget) => {
  const pingArgs = [
    // No attempt will be made to lookup symbolic names for host addresses.
    '-n',
    pingTarget.pingIp,
  ];

  return pingArgs;
};

/**
 * Prepare the ping arguments when on Linux.
 *
 * @param {Object} pingTarget Options for the ping command.
 * @return {string} The ping's parameters.
 */
ping.preparePingArgumentsLinux = (pingTarget) => {
  const pingArgs = [
    // Numeric output only.
    // No attempt will be made to lookup symbolic names for host addresses.
    '-n',
    pingTarget.pingIp,
  ];

  return pingArgs;
};

/**
 * Invoke the Ping command.
 *
 * @param {string} id A unique identifier.
 * @param {Array} pingArgs Arguments for ping command.
 * @return {Promise(string)} A promise with the ping's output.
 */
ping.invokePing = async function(id, pingArgs) {
  return new Promise(function(resolve, reject) {
    const rawOutput = [];

    log.info('invokePing() :: Invoking ping with args:', pingArgs);

    const child = spawn('ping', pingArgs);

    let resolved = false;

    child.stdout.on('data', function(buffer) {
      if (!resolved) {
        resolved = true;
        resolve();
      }

      const emitKey = id + '-on_stdout';

      eventBus.emit(emitKey, buffer.toString());
    });

    child.stderr.on('data', function(buffer) {
      log.info('invokePing() :: stderr data:', buffer.toString());
    });
    child.on('error', function(err) {
      log.warn('invokePing() Error:', err);
      reject(err);
    });
    child.on('close', function(code, signal) {
      log.info('invokePing() :: exited with code:', code, 'signal:', signal,
        '. Attempting restart...');

      eventBus.emit(id + '-on_close', 'true');
    });
  });
};

/**
 * Error handler for invokePing recursive call.
 *
 * @param {Error} error Error object.
 * @private
 */
ping._invokePingErrorHandler = (error) => {
  log.error('_invokePingErrorHandler() :: Failed to recurse and launch invokePing.',
    'Error:', error);

  // sleep for 2 seconds and retry
  sleep(2000);
  ping.invokePing(pingArgs, id)
    .catch(ping._invokePingErrorHandler);
};
