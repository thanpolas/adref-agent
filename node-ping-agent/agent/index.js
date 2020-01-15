/**
 * Ping Agent, launches and streams ping commands.
 */

// const pingLib = require('./ping-library');

const { startPing } = require('./ping-command');

const eventBus = require('./event-bus');

const boot = async () => {
  try {
    await startPing('internet', {
      pingIp: '8.8.8.8',
    });
  } catch (ex) {
    console.error('Failed:', ex);
  }

  eventBus.on('internet-on_stdout', (message) => {
    console.log('MSG:', message);
  })

  console.log('done', response);
};

boot();

