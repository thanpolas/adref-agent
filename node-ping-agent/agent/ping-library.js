/**
 * @fileOverview Ping library.
 */
const spawn = require('child_process').spawn;

const log = require('./logger');
const globals = require('./globals');

const pingLib = module.exports = {};

/**
 * Process the ping results.
 *
 * @param {string} pingLine Raw Ping line.
 * @return {Object} A Ping object.
 */
pingLib.processPingResults = function (pingLine) {

  if (!pingLib.isValidPingLine(pingLine)) {
    return false;
  }

  const parts = pingLine.split(' ');

  const pingObj = pingLib._getPingObject();

  const dt = new Date();
  pingObj.ping_timestamp = dt.toISOString();

  pingObj.bytes = parts[0];

  // IP has a colon at the end so remove last char.
  pingObj.target_ip = parts[3].slice(0, -1);

  // ICMP Sequence starts with "icmp_seq=3" so remove first chars
  pingObj.icmp_seq = parseInt(parts[4].substring(9), 10);

  // pingtime is "time=3.430" so remove first chars.
  pingObj.time = parseFloat(parts[6].substring(5));

  return pingObj;
};

/**
 * Get a ping object.
 *
 * @return {Object} A Ping object.
 */
pingLib._getPingObject = () => {
  return {
    ping_timestamp: '',
    bytes: NaN,
    target_ip: '',
    icmp_seq: NaN,
    time: 0.0,
  };
};

/**
 * Checks if the line is a valid ping line.
 *
 * @param {string} pingLine Raw Ping line.
 * @return {boolean} True if it's legit.
 */
pingLib.isValidPingLine = (pingLine) => {
  if (!pingLine) {
    return false;
  }

  // exclude ping command header line.
  if (pingLine.substring(0, 4) === 'PING') {
    return false;
  }

  return true;

};
