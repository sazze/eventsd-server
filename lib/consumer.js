
var _ = require('lodash');

var consumer = null;

module.exports = function (type, options) {
  if (consumer) {
    return consumer;
  }

  if (_.isUndefined(type) || !_.isString(type)) {
    type = 'amqp';
  }

  if (!_.isPlainObject(options)) {
    options = {};
  }

  consumer = require('./consumers/' + type)(options);

  return consumer;
};