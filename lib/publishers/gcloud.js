
var _ = require('lodash');
var gcloud = require('gcloud');

var publisher = null;

module.exports = function (options) {
  if (publisher) {
    return publisher;
  }

  if (!_.isPlainObject(options)) {
    options = {};
  }

  publisher = gcloud.pubsub(options);

  publisher.publish = function (msg, attributes, routingKey, callback) {
    if (!_.isFunction(callback)) {
      callback = _.noop();
    }

    routingKey = routingKey || this.attributes.routingKey;

    var topic = publisher.topic(routingKey);

    var message = {
      data: (new Buffer(JSON.stringify(msg))).toString('base64'),
      attributes: attributes
    };

    topic.publish(message, function (err) {
      if (err) {
        console.error(err.stack || err.message || err);
      }

      process.nextTick(callback(err));
    });
  };

  return publisher;
};