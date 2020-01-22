/**
 * @fileoverview Tests network-info module.
 */

const netInfo = require('../agent/network/network-info');

async function testNet() {
  console.log(await netInfo.getInfo());
}

testNet();

