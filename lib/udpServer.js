var dgram = require('dgram');
var amqp = require('sz-amqp');
var _ = require('lodash');
var log = require('./log');

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
}

UdpServer.prototype.start = function () {
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

  if (!_.isPlainObject(msg) || _.isUndefined(msg.routingKey) || !_.isString(msg.routingKey) || !msg.routingKey) {
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