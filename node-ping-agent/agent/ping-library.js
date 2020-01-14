/**
 * @fileOverview Ping library.
 */
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var Promise = require('bluebird');
var appError = require('nodeon-error');
var log = require('./logger');
var config = require('config');

var WorkerBase = require('./worker-base');
var QueueService = require('../services/queue.service');
var ScanEnt = require('../entities/scan/scan.ent');
var PubSub = require('../services/pubsub.service');
var pubsub = PubSub.getInstance();
var globals = require('../core/globals');

/**
 * Check Latency for provided IP.
 *
 * @extends {app.worker.WorkerBase}
 * @constructor
 */
var Latency = module.exports = WorkerBase.extend(function() {
  /** @type {?Object} Incoming job data */
  this.data = null;

  /** @type {cc.service.Queue} The queue service singleton */
  this.queueService = QueueService.getInstance();

  /** @type {cc.entities.Scan} The scan entity singleton */
  this.scanEnt = ScanEnt.getInstance();

  this.response = {
    server: config.worker.serverName,
    pingParams: {
      wait: NaN,
      waitTime: NaN,
      timeout: NaN,
      packets: NaN,
    },
    ip: '',
    scanRealId: '',
    latencyResults: {
      rawOutput: '',
      packetsSent: 0,
      packetsReceived: 0,
      min: 0,
      avg: 0,
      max: 0,
      stddev: 0,
      mdev: 0,
      time: 0,
      // Packet Loss in a string 0%
      packetLoss: '',
      // Packet Loss in Float
      packetLossFlt: 0,
    },
  };
});

const _getResponse = function () {
  pingParams: {
    wait: NaN,
    waitTime: NaN,
    timeout: NaN,
    packets: NaN,
  },
  ping_ip: '',
  scanRealId: '',
  latencyResults: {
    rawOutput: '',
    packetsSent: 0,
    packetsReceived: 0,
    min: 0,
    avg: 0,
    max: 0,
    stddev: 0,
    mdev: 0,
    time: 0,
    // Packet Loss in a string 0%
    packetLoss: '',
    // Packet Loss in Float
    packetLossFlt: 0,
  },
};

Latency.use = WorkerBase.useBase(Latency);

/**
 * The worker process.
 *
 * @param {Object} data Data specific for this job.
 *   @param {string} ping_ip The IP to ping.
 *   @param {string} scanRealId The scan item mongo id.
 *   @param {number=} wait How long to wait between pings in secongs, default 0.5.
 *   @param {number=} waitTime How long to wait in milliseconds for each packet until it times out, default 0.5.
 *   @param {number=} packets How many packets to send, default 5.
 *   @param {number=} timeout Ultimate timeout in seconds, default 8.
 * @return {Promise} A Promise.
 */
const run = async function(data) {
  response = _getResponse();
  response.ping_ip = data.ping_ip;
  response.pingParams.wait = data.wait || 0.5;
  response.pingParams.waitTime = data.waitTime || 2500;
  response.pingParams.packets = data.packets || 300;
  response.pingParams.timeout = data.timeout || 4;


  const pingCommand = preparePingCommand(data.ip);


    .bind(this)
    .then(this.invokePing)
    .then(this.processPingResults)
    .then(this.savePing)
    .then(function() {
      log.finer('run() :: Latency check for IP:', data.ip, 'complete!, avg:',
        this.response.latencyResults.avg,
        'packet loss:', this.response.latencyResults.packetLoss);
    })
    .then(function() {
      this.publishPing(true);
    })
    .catch(function(err) {
      log.warn('run() :: Job failed:', err);
      this.publishPing(false);
    });
    // complete job, no time for second try
});

/**
 * Invoke the Ping command.
 *
 * @param {string} ping_ip The IP to ping.
 * @return {Promise(string)} A promise with the ping's parameters.
 */
const preparePingCommand = function(ping_ip) {
  const pingArgs = [
    '-c ' + this.response.pingParams.packets, // number of pings
    '-i ' + this.response.pingParams.wait, // time to wait between pings in seconds
  ];

  // in OSX there's a slight difference in the ping options
  if (globals.isOsx) {
    // ultimate timeout
    pingArgs.push('-t ' + this.response.pingParams.timeout);
    // Per packet timeout
    pingArgs.push('-W ' + this.response.pingParams.waitTime);
  } else {
    // ultimate timeout
    pingArgs.push('-w ' + this.response.pingParams.timeout);
    // Per packet timeout
    pingArgs.push('-W ' + this.response.pingParams.waitTime / 1000);
  }

  pingArgs = pingArgs.concat([
    // Numeric output only.
    // No attempt will be made to lookup symbolic names for host addresses.
    '-n',
    ip,
  ]);

  return pingArgs;
};

/**
 * Invoke the Ping command.
 *
 * @param {Array} pingArgs Arguments for ping command.
 * @return {Promise(string)} A promise with the ping's output.
 */
const invokePing = async function(pingArgs) {
  return new Promise(function(resolve, reject) {
    var rawOutput = [];

    log.finer('invokePing() :: Invoking ping with args:', pingArgs);

    var child = spawn('ping', pingArgs);

    child.stdout.on('data', function(buffer) {
      rawOutput.push(buffer.toString());
    });

    child.stderr.on('data', function(buffer) {
      log.finer('invokePing() :: stderr data:', buffer.toString());
    });
    child.on('error', function(err) {
      log.warn('invokePing() Error:', err);
      reject(err);
    });
    child.on('close', function(code, signal) {
      if (code) {
        if (code === 1) {
          log.fine('invokePing() :: exited with code 1, will process. Raw Output:',
            rawOutput);
          resolve(rawOutput.join(''));
          return;
        }
        log.warn('invokePing() :: ping exited with code ', code);
        log.fine('rawOutput:', rawOutput);
        log.fine('signal:', signal);
        reject(new appError.Error('ping exited with code ' + code));
      } else if (signal) {
        log.warn('invokePing() :: ping exited with signal ', signal);
        log.fine('rawOutput:', rawOutput);
        reject(new appError.Error('ping exited with signal ' + signal));
      } else {
        resolve(rawOutput.join(''));
      }
    });
  });
};

/**
 * Invoke ping using Exec.
 *
 * @param {Array} pingArgs Array of ping arguments
 * @return {Promise(string)} A promise with the ping results.
 */
Latency.prototype.invokePingExec = function(pingArgs) {
  return new Promise(function(resolve, reject) {
    var cmd = 'ping ' + pingArgs.join(' ');
    exec(cmd, function(error, stdout, stderr) {
      if (error) {
        log.warn('invokePingExec() :: Error:', error);
        log.fine('invokePingExec() :: Error stderr:', stderr);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

/**
 * Process the ping results.
 *
 * @param {string} results Raw Ping Results.
 */
Latency.prototype.processPingResults = function(results) {

  this.response.latencyResults.rawOutput = results;

  // Legacy regexes
  // up to 27 Apr 2015
  // var regex = /packets\sreceived,\s([\d]+\.[\d]+\%)\spacket\sloss\nround-trip\smin\/avg\/max\/stddev\ \=\ ([\d]+\.[\d]+)\/([\d]+\.[\d]+)\/([\d]+\.[\d]+)\/([\d]+\.[\d]+)/;

  // up to 14 Jun 2015
  // var regex = /\sreceived,\s([\d]+.*\%)\spacket\sloss.*\n.+\smin\/avg\/max\/[\w]+\ \=\ ([\d]+\.[\d]+)\/([\d]+\.[\d]+)\/([\d]+\.[\d]+)\/([\d]+\.[\d]+)/;

  var regex = /([\d]+)\spackets\stransmitted\,\s([\d]+)[\s\w]*\sreceived,\s([\d]+.*\%)\spacket\sloss(\,\stime\s([\d]+)ms)?(\n.+\smin\/avg\/max\/[\w]+\ \=\ ([\d]+\.[\d]+)\/([\d]+\.[\d]+)\/([\d]+\.[\d]+)\/([\d]+\.[\d]+))?/;

  var extract = regex.exec(results);
  if (!extract || extract.length < 3) {
    log.warn('processPingResults() :: Could not extract ping info from result.',
      'Raw Result:\n', results);
    var err = new appError.Error('Bad ping output');
    throw err;
  }

  // globals.isOsx

  this.response.latencyResults.packetsSent = parseInt(extract[1], 10);
  this.response.latencyResults.packetsReceived = parseInt(extract[2], 10);
  this.response.latencyResults.packetLoss = extract[3];
  // extract the bare float '0.0' from string '0.0%'
  this.response.latencyResults.packetLossFlt = parseFloat(extract[3].match(/([\d]?[\.]?[\d]+)/));

  this.response.latencyResults.min = parseFloat(extract[7]) || 0;
  this.response.latencyResults.avg = parseFloat(extract[8]) || 0;
  this.response.latencyResults.max = parseFloat(extract[9]) || 0;

  if (globals.isOsx) {
    // OSX Result extract
    this.response.latencyResults.stddev = parseFloat(extract[10]) || 0;
  } else {
    // Linux Result extract
    this.response.latencyResults.time = parseFloat(extract[5]) || 0;
    this.response.latencyResults.mdev = parseFloat(extract[10]) || 0;
  }
};

/**
 * Save the latency job results.
 *
 * @return {Promise} A Promise.
 */
Latency.prototype.savePing = Promise.method(function () {
  log.fine('run() :: Saving ping result with real id:', this.response.scanRealId);

  return this.scanEnt.pushLatency(this.response)
    .catch(function (err) {
      if (err.name === 'CastError' && err.path === '_id')  {
        log.fine('savePing() :: Not proper id was used for latency save. Id:',
          err.value);
      } else {
        log.warn('savePing() :: Failed to save. Error:', err);
      }

      throw err;
    });
});

/**
 * Publish the finish message to pubsub. Testing purposes.
 *
 * @param {boolean} status Failed or succeeded.
 */
Latency.prototype.publishPing = function(status) {
  pubsub.pub(PubSub.Channel.WORKER_LATENCY + '-' + this.data.scanRealId, {
    status: status,
    scanRealId: this.data.scanRealId,
    response: this.response,
  });
};
