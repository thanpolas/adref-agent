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
