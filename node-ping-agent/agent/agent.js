/**
 * @fileoverview The main agent operation handler.
 */

const { startPing } = require('./ping-command');
const eventBus = require('./event-bus');

const { processPingResults } = require('./ping-library');

const agent = module.exports = {};

/**
 * Start the agent.
 *
 */
agent.start = async () => {

  const pingTargets = await agent.getPingTargets();

  agent.setupEventHandlers(pingTargets);

  const promises = pingTargets.map((pingTarget) => {
    return startPing(pingTarget);
  })

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
    eventBus.on(pingTarget.id + '-on_stdout',
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

  console.log('pingData:', pingData);
};
