/**
 * @fileoverview Ping store for the API, buffers up to a defined number of pings
 *   and then submits them to the API.
 */
const eventBus = require('../core/event-bus');
const { submit } = require('./api-submit');
const globals = require('../core/globals');

const apiModel = module.exports = {};

/**
 * The state of the api model (model's store is memory).
 *
 * @type {Object}
 */
apiModel.state = {
  // The store medium will be Arrays stored in this object with keys
  // being the "pingTarget.id" value.
  stores: {},

  // The ping targets that were provided during setup.
  pingTargets: [],

  // An id will be elected to become the master id, which will determine
  // when an API call will be made.
  masterId: '',

  // Define every how many pings to submit to the API.
  maxPings: globals.apiSubmitPingsInterval,
};

/**
 * Sets up models and listeners for the desired pingtargets.
 *
 * @param {Array.<Object>} pingTargets The ping targets.
 */
apiModel.setup = (pingTargets) => {
  // shortcut assign
  const state = apiModel.state;
  const stores = state.stores;

  state.pingTargets = pingTargets;

  pingTargets.forEach((pingTarget) => {
    // Elect Master Id
    if (!apiModel.state.masterId) {
      apiModel.state.masterId = pingTarget.id;
    }

    apiModel.setupEventHandlers(pingTarget);

    // create store
    stores[pingTarget.id] = [];
  });
};

/**
 * Creates event handlers for this ping target.
 *
 * @param {Object} pingTarget The ping target object.
 */
apiModel.setupEventHandlers = (pingTarget) => {
  eventBus.on(pingTarget.id + '-ping', apiModel.onPing);
};

/**
 * Handles a ping event, if needed will reset and submit to the API.
 *
 * @param {Object} pingTarget The ping target object.
 * @param {Object} pingData The ping data object.
 */
apiModel.onPing = (pingTarget, pingData) => {
  const state = apiModel.state;
  const pingStore = state.stores[pingTarget.id];

  pingStore.push(pingData);

  // Check if we need to reset and submit to the API
  if (pingTarget.id === state.masterId) {
    if (pingStore.length >= state.maxPings) {
      const copyStores = apiModel.resetStores();
      submit(state.pingTargets, copyStores);
    }
  }
};

/**
 * Resets the models and submits to the API. It is important that this
 * function performs the reset operations synchronously so as to not have
 * race conditions.
 *
 * @return {Object} A copy of the stores.
 */
apiModel.resetStores = () => {
  const state = apiModel.state;
  const stores = state.stores;

  // Copy and then reset all the model stores.
  const copyStores = {};
  state.pingTargets.forEach((pingTarget) => {
    copyStores[pingTarget.id] = stores[pingTarget.id].slice(0);
    stores[pingTarget.id] = [];
  });

  return copyStores;
};
