/**
 * @fileoverview Performs a test suite of all the commands sent to the python library.
 */

const log = require('../logger');
const eventBus = require('../event-bus');
const { sleep } = require('../utils');

const testSuite = module.exports = {};

/**
 * Enters into special LED test state.
 *
 */
testSuite.localTestSuite = async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    await testSuite._runActual();
  }
};

/**
 * Perform all the possible states for LED.
 *
 * @private
 */
testSuite._runActual = async () => {
  log.info('testSuite() :: Starting...');
  const sleepTime = 2;

  log.info('testSuite() :: Internet Sev: 0');
  testSuite._pingUpdate(0, 0, 0);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 1');
  testSuite._pingUpdate(0, 0, 1);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 2');
  testSuite._pingUpdate(0, 0, 2);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 3');
  testSuite._pingUpdate(0, 0, 3);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4');
  testSuite._pingUpdate(0, 0, 4);
  await sleep(sleepTime);

  log.info('testSuite() :: Internet Sev: 4, GW: 1');
  testSuite._pingUpdate(0, 1, 4);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4, GW: 2');
  testSuite._pingUpdate(0, 2, 4);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4, GW: 3');
  testSuite._pingUpdate(0, 3, 4);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4, GW: 4');
  testSuite._pingUpdate(0, 4, 4);
  await sleep(sleepTime);

  log.info('testSuite() :: Internet Sev: 4, GW: 1, Local: 1');
  testSuite._pingUpdate(1, 4, 4);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4, GW: 2, Local: 2');
  testSuite._pingUpdate(2, 4, 4);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4, GW: 3, Local: 3');
  testSuite._pingUpdate(3, 4, 4);
  await sleep(sleepTime);
  log.info('testSuite() :: Internet Sev: 4, GW: 4, Local: 4');
  testSuite._pingUpdate(4, 4, 4);
  await sleep(sleepTime);

  log.info('testSuite() :: Internet Sev: 0');
  testSuite._pingUpdate(0, 0, 0);
  await sleep(sleepTime);

  log.info('testSuite() :: Ping Timeout');
  eventBus.emit('ping-fail', { type: 'ping_fail', target: 'internet' });
  await sleep(sleepTime * 2);

  log.info('testSuite() :: Ping Timeout 2');
  eventBus.emit('ping-fail', { type: 'ping_fail', target: 'internet' });
  await sleep(sleepTime * 2);

  log.info('testSuite() :: Spike: 50%');
  eventBus.emit('update-neopixel', { type: 'spike', percent_diff: 0.5 });
  await sleep(sleepTime * 2);

  log.info('testSuite() :: Spike: 100%');
  eventBus.emit('update-neopixel', { type: 'spike', percent_diff: 1 });
  await sleep(sleepTime * 2);

  log.info('testSuite() :: Spike: 150%');
  eventBus.emit('update-neopixel', { type: 'spike', percent_diff: 1.5 });
  await sleep(sleepTime * 2);

  log.info('testSuite() :: Spike: 200%');
  eventBus.emit('update-neopixel', { type: 'spike', percent_diff: 2 });
  await sleep(sleepTime * 2);
};

/**
 * Emulates a new ping state change.
 *
 * @param {number} local Local severity number.
 * @param {number} gw Gateway severity number.
 * @param {number} inet Internet severity number.
 * @private
 */
testSuite._pingUpdate = (local, gw, inet) => {
  const neopixelMessage = {
    type: 'set_led',
    state: {
      local,
      gateway: gw,
      internet: inet,
    },
  };
  eventBus.emit('update-neopixel', neopixelMessage);
};
