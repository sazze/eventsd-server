/**
 * @author Craig Thayer <cthayer@sazze.com>
 * @copyright 2015 Sazze, Inc.
 */

var _ = require('lodash');
var Stats = require('sz-stats').Stats;
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Tracker() {
  EventEmitter.call(this);

  this.eventsHourlyStats = {};
  this.eventsMinutelyStats = {};
  this.eventsSentThisHour = {};
  this.eventsSentThisMinute = {};
  this.eventsSent = {};
  this.totalHourlyStats = new Stats();
  this.totalMinutelyStats = new Stats();
  this.totalSentThisHour = 0;
  this.totalSentThisMinute = 0;
  this.totalSent = 0;

  setTimeout(this.resetHourlyStats.bind(this), (60000 * 60)).unref();
  setTimeout(this.resetMinutelyStats.bind(this), 60000).unref();
}

util.inherits(Tracker, EventEmitter);

Tracker.prototype.resetHourlyStats = function () {
  _.each(this.eventsSentThisHour, function (sent, routingKey) {
    if (_.isUndefined(this.eventsHourlyStats[routingKey])) {
      this.eventsHourlyStats[routingKey] = new Stats();
    }

    this.eventsHourlyStats[routingKey].push(this.eventsSentThisHour[routingKey]);

    this.eventsSentThisHour[routingKey] = 0;
  }, this);

  this.totalHourlyStats.push(this.totalSentThisHour);
  this.totalSentThisHour = 0;

  setTimeout(this.resetHourlyStats.bind(this), (60000 * 60)).unref();

  this.emit('statsReset');
};

Tracker.prototype.resetMinutelyStats = function () {
  _.each(this.eventsSentThisMinute, function (sent, routingKey) {
    if (_.isUndefined(this.eventsMinutelyStats[routingKey])) {
      this.eventsMinutelyStats[routingKey] = new Stats();
    }

    this.eventsMinutelyStats[routingKey].push(this.eventsSentThisMinute[routingKey]);

    this.eventsSentThisMinute[routingKey] = 0;
  }, this);

  this.totalMinutelyStats.push(this.totalSentThisMinute);
  this.totalSentThisMinute = 0;

  setTimeout(this.resetMinutelyStats.bind(this), 60000).unref();

  this.emit('statsReset');
};

Tracker.prototype.updateEventStats = function (msg) {
  this.totalSent++;
  this.totalSentThisMinute++;
  this.totalSentThisHour++;
  
  var key = msg.routingKey.split('.').slice(0, 2).join('.');

  if (_.isUndefined(this.eventsSent[key])) {
    this.eventsSent[key] = 0;
    this.eventsSentThisHour[key] = 0;
    this.eventsSentThisMinute[key] = 0;
  }

  this.eventsSent[key]++;
  this.eventsSentThisHour[key]++;
  this.eventsSentThisMinute[key]++;
};

module.exports = new Tracker();