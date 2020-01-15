/**
 * Ping Agent, launches and streams ping commands.
 */

const pingLib = require('./ping-library');

const boot = async () => {
  await pingLib.run({
    ping_ip: '8.8.8.8',
  });

  console.log('done');
};

boot();

