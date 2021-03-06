/**
 * @fileoverview Interfaces with the neopixel to display the current status.
 *
 * Original Source
 * Copyright 2013-2016 IBM Corp.
 * Copyright 2016 JS Foundation and other contributors, https://js.foundation/
 * https://github.com/node-red/node-red-nodes/tree/master/hardware/neopixel
 */

// eslint-disable-next-line security/detect-child-process
const { spawn } = require('child_process');

const eventBus = require('../core/event-bus');
const log = require('../utils/logger');

const piCommand = `${__dirname}/neopix.py`;

// the magic to make python print stuff immediately
process.env.PYTHONUNBUFFERED = 1;

const neopixel = module.exports = {};

/**
 * Initialize the Neopixel
 *
 * @param {Object=} opts Options when initializing:
 * @param {number} opts.pixels How many LED lights are available.
 * @param {number} opts.brightness A number ranging from 0 to 100.
 * @param {number} opts.waitms Time to wait between commands in ms.
 */
neopixel.init = (opts = {}) => {
  const pixelState = {};
  pixelState.pixels = opts.pixels || 8;
  pixelState.gamma = true;

  pixelState.brightness = Number(opts.brightness || 40);

  pixelState.waitms = Number(opts.waitms || 20);
  if (pixelState.waitms < 0) {
    pixelState.waitms = 0;
  }
  if (pixelState.brightness < 0) {
    pixelState.brightness = 0;
  }
  if (pixelState.brightness > 100) {
    pixelState.brightness = 100;
  }

  pixelState.child = spawn(piCommand, [
    pixelState.pixels,
    pixelState.waitms,
    pixelState.brightness,
    pixelState.gamma,
  ]);


  pixelState.child.stdout.on('data', (buffer) => {
    log.info('neopixelInit() :: stdout:', buffer.toString());
  });

  pixelState.child.stderr.on('data', (buffer) => {
    log.info('neopixelInit() :: stderr data:', buffer.toString());
  });

  pixelState.child.on('close', (code, signal) => {
    log.info('neopixelInit() :: Closed:', code, signal);
  });

  pixelState.child.on('error', (err) => {
    log.info('neopixelInit() :: Error:', err);
  });

  // Listen to system events
  eventBus.on('update-neopixel', neopixel.onStatusUpdate.bind(null, pixelState));
  eventBus.on('ping-fail', neopixel.onStatusUpdate.bind(null, pixelState));
  eventBus.on('shutdown', neopixel._shutdown.bind(null, pixelState));
};

/**
 * Handles shutdown.
 *
 * @param {Object} pixelState State object.
 * @private
 */
neopixel._shutdown = (pixelState) => {
  if (pixelState.child) {
    pixelState.child.kill('SIGTERM');
  }
};

/**
 * Relays events to python library
 *
 * @param {Object} pixelState The pixel state.
 * @param {*} message The event captured.
 */
neopixel.onStatusUpdate = (pixelState, message) => {
  const messageSerialized = JSON.stringify(message);
  pixelState.child.stdin.write(`${messageSerialized}\n`);
};
