/**
 * @fileoverview Stub of a logger.
 */

const logger = module.exports = {};

const noop = () => {};

const log = (args) => {
  console.log.apply(args);
};

logger.debug = noop;
logger.info = console.log.bind(console);
logger.warn = console.log.bind(console);
logger.error = console.log.bind(console);
