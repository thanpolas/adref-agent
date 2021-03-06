/**
 * @fileoverview Ping store for the local use and handling of the LED's.
 */
const eventBus = require('../core/event-bus');
const log = require('../utils/logger');
const globals = require('../core/globals');
const { baseline } = require('./baseline.lib');

const localModel = module.exports = {};

/** @enum {number} The kind of severities */
const SEV = localModel.SEV = {
  // All good.
  SEV0: 0,
  // Low Severity
  SEV1: 1,
  // Medium Severity
  SEV2: 2,
  // High Severity
  SEV3: 3,
  // No Service
  SEV4: 4,
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
  const { state } = localModel;
  const { stores } = state;

  state.pingTargets = pingTargets;

  pingTargets.forEach((pingTarget) => {
    localModel.setupEventHandlers(pingTarget);

    // create store
    stores[pingTarget.id] = [];
  });

  // Start State Watcher
  state.stateWatcherLoop = setInterval(localModel.calculateQuality,
    globals.localWatcherInterval);

  eventBus.on('shutdown', localModel._shutdown);
};

localModel._shutdown = () => {
  // shortcut assign
  const { state } = localModel;

  if (state.stateWatcherLoop) {
    clearInterval(state.stateWatcherLoop);
  }
};

/**
 * Creates event handlers for this ping target.
 *
 * @param {Object} pingTarget The ping target object.
 */
localModel.setupEventHandlers = (pingTarget) => {
  eventBus.on(`${pingTarget.id}-ping`, localModel.onPing);
};

/**
 * Handles a ping event.
 *
 * @param {Object} pingTarget The ping target object.
 * @param {Object} pingData The ping data object.
 */
localModel.onPing = (pingTarget, pingData) => {
  const { state } = localModel;
  const pingStore = state.stores[pingTarget.id];

  pingStore.push(pingData);

  localModel._checkLastSpike(pingTarget);

  // Retain buffer size
  if (pingStore.length > state.bufferSize) {
    pingStore.shift();
  }
};

/**
 * Checks if the last ping was a spike compared to the previous one.
 *
 * @param {Object} pingTarget Ping target object.
 * @private
 */
localModel._checkLastSpike = (pingTarget) => {
  if (pingTarget.id !== 'internet') {
    return;
  }

  const { state } = localModel;
  const pingStore = state.stores[pingTarget.id];

  const storeLength = pingStore.length;

  if (storeLength < 2) {
    return;
  }

  const lastPing = pingStore[storeLength - 1];
  const previousPing = pingStore[storeLength - 2];

  // skip when ping timeout
  if (!lastPing.ping_success && !previousPing.ping_success) {
    return;
  }
  if (lastPing.time < previousPing.time) {
    return;
  }

  const diff = lastPing.time - previousPing.time;
  const percentDiff = diff / previousPing.time;

  if (percentDiff > 0.3) {
    const neopixelMessage = {
      type: 'spike',
      percent_diff: percentDiff,
    };
    log.info('_checkLastSpit() :: Spike detected, percent: '
      + `${percentDiff.toFixed(2)}% Last Ping: ${lastPing.time}ms`
      + `Previous Ping: ${previousPing.time}ms`);
    eventBus.emit('update-neopixel', neopixelMessage);
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
  const { state } = localModel;
  const { stores, pingTargets } = state;

  // pick the first stored ping target to evaluate dataset length.
  const pingTargetSample = pingTargets[0];

  if (stores[pingTargetSample.id].length < 5) {
    // not enough samples
    return;
  }

  const newState = {};

  pingTargets.forEach((pingTarget) => {
    if (KNOWN_TARGETS.indexOf(pingTarget.id) === -1) {
      // unknown target
      return;
    }

    const data = stores[pingTarget.id].map((pingItem) => pingItem.time);

    const dataBaseline = baseline(data);

    const spikeSeverity = localModel.calculateSpike(data, dataBaseline);
    const jitterValue = localModel.calculateJitter(data, dataBaseline);
    const jitterSeverity = localModel.calculateJitterSeverity(jitterValue);

    const baselineDiff = (((dataBaseline.high / dataBaseline.average) - 1) * 100).toFixed(2);

    log.info(`cq() :: id: ${pingTarget.id} spikeSev: ${spikeSeverity}`,
      `jitterSev: ${jitterSeverity} Jitter Value: ${jitterValue.toFixed(2)}ms avg: ${dataBaseline.average.toFixed(2)}`,
      'high:', dataBaseline.high.toFixed(2), 'low:', dataBaseline.low.toFixed(2),
      `(${baselineDiff}%)`);

    const severity = Math.max(spikeSeverity, jitterSeverity);

    newState[pingTarget.id] = severity;
  });

  const neopixelMessage = {
    type: 'set_led',
    state: newState,
  };

  eventBus.emit('update-neopixel', neopixelMessage);
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
    if (pingTime === 0) {
      pingFailsFound += 1;
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
    // eslint-disable-next-line eqeqeq
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
 * @return {number} severity number.
 */
localModel.calculateJitter = (data) => {
  // percentages that set the boundaries of severities
  if (!data.length) {
    return SEV.SEV0;
  }


  const totalDifference = data.reduce((total, pingTime, index) => {
    if (index === 0) {
      return 0;
    }

    if (pingTime === 0) {
      return 0;
    }

    const diff = data[index - 1] - pingTime;
    if (diff < 0) {
      return diff * -1;
    }

    return diff;
  }, 0);

  if (totalDifference === 0) {
    return SEV.SEV0;
  }

  const jitter = totalDifference / data.length;

  return jitter;
};

/**
 * Calculates the severity based on the jitter
 *Jitter quality is quantitative:
 *
 * Jitter Level     Acceptability
 * <   1 ms      Excellent
 * <   5 ms      Extremely Good
 * <  20 ms      Very Good
 * <  50 ms      Good
 * <  80 ms      Good to Fair
 * < 100 ms      Fair
 *
 * As per: http://www.3rdechelon.net/jittercalc.asp
 *
 * @param {number} jitterValue in ms.
 * @return {SEV} Severity enum
 */
localModel.calculateJitterSeverity = (jitterValue) => {
  //
  // Adjusted for our scale:
  // SEV0 <= 20ms
  // SEV1 <= 50ms
  // SEV2 <= 80ms
  // SEV3 > 80ms
  const SEV0 = 20;
  const SEV1 = 50;
  const SEV2 = 80;

  log.debug('Jitter calculated:', jitterValue);

  if (jitterValue <= SEV0) {
    return SEV.SEV0;
  }

  if (jitterValue > SEV0 && jitterValue <= SEV1) {
    return SEV.SEV1;
  }

  if (jitterValue > SEV1 && jitterValue <= SEV2) {
    return SEV.SEV2;
  }
  if (jitterValue > SEV2) {
    return SEV.SEV3;
  }
};
