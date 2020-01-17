/**
 * @fileoverview Manages the LEDs of the device, there are three LEDs:
 *    - LOCAL :: Representing the local network (ping to server)
 *    - GATEWAY :: Representing the first hop after your router.
 *    - INTERNET :: Representing a target on the internet.
 */

const led = module.exports = {};

/** @enum {string} Available LEDs */
led.TYPES = {
  LOCAL: 'local',
  GATEWAY: 'gateway',
  INTERNET: 'internet',
};

/** @enum {string Available LED Modes for each LED */
led.MODES = {
  // Null state when still initializing or not enough data collected.
  NULL: 'null',
  // Green is all good
  GREEN: 'green',
  // Severity 1 (low impact)
  SEV1: 'sev1',
  // Severity 2 (medium impact)
  SEV2: 'sev2',
  // Severity 3 (high impact)
  SEV3: 'sev3',
  // Severity 4 (no service)
  SEV4: 'sev4',
};

/**
 * The state of the LEDs
 *
 * @type {Object}
 */
led.state = {
  local: led.MODES.NULL,
  gateway: led.MODES.NULL,
  internet: led.MODES.NULL,
};

/**
 * Set the state of an LED.
 *
 * @param {led.TYPES} type LED type.
 * @param {led.MODES} mode The LED mode to set.
 */
led.setState = (type, mode) => {

};



