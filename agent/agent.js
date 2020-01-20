/**
 * @fileoverview The main agent operation handler.
 */

const { startPing } = require('./ping-command');
const eventBus = require('./event-bus');

const { processPingResults } = require('./ping-library');
const apiModel = require('./model-api');
const localModel = require('./local-model/model-local');
const neopixel = require('../agent/neopixel/neopixel');
const globals = require('./globals');
const { localTestSuite } = require('./neopixel/test-suite');

const agent = module.exports = {};

/**
 * Start the agent.
 *
 */
agent.start = async () => {
  const pingTargets = await agent.getPingTargets();
  let promises = [];
  neopixel.init({
    brightness: globals.brightness,
  });

  if (process.argv[2] === 'test') {
    globals.TEST_MODE = true;

    await localTestSuite();
  } else {
    agent.setupEventHandlers(pingTargets);

    apiModel.setup(pingTargets);

    localModel.setup(pingTargets);

    promises = pingTargets.map((pingTarget) => {
      return startPing(pingTarget);
    });
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

  pingTargets.push({
    id: 'local',
    pingIp: '192.168.1.1',
  });

  pingTargets.push({
    id: 'gateway',
    pingIp: '100.96.185.33',
  });

  pingTargets.push({
    id: 'internet',
    pingIp: '8.8.8.8',
  });


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
