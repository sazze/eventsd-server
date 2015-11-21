
var _ = require('lodash');
var amqp = require('sz-amqp');

var publisher = null;

module.exports = function (options) {
  if (publisher) {
    return publisher;
  }

  var opts = {
    exchange: 'firehose',
    connection: {
      heartbeat: 1
    },
    confirmChannel: false
  };

  if (!_.isPlainObject(options)) {
    options = {};
  }

  _.merge(opts, options);

  publisher = new amqp.publisher(opts);

  publisher.connect();

  return publisher;
};