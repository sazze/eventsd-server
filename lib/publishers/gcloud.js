
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
      callback = _.noop;
    }

    routingKey = routingKey || this.attributes.routingKey;

    var topic = publisher.topic(routingKey);

    topic.exists(function (err, exists) {
      if (err) {
        console.error(err.stack || err.message || err);

        process.nextTick(function () {
          callback(err);
        });

        return;
      }

      if (exists) {
        publishMessage(topic, msg, attributes, callback);
        return;
      }

      topic.create(function (err, t, apiResponse) {
        if (err) {
          console.error(err.stack || err.message || err);

          process.nextTick(function () {
            callback(err);
          });

          return;
        }

        if (t) {
          topic = t;
        }

        publishMessage(topic, msg, attributes, callback);
      });
    });
  };

  publisher.close = function (callback) {
    if (!_.isFunction(callback)) {
      callback = _.noop;
    }

    callback();
  };

  return publisher;
};

function publishMessage(topic, msg, attributes, callback) {
  var message = {
    data: (new Buffer(JSON.stringify(msg), 'utf8')).toString('base64'),
    attributes: attributes
  };

  //console.log(message);

  topic.publish(message, function (err) {
    if (err) {
      console.log(err.stack || err.message || err);
    }

    process.nextTick(function () {
      callback(err);
    });
  });
}