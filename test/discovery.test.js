/**
 * @fileoverview Test for "get_interfaces" module.
 */

const discovery = require('../agent/local-model/discovery');

const test = async () => {
  const result = await discovery.run();

  console.log('result:', result);
};

test();
