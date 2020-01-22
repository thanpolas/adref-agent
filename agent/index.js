/**
 * Ping Agent, launches and streams ping commands.
 */

const { start } = require('./core/agent');

const boot = async () => {
  await start();
};

boot();
