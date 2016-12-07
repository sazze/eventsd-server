
var _ = require('lodash');
var amqp = require('@sazze/amqp');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var consumer = null;

function Consumer(options) {
  EventEmitter.call(this);

  this.options = {
    exchange: {
      name: 'firehose',
      type: 'topic',
      options: {
        durable: true,
        autoDelete: false
      }
    },
    queue: {
      name: '',   // random name will be generated
      durable: false,
      exclusive: true,
      autoDelete: true
    },
    connection: {
      heartbeat: 1
    },
    channel: {
      prefetch: 20
    },
    consumeOptions: {
      noAck: true // auto ack messages
    }
  };

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(this.options, options);

  this.consumers = {}
}

util.inherits(Consumer, EventEmitter);

Consumer.prototype.consume = function (socket, data) {
  if (!_.isUndefined(this.consumers[socket.id]) && !_.isUndefined(this.consumers[socket.id].routingKeys[data.routingKey])) {
    // already listening for this routing key
    return;
  }

  if (_.isUndefined(this.consumers[socket.id])) {
    this.consumers[socket.id] = {routingKeys: {}};
  }

  if (!_.isUndefined(this.consumers[socket.id].routingKeys['#'])) {
    // already listening for this routing key
    return;
  }

  var options = _.merge({}, this.options);

  options.routingKey = data.routingKey;

  if (!_.isUndefined(data.id) && _.isString(data.id)) {
    // this consume request is hinting at sharing the event workload with other clients (by specifying an explicit id).
    // allow clients with the same id and routingKey to bind to the same amqp queue
    var queueName = data.id.replace(/\W/g, '').trim();

    if (queueName) {
      options.queue.name = 'shared-' + data.routingKey.replace(/\W/g, '') + '-' + queueName;
      options.queue.exclusive = false;
    }
  }

  this.consumers[socket.id].routingKeys[data.routingKey] = new amqp.consumer(options, handleMsg.bind(this, socket.id));

  this.consumers[socket.id].routingKeys[data.routingKey].start();
};

Consumer.prototype.stopConsume = function (socket, data) {
  if (_.isUndefined(this.consumers[socket.id])) {
    // nothing to stop
    return;
  }

  if (data.routingKey == '#') {
    // stop all consumers
    stopAll.call(this, socket);
    return;
  }

  if (data.routingKey == '##') {
    // this is a little modification we need to prevent stopAll() from looping infinitely
    data.routingKey = '#';
  }

  if (_.isUndefined(this.consumers[socket.id].routingKeys[data.routingKey])) {
    // nothing to stop
    return;
  }

  this.consumers[socket.id].routingKeys[data.routingKey].stop(function (err) {
    delete this.consumers[socket.id].routingKeys[data.routingKey];
  }.bind(this));
};

module.exports = function (options) {
  if (consumer) {
    return consumer;
  }

  consumer = new Consumer(options);

  return consumer;
};

/**
 * Private Methods
 **/

function handleMsg(socketId, dataStr) {
  this.emit('event:' + socketId, JSON.parse(dataStr));
}

/**
 * Stop all consumers linked to a socket
 *
 * @param socket
 */
function stopAll(socket) {
  if (_.isEmpty(this.consumers)) {
    return;
  }

  _.forOwn(this.consumers[socket.id].routingKeys, function (consumer, routingKey) {
    if (routingKey == '#') {
      // this must be done to prevent infinite stop loop
      routingKey = '##';
    }

    this.stopConsume(socket, {routingKey: routingKey});
  }.bind(this));
}