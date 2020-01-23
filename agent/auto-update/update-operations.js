/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-non-literal-require */
/**
 * @fileoverview Handles auto update operations, downloading unziping, building.
 */

const util = require('util');
const path = require('path');

// eslint-disable-next-line security/detect-child-process
const exec = util.promisify(require('child_process').exec);

const tmp = require('tmp');

const log = require('../utils/logger');

const updateOps = module.exports = {};

/**
 * The entire agent updating operation
 *
 * @param {Object} tagObj The github API's tag object.
 * @return {Promise} A Promise.
 */
updateOps.updateAgent = async (tagObj) => {
  const tmpObj = await updateOps._downloadAgent(tagObj.tarball_url);

  const extractedDirectory = await updateOps._unzipAgent(tmpObj);

  if (!extractedDirectory) {
    log.info('updateAgent() :: Failed to extract, giving up.');
    return;
  }

  await updateOps._buildAgent(extractedDirectory);

  log.info('updateAgent() :: All done. New Agent in:', extractedDirectory);
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

  const command = `wget -O ${tmpObj.name} ${downloadUrl}`;
  log.info('_downloadAgent() :: Executing:', command);

  await exec(command);

  return tmpObj;
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
    const res = await exec(`tar -zxvf ${tmpObj.name} -C ${targetDirectory}`);

    const extractedDirectory = updateOps._getExtractedDirectory(res, targetDirectory);

    log.info('_unzipAgent() :: Successfully extracted at:', extractedDirectory);

    return extractedDirectory;
  } catch (ex) {
    log.error('_unzipAgent() :: Failed to unzip:', ex);
    return null;
  }
};

/**
 * Gets the directory where the new adref-agent was extracted.
 *
 * @param {Object} res The result from the exec command execution.
 * @param {string} targetDirectory The target directory where to extract.
 * @return {string} The full path to the extracted folder.
 * @private
 */
updateOps._getExtractedDirectory = (res, targetDirectory) => {
  const output = res.stderr;
  const lines = output.split('\n');

  const [firstLine] = lines;

  const parts = firstLine.split(' ');

  return path.join(targetDirectory, parts[1]);
};

/**
 * Returns the location to unpack the new agent.
 *
 * @return {string} url.
 * @private
 */
updateOps._getTargetDirectory = () => {
  const rootDir = path.resolve(__dirname, '../../../');

  return rootDir;
};

/**
 * Build the extracted agent.
 *
 * @param {string} extractedDirectory Full path to the extracted folder.
 * @return {Promise}
 * @private
 */
updateOps._buildAgent = async (extractedDirectory) => {
  log.info('_buildAgent() :: Starting to build the agent...');
  const command = `cd ${extractedDirectory}; npm ci`;

  await exec(command);
};
