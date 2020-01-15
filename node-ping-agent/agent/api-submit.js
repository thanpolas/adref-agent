/**
 * @fileoverview Module responsible for submitting to the API.
 */

const axios = require('axios');

const globals = require('./globals');

const apiSubmit = module.exports = {};

/**
 * Submit a dataset to the API endpoint.
 *
 * This is a fire and forget function, needs to handle own async and errors.
 *
 * @param {Array} pingTargets The ping targets.
 * @param {Object} copyData The data to submit.
 */
apiSubmit.submit = (pingTargets, copyData) => {

  const payload = {
    token: globals.token,
    targets: copyData,
  };

  console.log('PAYLOAD:\n', JSON.stringify(payload));
};
