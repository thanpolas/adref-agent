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
    return total + value;
  }, 0);

  const average = totalValue / data.length;

  const totalDiff = data.reduce((total, value) => {
    return total + Math.pow(average - value, 2);
  }, 0);

  const stdDeviation = Math.sqrt(totalDiff / (data.length - 1));

  const stdError = stdDeviation / Math.sqrt(data.length);

  const stdErrorTimesTwo = stdError * 2;

  const high = average + stdErrorTimesTwo;
  const low = average - stdErrorTimesTwo;

  return {
    average,
    high,
    low,
    stdError: stdErrorTimesTwo,
  };
};
