/**
 * @fileoverview Stub of a logger.
 */

const logger = {};

const log = console.log.apply();

logger.finest = log;
logger.finer = log;
logger.fine = log;
logger.info = log;
logger.warn = log;
logger.error = log;
