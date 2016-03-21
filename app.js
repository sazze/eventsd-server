

var _ = require('lodash');

if (_.isUndefined(process.env.DEBUG)) {
  process.env.DEBUG = 'error,warn,info';
}

var log = require('./lib/log');
var UdpServer = require('./lib/udpServer');
var WebsocketServer = require('./lib/websocketServer');

function Main(options) {
  this.options = {
    udpServer: {},
    websocketServer: {},
    publisher: {
      type: 'amqp',
      options: {}
    },
    consumer: {
      type: 'amqp',
      options: {}
    },
    publisherOnly: false,
    consumerOnly: false
  };

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(this.options, options);

  if (this.options.publisherOnly && this.options.consumerOnly) {
    // invalid configuration
    log.warn('Cannot set options.publisherOnly and options.consumerOnly to True');
    log.warn('Using defaults for options.publisherOnly and options.consumerOnly');

    this.options.publisherOnly = false;
    this.options.consumerOnly = false;
  }

  // internal use
  this.udpServer = null;
  this.publisher = null;
  this.websocketServer = null;
  this.consumer = null;
}

Main.prototype.start = function () {
  if (!this.options.consumerOnly) {
    // start the publisher
    this.publisher = require('./lib/publisher')(this.options.publisher.type, this.options.publisher.options);

    // listen for messages
    this.udpServer = new UdpServer(this.options.udpServer);

    this.udpServer.start();
  }

  if (!this.options.publisherOnly) {
    // start the consumer
    this.consumer = require('./lib/consumer')(this.options.consumer.type, this.options.consumer.options);

    // listen for clients
    this.websocketServer = new WebsocketServer(this.options.websocketServer);

    this.websocketServer.start();
  }
};

Main.prototype.stop = function () {
  if (this.udpServer) {
    this.udpServer.stop(function () {
      log.log('udp server stopped');
      this.udpServer = null;
    }.bind(this));
  }

  if (this.publisher) {
    this.publisher.close(function () {
      log.log('publisher closed');
      this.publisher = null;
    }.bind(this));
  }

  if (this.websocketServer) {
    // NOTE: the websocket server will close all consumers
    this.websocketServer.stop(function () {
      log.log('websocket server stopped');
      this.websocketServer = null;
    }.bind(this));
  }
};

module.exports = Main;