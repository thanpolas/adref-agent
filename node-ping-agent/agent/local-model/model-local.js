/**
 * @fileoverview Ping store for the local use and handling of the LED's.
 */
const eventBus = require('../event-bus');
const log = require('../logger');
const globals = require('../globals');
const { baseline } = require('./baseline.lib');
const led = require('./led-controller');

const localModel = module.exports = {};

/** @enum {number} The kind of severities */
const SEV = localModel.SEV = {
  // All good.
  'SEV0': 0,
  // Low Severity
  'SEV1': 1,
  // Medium Severity
  'SEV2': 2,
  // High Severity
  'SEV3': 3,
  // No Service
  'SEV4': 4,
};

/**
 * The state of the local model (model's store is memory).
 *
 * @type {Object}
 */
localModel.state = {
  // The store medium will be Arrays stored in this object with keys
  // being the "pingTarget.id" value.
  stores: {},

  // The ping targets that were provided during setup.
  pingTargets: [],

  // Define how many pings should be our buffer size.
  bufferSize: 300,

  // Reference to the setInterval for the watcher loop
  stateWatcherLoop: null,
};

/**
 * Sets up models and listeners for the desired pingtargets.
 *
 * @param {Array.<Object>} pingTargets The ping targets.
 */
localModel.setup = (pingTargets) => {
  // shortcut assign
  const state = localModel.state;
  const stores = state.stores;

  state.pingTargets = pingTargets;

  pingTargets.forEach((pingTarget) => {
    localModel.setupEventHandlers(pingTarget);

    // create store
    stores[pingTarget.id] = [];
  });

  // Start State Watcher
  state.stateWatcherLoop = setInterval(localModel.calculateQuality,
    globals.localWatcherInterval);
};

/**
 * Creates event handlers for this ping target.
 *
 * @param {Object} pingTarget The ping target object.
 */
localModel.setupEventHandlers = (pingTarget) => {
  eventBus.on(pingTarget.id + '-ping', localModel.onPing);
};

/**
 * Handles a ping event.
 *
 * @param {Object} pingTarget The ping target object.
 * @param {Object} pingData The ping data object.
 */
localModel.onPing = (pingTarget, pingData) => {
  const state = localModel.state;
  const pingStore = state.stores[pingTarget.id];

  pingStore.push(pingData);

  // Retain buffer size
  if (pingStore.length > state.bufferSize) {
    pingStore.shift();
  }
};

/**
 * Function that is invoked on a timed interval that calculates the quality
 * of the line for all ping targets and controls the LEDs.
 *
 */
localModel.calculateQuality = () => {
  const KNOWN_TARGETS = ['local', 'gateway', 'internet'];

  // shortcut assign
  const state = localModel.state;
  const stores = state.stores;
  const pingTargets = state.pingTargets;

  // pick the first stored ping target to evaluate dataset length.
  const pingTargetSample = pingTargets[0];

  if (stores[pingTargetSample.id].length < 5) {
    // not enough samples
    return;
  }

  pingTargets.forEach((pingTarget) => {
    if (KNOWN_TARGETS.indexOf(pingTarget.id) === -1) {
      // unknown target
      return;
    }

    const data = stores[pingTarget.id].map((pingItem) => pingItem.time);

    const dataBaseline = baseline(data);

    const spikeSeverity = localModel.calculateSpike(data, dataBaseline);
    const jitterSeverity = localModel.calculateJitter(data, dataBaseline);

    const baselineDiff = (((dataBaseline.high / dataBaseline.average) - 1) * 100).toFixed(2)

    log.info(`cq() :: id: ${pingTarget.id} spikeSev: ${spikeSeverity}`,
    'jitterSev:', jitterSeverity, 'avg:', dataBaseline.average.toFixed(2),
    'high:', dataBaseline.high.toFixed(2), 'low:', dataBaseline.low.toFixed(2),
    `(${baselineDiff}%)`);

    const severity = Math.max(spikeSeverity, jitterSeverity);
    led.setState(pingTarget.id, severity);
  });
};

/**
 * Calculates the spike severity, current model is:
 * 0: No severity, all good.
 * 1: up to 30% low severity.
 * 2: up to 65% medium severity.
 * 3: 65% and up, high severity.
 *
 * of deviation from the high baseline in the last 5 pings.
 *
 * @param {Array.<number>} data Ping times in sequence.
 * @param {Object} dataBaseline Baseline object.
 * @return {number} severity number.
 */
localModel.calculateSpike = (data, dataBaseline) => {
  // percentages that set the boundaries of severities
  const HIGH = 0.65;
  const LOW = 0.3;

  // Get the sample count
  const pingSample = globals.spikePingSample;

  const spikeData = data.slice(-1 * pingSample);

  let pingFailsFound = 0;

  const dataDeviation = spikeData.map((pingTime) => {
    if (isNaN(pingTime)) {
      pingFailsFound++;
      return 0;
    }
    if (pingTime < dataBaseline.high) {
      return 0;
    }

    return (pingTime / dataBaseline.high) - 1;
  });

  // Check for ping timeouts
  if (pingFailsFound) {
    const failsPercent = pingFailsFound / pingSample;
    if (pingFailsFound === pingSample) {
      return SEV.SEV4;
    }

    if (failsPercent > 0.65) {
      return SEV.SEV3;
    }

    if (failsPercent > 0.3) {
      return SEV.SEV2;
    }
  }

  // Calculate severity
  return dataDeviation.reduce((severity, deviation) => {
    // lax conditional on purpose
    if (deviation == 0) {
      return SEV.SEV0;
    }
    if (deviation <= LOW && severity >= 1) {
      return SEV.SEV1;
    }

    if (deviation <= HIGH && deviation > LOW && severity >= 2) {
      return SEV.SEV2;
    }

    if (deviation > HIGH && severity >= 3) {
      return SEV.SEV3;
    }

    return severity;
  }, 3);
};

/**
 * Calculates the spike severity, current model is:
 * 0: No severity, all good.
 * 1: up to 30% low severity.
 * 2: up to 65% medium severity.
 * 3: 65% and up, high severity.
 *
 * of jitter deviation from the high baseline over the entire dataset.
 *
 * @param {Array.<number>} data Ping times in sequence.
 * @param {Object} dataBaseline Baseline object.
 * @return {number} severity number.
 */
localModel.calculateJitter = (data, dataBaseline) => {
  // percentages that set the boundaries of severities
  const HIGH = 0.65;
  const LOW = 0.3;

  if (!data.length) {
    return SEV.SEV0;
  }

  const totalDifference = data.reduce((total, pingTime, index) => {
    if (index === 0) {
      return 0;
    }

    if (isNaN(pingTime)) {
      return 0;
    }

    const diff = data[index - 1] - pingTime;
    if (diff < 0) {
      return diff * -1;
    } else {
      return diff;
    }
  });

  if (totalDifference === 0) {
    return SEV.SEV0;
  }

  const jitter = totalDifference / data.length;

  // Jitter quality is quantitative:
  //
  // Jitter Level     Acceptability
  // <   1 ms      Excellent
  // <   5 ms      Extremely Good
  // <  20 ms      Very Good
  // <  50 ms      Good
  // <  80 ms      Good to Fair
  // < 100 ms      Fair
  //
  // As per: http://www.3rdechelon.net/jittercalc.asp
  //
  // Adjusted for our scale:
  // SEV0 <= 20ms
  // SEV1 <= 50ms
  // SEV2 <= 80ms
  // SEV3 > 80ms
  const SEV0 = 20;
  const SEV1 = 50;
  const SEV2 = 80;

  log.debug('Jitter calculated:', jitter);

  if (jitter <= SEV0) {
    return SEV.SEV0;
  }

  if (jitter > SEV0 && jitter <= SEV1) {
    return SEV.SEV1;
  }

  if (jitter > SEV1 && jitter <= SEV2) {
    return SEV.SEV2;
  }
  if (jitter > SEV2) {
    return SEV.SEV3;
  }
};
