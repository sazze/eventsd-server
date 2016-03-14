/**
 * @author Craig Thayer <cthayer@sazze.com>
 */

var stats = require('./stats');
var _ = require('lodash');
var log = require('./log');

var master = null;

/**
 * Any message sent to the master will be broadcast to all workers
 *
 * @param message
 * @param handle
 * @param worker
 */
module.exports = function (message, handle, worker) {
  if (!master) {
    master = this;
    process.nextTick(initialize);
  }

  if (_.isUndefined(message.event) || !_.isString(message.event) || _.isUndefined(message.data)) {
    // not a proper formatted event
    console.log('[node-pm] received invalid event message: ' + JSON.stringify(message));
    return;
  }

  switch (message.event) {
    case 'updateEventStats':
      updateEventStats.call(this, message.data);
      break;

    case 'updateEventDropStats':
      updateEventDropStats.call(this, message.data);
      break;

    case 'printStats':
      printStats.call(this);
      break;

    default:
      // not a supported event
      break;
  }
};

function updateEventStats(msg) {
  if (_.isUndefined(msg.routingKey)) {
    return;
  }

  stats.updateEventStats(msg);
}

function updateEventDropStats(msg) {
  if (_.isUndefined(msg.routingKey)) {
    return;
  }

  stats.updateEventDropStats(msg);
}

function printStats() {
  log.debug('printing stats');
  log.log(stats.printStats());
}

function initialize() {
  if (!master) {
    return;
  }

  stats.on('statsReset', printStats.bind(master));
}