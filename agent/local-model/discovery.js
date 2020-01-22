/**
 * @fileoverview Discover the local interfaces and IPs.
 */

const os = require('os');

const globals = require('../core/globals');

const discovery = module.exports = {};

discovery.run = async () => {
  const ifaces = os.networkInterfaces();

  if (globals.isOsx) {
    return discovery.runOsx(ifaces);
  }

  return discovery.runLinux(ifaces);
};

discovery.runOsx = (ifaces) => {
  const response = discovery.getResponse();
  if (ifaces.en0) {
    response.hasWifi = true;
    ifaces.en0.forEach((iface) => {
      if (iface.family === 'IPv4') {
        response.wifi.ipv4 = iface.address;
      }
    });
  }

  return response;
};

discovery.runLinux = (ifaces) => {
  const response = discovery.getResponse();

  if (ifaces.eth0) {
    response.hasEth = true;
    ifaces.eth0.forEach((iface) => {
      if (iface.family === 'IPv4') {
        response.eth.ipv4 = iface.address;
      }
    });
  }

  if (ifaces.wlan0) {
    response.hasWifi = true;
    ifaces.wlan0.forEach((iface) => {
      if (iface.family === 'IPv4') {
        response.wifi.ipv4 = iface.address;
      }
    });
  }

  return response;
};

discovery.getResponse = () => {
  return {
    hasWifi: false,
    hasEth: false,
    target_local_ip: '',
    target_gateway: '',
    wifi: {
      ipv4: '',
      ipv6: '',
    },
    eth: {
      ipv4: '',
      ipv6: '',
    }
  };
};
