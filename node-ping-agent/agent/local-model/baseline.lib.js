/**
 * @fileoverview Calculates the baseline for a given set of values.
 */

const baseline = module.exports = {};

/**
 * Calculates the baseline of a set of numbers.
 *
 * @param {Array.<number>} data Data.
 */
baseline.baseline = (data) => {
  const totalValue = data.reduce((total, value) => {
    if (isNaN(value)) {
      return 0;
    }
    return total + value;
  }, 0);

  const response = baseline.getResponseStruct();

  if (totalValue === 0) {
    return response;
  }

  const average = totalValue / data.length;

  const totalDiff = data.reduce((total, value) => {
    return total + Math.pow(average - value, 2);
  }, 0);

  const stdDeviation = Math.sqrt(totalDiff / (data.length - 1));

  const stdError = stdDeviation / Math.sqrt(data.length);

  response.average = average;
  response.stdError = stdError * 2;
  response.high = average + response.stdError;
  response.low = average - response.stdError;

  return response;
};

/**
 * Get a new response structure object.
 *
 * @return {Object}
 */
baseline.getResponseStruct = () => {
  return {
    average: 0.0,
    high: 0.0,
    low: 0.0,
    stdError: 0.0,
  };
};
