
var io = require('socket.io');
var _ = require('lodash');
var log = require('./log');
var http = require('http');

function WebsocketServer(options) {
  this.options = {
    port: 8151,
    host: '',    // listen on all addresses
    transports: ['websocket']
  };

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(this.options, options);

  // internal use
  this.io = null;
  this.address = null;
  this.consumer = require('./consumer')();
}

WebsocketServer.prototype.start = function () {
  // listen for messages
  this.io = new io({transports: this.options.transports});

  this.io.use(this.auth.bind(this));

  this.io.on('error', function (err) {
    log.error(err.stack || err.message || err);
  });

  this.io.on('close', function () {
    log.log('websocket server close ' + this.address.address + ':' + this.address.port);
  }.bind(this));

  this.io.on('connection', function (socket) {
    log.log('websocket client connection <' + socket.id + '>');

    socket.on('error', function (err) {
      log.error(err.stack || err.message || err);

      try {
        socket.close();
      } catch (e) {}
    });

    socket.on('consume', consume.bind(this, socket));

    socket.on('stop', stopConsume.bind(this, socket));

    socket.on('disconnect', function () {
      log.log('websocket client closed <' + socket.id + '>');

      // stop listening for events
      this.consumer.removeListener('event:' + socket.id, msgHandler.bind(this, socket));

      stopConsume.call(this, socket, {routingKey: '#'});
    }.bind(this));

    socket.on('pause', function (data) {
      //TODO
    });

    // start listening for events
    this.consumer.on('event:' + socket.id, msgHandler.bind(this, socket));
  }.bind(this));

  this.io.listen(this.options.port);
};

WebsocketServer.prototype.stop = function (cb) {
  if (!_.isFunction(cb)) {
    cb = _.noop;
  }

  if (this.io) {
    this.io.httpServer.once('close', cb);
    this.io.close();

    return;
  }

  cb();
};

WebsocketServer.prototype.auth = function (socket, next) {
  var handshakeData = socket.request;

  // handle client authentication here
  log.debug(handshakeData);

  next();
};

module.exports = WebsocketServer;

/**
 * Private functions
 */

function consume(socket, data) {
  if (_.isUndefined(data.routingKey) || !_.isString(data.routingKey)) {
    // invalid consume message
    return;
  }

  // sanitize the routing key
  data.routingKey = sanitizeRoutingKey(data.routingKey);

  this.consumer.consume(socket, data);
}

function stopConsume(socket, data) {
  if (_.isUndefined(data.routingKey) || !_.isString(data.routingKey)) {
    // invalid consume message
    return;
  }

  // sanitize the routing key
  data.routingKey = sanitizeRoutingKey(data.routingKey);

  this.consumer.stopConsume(socket, data);
}

function msgHandler(socket, event) {
  socket.emit('event', event);
}

function sanitizeRoutingKey(routingKey) {
  return routingKey.replace(/[^-\.\w\*#]/g, '').replace(/\*+/g, '*').replace(/#.*$/g, '#');
}