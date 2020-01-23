/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-non-literal-require */
/**
 * @fileoverview Handles auto update operations, downloading unziping, building.
 */

const url = require('url');
const util = require('util');
const path = require('path');
const fs = require('fs');

const readdir = util.promisify(fs.readdir);

// eslint-disable-next-line security/detect-child-process
const exec = util.promisify(require('child_process').exec);
const https = require('https');

const tmp = require('tmp');

const pack = require('../../package.json');
const eventBus = require('../core/event-bus');
const log = require('../utils/logger');
const { sleep } = require('../utils/utils');
const globals = require('../core/globals');

const updateOps = module.exports = {};

/**
 * The entire agent updating operation
 *
 * @param {Object} tagObj The github API's tag object.
 * @return {Promise} A Promise.
 */
updateOps.updateAgent = async (tagObj) => {
  const tmpObj = await updateOps._downloadAgent(tagObj.tarball_url);

  const targetDirectory = await updateOps._unzipAgent(tmpObj);

  // await updateOps.buildAgent(targetDirectory);

  log.info('updateAgent() :: All done. New Agent in:', targetDirectory);
};

/**
 * Download the agent.
 *
 * @param {string} downloadUrl Url to download.
 * @return {Promise<Object>} A Promise with the tmp object.
 * @private
 */
updateOps._downloadAgent = async (downloadUrl) => {
  const tmpObj = tmp.fileSync();
  console.log(downloadUrl);

  const command = `wget -O ${tmpObj.name} ${downloadUrl}`;
  log.info('_downloadAgent() :: Executing:', command);
  const res = await exec(command);

  console.log('RES:', res);

  return tmpObj;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpObj.name);
    const urlObj = url.parse(downloadUrl);

    const httpOpts = {
      protocol: 'https:',
      host: urlObj.hostname,
      path: urlObj.path,
      headers: {
        'User-Agent': `adref-agent client v${pack.version}`,
      },
    };
    const req = https.get(httpOpts, (response, err) => {
      if (err) {
        reject(err);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve.bind(null, tmpObj));
      });
    });

    req.on('error', (err) => { // Handle errors
      log.error('_downloadAgent() :: Error:', err);
      reject(err);
    });

    req.on('response', (data) => {
      console.log('data:', data.read());
    });
  });
};

/**
 * Unzips (untars) the downloaded agent.
 *
 * @param {Object} tmpObj The tmp lib object.
 * @return {Promise<string>?} A promise with the folder where agent was unziped.
 * @private
 */
updateOps._unzipAgent = async (tmpObj) => {
  const targetDirectory = updateOps._getTargetDirectory();
  log.info('_unzipAgent() :: Target Directory:', targetDirectory);
  try {
    await updateOps._nukeDestination(targetDirectory);

    try {
      await exec(`mkdir ${targetDirectory}`);
    } catch (ex) {
      log.info('_unzipAgent() :: Failed to create directory:', targetDirectory,
        'proceeding anyway...');
    }
    console.log('Extracting:', tmpObj.name);
    await exec(`tar -zxvf ${tmpObj.name} -C ${targetDirectory}`);

    return targetDirectory;
  } catch (ex) {
    log.error('_unzipAgent() :: Failed to unzip:', ex);
    return null;
  }
};

/**
 * Returns the location to unpack the new agent.
 *
 * @return {string} url.
 * @private
 */
updateOps._getTargetDirectory = () => {
  const rootDir = path.resolve(__dirname, '../../../');

  return path.join(rootDir, 'adref-agent-new/');
};

/**
 * Checks if directory exists and deletes it safely.
 *
 * @param {string} targetDirectory The target directory.
 * @return {Promise}
 * @private
 */
updateOps._nukeDestination = async (targetDirectory) => {
  try {
    await readdir(targetDirectory);

    // At this point if the directory did not exist "readdir()" would
    // throw and we would catch it...
    // Being here means the directory exists, check if we can read
    // package.json there
    const packageFile = path.join(targetDirectory, 'package.json');
    // eslint-disable-next-line import/no-dynamic-require
    const packTest = require(packageFile);

    // At this point the pack is there, check it
    if (packTest.name === 'adref-ping-agent') {
      // it's ours, delete
      await exec(`rm -rf ${targetDirectory}`);
    }
  } catch (ex) {
    // no action, means folder is not there.
  }
};
