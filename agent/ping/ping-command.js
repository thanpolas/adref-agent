/**
 * @fileoverview Responsible for launching and monitoring ping commands.
 */

// eslint-disable-next-line security/detect-child-process
const { spawn } = require('child_process');

const log = require('../utils/logger');
const eventBus = require('../core/event-bus');
const { isOsx } = require('../core/globals');
const { sleep } = require('../utils/utils');

const ping = module.exports = {};

ping.child = null;
ping.shutdown = false;

/**
 * Start a ping and stream the results via eventBus.
 *
 * @param {Object} pingTarget Options for the ping command.
 *    @param {string} pingTarget.id REQUIRED A unique identifier.
 *    @param {string} pingTarget.pingIp REQUIRED The IP to ping.
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

  eventBus.on(`${pingTarget.id}-on_close`, async () => {
    if (ping.shutdown) {
      return;
    }
    // ping exited, restart.
    await ping.invokePing(pingTarget.id, pingArgs)
      .catch(ping._invokePingErrorHandler.bind(null, pingTarget.id, pingArgs));
  });

  await ping.invokePing(pingTarget.id, pingArgs)
    .catch(ping._invokePingErrorHandler.bind(null, pingTarget.id, pingArgs));

  // listen for shutdown event
  eventBus.on('shutdown', ping._shutdown);
};


/**
 * Handles shutdown.
 *
 * @private
 */
ping._shutdown = () => {
  ping.shutdown = true;
  if (ping.child) {
    ping.child.kill('SIGTERM');
  }
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
 * @return {Promise<string>} A promise with the ping's output.
 */
ping.invokePing = async (id, pingArgs) => {
  return new Promise((resolve, reject) => {
    log.info('invokePing() :: Invoking ping with args:', pingArgs);

    ping.child = spawn('ping', pingArgs);

    let resolved = false;

    ping.child.stdout.on('data', (buffer) => {
      if (!resolved) {
        resolved = true;
        resolve();
      }

      const emitKey = `${id}-on_stdout`;

      eventBus.emit(emitKey, buffer.toString());
    });

    ping.child.stderr.on('data', (buffer) => {
      log.info('invokePing() :: stderr data:', buffer.toString());
    });
    ping.child.on('error', (err) => {
      log.warn('invokePing() Error:', err);
      reject(err);
    });
    ping.child.on('close', (code, signal) => {
      if (ping.shutdown) {
        return;
      }

      log.info('invokePing() :: exited with code:', code, 'signal:', signal,
        '. Attempting restart...');

      eventBus.emit(`${id}-on_close`, 'true');
    });
  });
};

/**
 * Error handler for invokePing recursive call.
 *
 * @param {string} id Token.
 * @param {Array} pingArgs Arguments to run ping command.
 * @param {Error} error Error object.
 * @private
 */
ping._invokePingErrorHandler = async (id, pingArgs, error) => {
  if (ping.shutdown) {
    return;
  }
  log.error('_invokePingErrorHandler() :: Failed to recurse and launch invokePing.',
    'Error:', error);

  // sleep and retry
  await sleep(2000);
  ping.invokePing(id, pingArgs)
    .catch(ping._invokePingErrorHandler.bind(null, id, pingArgs));
};
