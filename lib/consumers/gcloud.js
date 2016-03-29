
var _ = require('lodash');
var gcloud = require('gcloud');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var os = require('os');
var log = require('../log');
var path = require('path');
var EventsD = require('eventsd');

var consumer = null;

function Consumer(options) {
  EventEmitter.call(this);

  this.options = {};

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(this.options, options);

  this.consumers = {};

  this.pubsub = gcloud.pubsub(this.options);
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

  var routingKeyPattern = EventsD.getRoutingKeyRegExp(data.routingKey);

  this.consumers[socket.id].routingKeys[data.routingKey] = {subscriptions: {}};

  this.pubsub.getTopics(function (err, topics, apiResponse) {
    if (err) {
      log.error(err.stack || err.message || err);
      log.verbose(apiResponse);

      return;
    }

    log.debug(topics);

    _.forEach(topics, function (topic) {
      var topicName = path.basename(topic.name);

      // check for topic name match to routing key
      if (!routingKeyPattern.test(topicName)) {
        // this is not the topic we're looking for
        log.verbose('topic does not match routing key: (' + topicName + ' != ' + routingKeyPattern + ')');
        return;
      }

      var subOpts = {
        autoAck: true
      };

      var subscriptionName = 'subscription-' + topicName.replace(/\W+/g, '-') + '-' + os.hostname().replace(/\W+/g, '-') + '-' + process.pid + '-' + socket.id.replace(/\W+/g, '-') + '-' + (Math.random() * (100000 - 1) + 1);

      log.debug(subscriptionName);

      topic.subscribe(subscriptionName, subOpts, function (err, subscription, apiResponse) {
        if (err) {
          log.error(err.stack || err.message || err);
          log.verbose(apiResponse);

          return;
        }

        subscription.on('error', function (err) {
          log.error(err.stack || err.message || err);
        });

        subscription.on('message', handleMsg.bind(this, socket.id));

        this.consumers[socket.id].routingKeys[data.routingKey].subscriptions[topicName] = subscription;
      }.bind(this));
    }.bind(this));
  }.bind(this));
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

  if (_.isEmpty(this.consumers[socket.id].routingKeys[data.routingKey].subscriptions)) {
    // nothing to stop
    return;
  }

  _.forEach(this.consumers[socket.id].routingKeys[data.routingKey].subscriptions, function (subscription, topicName) {
    subscription.removeListener('message', handleMsg.bind(this, socket.id));
    subscription.delete(function (err, apiResponse) {
      if (err) {
        log.error(err.stack || err.message || err);
        log.verbose(apiResponse);

        return;
      }

      log.verbose('subscription for topic ' + topicName + ' deleted');
    });
  });

  delete this.consumers[socket.id].routingKeys[data.routingKey];
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

function handleMsg(socketId, msg) {
  if (_.isUndefined(msg.data)) {
    log.warn('Invalid message: ' + msg);
    return;
  }

  this.emit('event:' + socketId, JSON.parse((new Buffer(msg.data, 'base64')).toString('utf8')));
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