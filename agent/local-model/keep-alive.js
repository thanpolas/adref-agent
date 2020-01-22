/**
 * @fileoverview Performs a keep alive fx on the pixels to indicate the agent is alive.
 */

const eventBus = require('../core/event-bus');
const log = require('../utils/logger');
const globals = require('../core/globals');


const keepAlive = module.exports = {};

/** @type {Object?} Reference of the setTimeout */
keepAlive._timeoutRef = null;

/**
 * Initialize Keep alive.
 *
 */
keepAlive.init = () => {
  log.info('Initializing Keep Alive...');
  keepAlive._timeoutRef = setInterval(keepAlive._runAlive, globals.keepAliveTime);

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
  log.info('Keep Alive triggering.');

  eventBus.emit('update-neopixel', {
    type: 'keep-alive',
    keep_alive_type: 'pingpong',
  });
};
