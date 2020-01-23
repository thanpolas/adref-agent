/**
 * @fileoverview The main agent operation handler.
 */
const process = require('process');

const { startPing } = require('../ping/ping-command');
const eventBus = require('./event-bus');

const { processPingResults } = require('../ping/ping-library');
const apiModel = require('../conn/api-model');
const localModel = require('../local-model/model-local');
const neopixel = require('../neopixel/neopixel');
const globals = require('./globals');
const { localTestSuite } = require('../neopixel/test-suite');
const keepAlive = require('../local-model/keep-alive');
const log = require('../utils/logger');
const networkInfo = require('../network/network-info');
const autoUpdate = require('../auto-update/auto-update');

const agent = module.exports = {};

/**
 * Start the agent.
 *
 */
agent.start = async () => {
  agent._setupNodeHandlers();

  const pingTargets = await agent.getPingTargets();
  let promises = [];

  autoUpdate.init();

  if (process.argv[2] !== 'noled') {
    // Start Python Library interfacing with Neopixel LED
    neopixel.init({
      brightness: globals.brightness,
    });
  }

  if (process.argv[2] === 'test') {
    globals.TEST_MODE = true;
  }

  if (globals.TEST_MODE) {
    await localTestSuite();
  } else {
    agent.setupEventHandlers(pingTargets);

    apiModel.setup(pingTargets);

    localModel.setup(pingTargets);

    promises = pingTargets.map((pingTarget) => {
      return startPing(pingTarget);
    });

    keepAlive.init();
  }

  await Promise.all(promises);
};

/**
 * Returns the targets to ping.
 *
 * @return {Array.<Object>} Targets.
 */
agent.getPingTargets = async () => {
  const pingTargets = [];

  const targets = await networkInfo.getInfo();

  pingTargets.push({
    id: 'local',
    pingIp: targets.local,
  });

  pingTargets.push({
    id: 'gateway',
    pingIp: targets.gateway,
  });

  pingTargets.push({
    id: 'internet',
    pingIp: globals.targetInternetIp,
  });

  log.info(`getPingTargets() :: Ping targets discovered. Local: ${targets.local}`
    + ` Gateway: ${targets.gateway} Internet: ${globals.targetInternetIp}`);

  return pingTargets;
};

/**
 * Creates event listeners for all ping targets.
 *
 * @param {Array.<Object>} pingTargets The ping targets.
 */
agent.setupEventHandlers = (pingTargets) => {
  pingTargets.forEach((pingTarget) => {
    eventBus.on(`${pingTarget.id}-on_stdout`,
      agent.onStdout.bind(null, pingTarget));
  });
};

/**
 * Handles a ping message.
 *
 * @param {Object} pingTarget The pingtarget object.
 * @param {string} message The ping message.
 */
agent.onStdout = (pingTarget, message) => {
  const pingData = processPingResults(message);

  if (pingData === false) {
    return;
  }

  if (pingData.ping_success === false) {
    pingData.target_ip = pingTarget.pingIp;

    // Emit ping-fail only for internet
    if (pingTarget.id === 'internet') {
      eventBus.emit('ping-fail', {
        type: 'ping_fail',
        target: pingTarget.id,
      });
    }
  }

  eventBus.emit(`${pingTarget.id}-ping`, pingTarget, pingData);
};

/**
 * Setup Node exit event listeners.
 *
 * @private
 */
agent._setupNodeHandlers = () => {
  // do something when app is closing
  process.on('exit', agent._exitHandler);

  // catches ctrl+c event
  process.on('SIGINT', agent._exitHandler);

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', agent._exitHandler);
  process.on('SIGUSR2', agent._exitHandler);

  // catches uncaught exceptions
  process.on('uncaughtException', agent._exitHandler);
};

/**
 * Note exit handler.
 *
 * @private
 */
agent._exitHandler = () => {
  log.info('Node exit, shutting down...');
  eventBus.emit('shutdown');
};
