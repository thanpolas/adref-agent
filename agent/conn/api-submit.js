/**
 * @fileoverview Module responsible for submitting to the API.
 */

const axios = require('axios');

const globals = require('../core/globals');
const log = require('../utils/logger');

const apiSubmit = module.exports = {};

/**
 * Submit a dataset to the API endpoint.
 *
 * This is a fire and forget function, needs to handle own async and errors.
 *
 * @param {Array} pingTargets The ping targets.
 * @param {Object} copyData The data to submit.
 */
apiSubmit.submit = async (pingTargets, copyData) => {

  const payload = {
    token: globals.token,
    targets: copyData,
  };

  // console.log('PAYLOAD:', JSON.stringify(payload));

  const response = await axios.post(globals.apiEndpoint, payload)
    .catch(apiSubmit.errorHandler);

  log.info('apiSubmit() :: Submitted API Payload, response:', response.data);
};

/**
 * The Error handler for the API submission.
 *
 * @param {Error} error The error object.
 */
apiSubmit.errorHandler = (error) => {
  console.error('Error:', error);
};
