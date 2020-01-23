/**
 * @fileoverview Test auto-update lib.
 */

const autoUpdate = require('../agent/auto-update/auto-update');

async function test() {
  await autoUpdate.init(true);
}

test();
