/**
 * @fileoverview The main event bus.
 */

const EventEmitter = require('events');

const eventBus = module.exports = new EventEmitter;
