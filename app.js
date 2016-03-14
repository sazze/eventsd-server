

var _ = require('lodash');

if (_.isUndefined(process.env.DEBUG)) {
  process.env.DEBUG = 'error,warn,info';
}

var log = require('./lib/log');
var UdpServer = require('./lib/udpServer');

function Main(options) {
  this.options = {
    udpServer: {},
    publisher: {
      type: 'amqp',
      options: {}
    }
  };

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(this.options, options);

  // internal use
  this.udpServer = null;
  this.publisher = null;
}

Main.prototype.start = function () {
  // start the publisher
  this.publisher = require('./lib/publisher')(this.options.publisher.type, this.options.publisher.options);

  // listen for messages
  this.udpServer = new UdpServer(this.options.udpServer);

  this.udpServer.start();
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
};

module.exports = Main;