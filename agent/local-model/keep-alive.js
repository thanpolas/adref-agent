/**
 * @fileoverview Performs a keep alive fx on the pixels to indicate the agent is alive.
 */

const eventBus = require('../core/event-bus');
const log = require('../utils/logger');
const { getRandomInt } = require('../utils/utils');


const keepAlive = module.exports = {};

/** @type {Object?} Reference of the setTimeout */
keepAlive._timeoutRef = null;

/**
 * Initialize Keep alive.
 *
 */
keepAlive.init = () => {
  log.info('Initializing Keep Alive...');
  const sleepTime = keepAlive._getSleepTime();
  keepAlive._timeoutRef = setTimeout(keepAlive._runAlive, sleepTime);

  eventBus.on('shutdown', keepAlive._shutdown);
};

/**
 * Handles agent shutdown.
 *
 * @private
 */
keepAlive._shutdown = () => {
  if (keepAlive._timeoutRef) {
    clearTimeout(keepAlive._timeoutRef);
  }
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

  keepAlive._timeoutRef = setTimeout(keepAlive._runAlive, sleepTime);
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
