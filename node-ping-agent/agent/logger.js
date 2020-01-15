/**
 * @fileoverview Stub of a logger.
 */

const logger = module.exports = {};

const log = (args) => {
  console.log.apply(args);
};

logger.finest = console.log.bind(console);
logger.finer = console.log.bind(console);
logger.fine = console.log.bind(console);
logger.info = console.log.bind(console);
logger.warn = console.log.bind(console);
logger.error = console.log.bind(console);
