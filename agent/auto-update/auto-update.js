/**
 * @fileoverview Checks for new updates and updates the agent.
 */

const GitHub = require('github-api');
const semver = require('semver');

const eventBus = require('../core/event-bus');
const log = require('../utils/logger');
const { sleep } = require('../utils/utils');
const globals = require('../core/globals');
const pack = require('../../package.json');
const updateOps = require('./update-operations');

const autoUpdate = module.exports = {};

/**
 * A stand alone module that cheks for updates, downloads and builds them.
 *
 * @param {boolean=} nowait set to true to not wait a while.
 */
autoUpdate.init = async (nowait) => {
  const state = {
    hasStarted: false,
    intervalRef: null,
  };

  eventBus.on('shutdown', autoUpdate.onShutdown.bind(null, state));

  if (!nowait) {
    // Start after a while...
    await sleep(10000);
  }

  log.info('Auto Updater Service Starting...');

  // check on boot before interval.
  await autoUpdate.checkForUpdate();

  // Set interval
  state.hasStarted = true;
  state.intervalRef = setInterval(autoUpdate.checkForUpdate,
    globals.checkUpdateInterval);
};

/**
 * The actual update checking operations.
 *
 */
autoUpdate.checkForUpdate = async () => {
  log.info('checkForUpdate() :: Checking for updates...');
  const tagList = await autoUpdate.getRepoTags();

  if (!tagList) {
    log.info('checkForUpdate() :: Tag list was empty, stoping update check.');
    return;
  }

  const [lastTag] = tagList;

  const latestVer = lastTag.name;

  const thisVer = pack.version;

  if (!semver.valid(latestVer)) {
    log.warn(`checkForUpdate () :: Latest tag not a valid semver: ${latestVer}`);
  }

  if (semver.lt(thisVer, latestVer)) {
    log.info(`checkForUpdate() :: New version found: ${latestVer}`);
    await updateOps.updateAgent(lastTag);
  }
};

/**
 * Returns the tags of the adref agent repo.
 *
 * @return {Promise<Array>?} List of tags.
 */
autoUpdate.getRepoTags = async () => {
  const gh = new GitHub();

  // new Repository(fullname,
  const repo = gh.getRepo('thanpolas', 'adref-agent');

  let res;
  try {
    res = await repo.listTags();
  } catch (ex) {
    log.error('autoUpdate.checkAndFetch() Failed:', ex);
    return null;
  }

  return res.data;
};

/**
 * Handle shutdown.
 *
 * @param {Object} localState The local state.
 */
autoUpdate.onShutdown = (localState) => {
  if (!localState.hasStarted) {
    return;
  }

  clearInterval(localState.intervalRef);
};
