/**
 * @fileoverview Set of handy utilities.
 */

const utils = module.exports = {};

/**
 * Sleep for a little while, helps with syncing with hardware...
 *
 * @param {number} ms Time to sleep for milliseconds.
 * @return {Promise}
 */
utils.sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

/**
 * Get a random integer between `min` and `max`.
 *
 * @param {number} min - min number
 * @param {number} max - max number
 * @return {number} a random integer
 */
utils.getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};
