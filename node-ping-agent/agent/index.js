/**
 * Ping Agent, launches and streams ping commands.
 */

const pingLib = require('./ping-library');

await pingLib({
  ping_ip: '8.8.8.8',
});

console.log('done');
