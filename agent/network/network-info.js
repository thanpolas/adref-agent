/**
 * @fileoverview Collects network related information for the current machine.
 *  it also acts as a hold until network is ready.
 */

const util = require('util');
// eslint-disable-next-line security/detect-child-process
const exec = util.promisify(require('child_process').exec);

const defaultGateway = require('default-gateway');
const { sleep } = require('../utils/utils');

const log = require('../utils/logger');

const netInfo = module.exports = {};

/**
 * Get information about the available network interfaces.
 *
 * @return {Promise<Object>} Object with the target IPs for local and gateway interfaces.
 */
netInfo.getInfo = async () => {
  const local = await netInfo.getLocal();
  const gateway = await netInfo.getGateway();

  return {
    local,
    gateway,
  };
};

/**
 * Get the local gateway.
 *
 * @return {Promise<string>} Local gateway.
 */
netInfo.getLocal = async () => {
  let resLocal;
  let localGateway;
  try {
    resLocal = await defaultGateway.v4();
  } catch (ex) {
    log.error(`Could not get local gateway: ${ex.message}`);

    // sleep a few seconds and recurse until local interface is ready
    await sleep(3000);
    localGateway = await netInfo.getLocal();
  }

  return localGateway || resLocal.gateway;
};

/**
 * Get the internet gateway, will attempt a traceroute and fetch the second hop.
 *
 * @return {Promise<string|null>} The gateway IP.
 */
netInfo.getGateway = async () => {
  const traceStdout = await netInfo._execTraceroute();

  const lines = traceStdout.split('\n');

  let validLength = 3;
  let rightLine = 1;
  if (!global.isOsx) {
    validLength = 4;
    rightLine = 2;
  }

  if (lines.length !== validLength) {
    return null;
  }

  const gatewayLine = lines[rightLine];

  const words = gatewayLine.split(' ');

  return words[3];
};

/**
 * Execute the traceroute command and return the result.
 *
 * @return {Promise<string>} The result.
 * @private
 */
netInfo._execTraceroute = async () => {
  let execRes;
  let stdout;

  try {
    execRes = await exec('traceroute -m 2 -n 8.8.8.8');
  } catch (ex) {
    log.error(`Traceroute error: ${ex.message}`);

    // sleep a few seconds and recurse until traceroute is ready
    await sleep(3000);
    stdout = await netInfo._execTraceroute();
  }

  return stdout || execRes.stdout;
};
