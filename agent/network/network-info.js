/**
 * @fileoverview Collects network related information for the current machine.
 */

const util = require('util');
// eslint-disable-next-line security/detect-child-process
const exec = util.promisify(require('child_process').exec);

const defaultGateway = require('default-gateway');

const log = require('../utils/logger');


const netInfo = module.exports = {};

/**
 * Get information about the available network interfaces.
 *
 * @return {Object} Object with the target IPs for local and gateway interfaces.
 */
netInfo.getInfo = async () => {
  const localRes = await defaultGateway.v4();

  const gateway = await netInfo.getGateway();

  return {
    local: localRes.gateway,
    gateway,
  };
};

/**
 * Get the internet gateway, will attempt a traceroute and fetch the second hop.
 *
 * @return {Promise<string|null>} The gateway IP.
 */
netInfo.getGateway = async () => {
  const { stdout } = await exec('traceroute -m 2 -n 8.8.8.8');

  const lines = stdout.split('\n');

  log.info(lines);

  if (lines.length !== 3) {
    return null;
  }

  const gatewayLine = lines[1];

  const words = gatewayLine.split(' ');

  return words[3];
};
