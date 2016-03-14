
var _ = require('lodash');
var amqp = require('sz-amqp');

var publisher = null;

module.exports = function (type, options) {
  if (publisher) {
    return publisher;
  }

  if (_.isUndefined(type) || !_.isString(type)) {
    type = 'amqp';
  }

  if (!_.isPlainObject(options)) {
    options = {};
  }

  publisher = require('./publishers/' + type)(options);

  return publisher;
};