/**
 * @fileoverview Performs a keep alive fx on the pixels to indicate the agent is alive.
 */

const eventBus = require('../event-bus');
const log = require('../logger');
const globals = require('../globals');
const { getRandomInt } = require('../utils');


const keepAlive = module.exports = {};

/**
 * Initialize Keep alive.
 *
 */
keepAlive.init = () => {
  log.info('Initializing Keep Alive...');
  const sleepTime = keepAlive._getSleepTime();
  setTimeout(keepAlive._runAlive, sleepTime);
};

/**
 * Performs the keep alive function
 *
 * @private
 */
keepAlive._runAlive = () => {
  const sleepTime = keepAlive._getSleepTime();
  log.info(`Keep Alive triggering. Next trigger in ${sleepTime / 1000 / 60} minutes`);

  eventBus.emit('update-neopixel', {
    type: 'keep-alive',
    keep_alive_type: 'pingpong',
  });

  setTimeout(keepAlive._runAlive, sleepTime);
};

/**
 * Returns a random time between the desired range.
 *
 * @return {number} Wait time in milliseconds.
 * @private
 */
keepAlive._getSleepTime = () => {
  const minMinutes = 10;
  const maxMinutes = 30;

  const randomMin = getRandomInt(minMinutes, maxMinutes);

  return randomMin * 60 * 1000;
};
