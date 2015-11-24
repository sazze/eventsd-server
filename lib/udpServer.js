var dgram = require('dgram');
var amqp = require('sz-amqp');
var _ = require('lodash');
var log = require('./log');
var os = require('os');

function UdpServer(options) {
  this.options = {
    port: process.env.SZ_EVENTSD_SERVER_UDP_PORT || 8150,
    host: process.env.SZ_EVENTSD_SERVER_UDP_HOST || ''    // listen on all addresses
  };

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(this.options, options);

  // internal use
  this.server = null;
  this.address = null;
  this.publisher = require('./publisher')();
  this.memcheckTimeout = null;
  this.dropEvents = false;
}

UdpServer.prototype.start = function () {
  // watch system memory
  this.memcheckTimeout = setTimeout(memCheck.bind(this), 30000);

  // listen for messages
  this.server = dgram.createSocket('udp4', messageHandler.bind(this));

  this.server.on('error', function (err) {
    log.error(err.stack || err.message || err);
  });

  this.server.on('listening', function () {
    this.address = this.server.address();

    log.log('listening on: ' + this.address.address + ':' + this.address.port);
  }.bind(this));

  this.server.on('close', function () {
    log.log('close ' + this.address.address + ':' + this.address.port);
  }.bind(this));

  this.server.bind(this.options.port, this.options.host);
};

UdpServer.prototype.stop = function (cb) {
  if (!_.isFunction(cb)) {
    cb = _.noop;
  }

  this.server.once('close', cb);

  if (this.server) {
    this.server.close();
  }

  if (this.memcheckTimeout) {
    clearTimeout(this.memcheckTimeout);
  }
};

module.exports = UdpServer;

/**
 * Private functions
 */

function messageHandler(msg, rinfo) {
  var msgStr = msg.toString();

  log.verbose(msgStr + ' <from: ' + rinfo.address + (rinfo.port ? ':' + rinfo.port : '') + '>');

  if (msg.length < 2) {
    return;
  }

  try {
    msg = JSON.parse(msgStr);
  } catch (e) {
    log.debug(e.stack || e.message || e);
    return;
  }

  if (!_.isPlainObject(msg)) {
    return;
  }

  // check for health check request
  if (msg.healthCheck) {
    // respond to health check and exit function
    var resp = JSON.stringify({status: (this.dropEvents ? 'backlogged' : 'ok')});

    try {
      this.server.send(resp, 0, resp.length, rinfo.port, rinfo.address, function (err) {
        if (err) {
          log.debug(err.stack || err.message || err);
        }
      });
    } catch (err) {
      log.debug(err.stack || err.message || err);
    }

    return;
  }

  if (_.isUndefined(msg.routingKey) || !_.isString(msg.routingKey) || !msg.routingKey) {
    return;
  }

  if (this.dropEvents) {
    // track drop stats
    if (_.isFunction(process.send)) {
      try {
        process.send({event: 'updateEventDropStats', data: msg});
      } catch (err) {
        log.debug(err.stack || err.message || err);
      }
    }

    // last ditch effort to process event
    // hope another eventsd server is not backlogged
    if (process.env.SZ_EVENTSD_HOST && process.env.SZ_EVENTSD_PORT) {
      log.verbose('resending event to eventsd');

      try {
        var sock = new dgram.createSocket('udp4');
        var message = JSON.stringify(msg);

        sock.send(message, 0, message.length, process.env.SZ_EVENTSD_PORT, process.env.SZ_EVENTSD_HOST, function (err) {
          if (err) {
            log.verbose(err.stack || err.message || err);
          }
        });
      } catch (err) {
        log.verbose(err.stack || err.message || err);
      }
    }

    return;
  }

  // track event stats
  if (_.isFunction(process.send)) {
    try {
      process.send({event: 'updateEventStats', data: msg});
    } catch (err) {
      log.debug(err.stack || err.message || err);
    }
  }

  // publish to firehose
  this.publisher.publish(msg, {contentType: 'application/json'}, msg.routingKey);
}

function memCheck() {
  var totalMem = os.totalmem();
  var freeMem = os.freemem();
  var mem = process.memoryUsage();

  var freeMemPercent = Math.ceil((freeMem / totalMem) * 100);
  var usedMemPercent = Math.ceil((mem.rss / totalMem) * 100);

  log.verbose('Memory Usage: ' + usedMemPercent + ' / ' + freeMemPercent + '   (% used / % free)');

  this.dropEvents = (freeMemPercent <= 5 && usedMemPercent > freeMemPercent);

  if (this.dropEvents) {
    log.warn('Free memory at ' + freeMemPercent + '%.  Dropping events');
  } else if (freeMem <= 5) {
    log.warn('Free system memory is low (' + freeMemPercent + '% free)');
  }

  this.memcheckTimeout = setTimeout(memCheck.bind(this), 30000);
}