/**
 * Ping Agent, launches and streams ping commands.
 */

const { start } = require('./agent');

const boot = async () => {
  await start();
  console.log('done');
};

boot();
