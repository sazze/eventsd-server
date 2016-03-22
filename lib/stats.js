/**
 * @author Craig Thayer <cthayer@sazze.com>
 */

var _ = require('lodash');
var Stats = require('@sazze/stats').Stats;
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

  this.eventsHourlyDropStats = {};
  this.eventsMinutelyDropStats = {};
  this.eventsDropThisHour = {};
  this.eventsDropThisMinute = {};
  this.eventsDrop = {};
  this.totalHourlyDropStats = new Stats();
  this.totalMinutelyDropStats = new Stats();
  this.totalDropThisHour = 0;
  this.totalDropThisMinute = 0;
  this.totalDrop = 0;

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

  _.each(this.eventsDropThisHour, function (sent, routingKey) {
    if (_.isUndefined(this.eventsHourlyDropStats[routingKey])) {
      this.eventsHourlyDropStats[routingKey] = new Stats();
    }

    this.eventsHourlyDropStats[routingKey].push(this.eventsDropThisHour[routingKey]);

    this.eventsDropThisHour[routingKey] = 0;
  }, this);

  this.totalHourlyDropStats.push(this.totalDropThisHour);
  this.totalDropThisHour = 0;

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

  _.each(this.eventsDropThisMinute, function (sent, routingKey) {
    if (_.isUndefined(this.eventsMinutelyDropStats[routingKey])) {
      this.eventsMinutelyDropStats[routingKey] = new Stats();
    }

    this.eventsMinutelyDropStats[routingKey].push(this.eventsDropThisMinute[routingKey]);

    this.eventsDropThisMinute[routingKey] = 0;
  }, this);

  this.totalMinutelyDropStats.push(this.totalDropThisMinute);
  this.totalDropThisMinute = 0;

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

Tracker.prototype.updateEventDropStats = function (msg) {
  this.totalDrop++;
  this.totalDropThisMinute++;
  this.totalDropThisHour++;
  
  var key = msg.routingKey.split('.').slice(0, 2).join('.');

  if (_.isUndefined(this.eventsDrop[key])) {
    this.eventsDrop[key] = 0;
    this.eventsDropThisHour[key] = 0;
    this.eventsDropThisMinute[key] = 0;
  }

  this.eventsDrop[key]++;
  this.eventsDropThisHour[key]++;
  this.eventsDropThisMinute[key]++;
};

Tracker.prototype.printStats = function (raw) {
  var stats = "Sent:\n" + JSON.stringify(this.totalHourlyStats.allStats(raw)) + " /hr\n" + JSON.stringify(this.totalMinutelyStats.allStats(raw)) + " /min\n";

  //TODO: list per event type stats
  //stats += "\nPer Event Stats:\n" + _.forEach(this.eventsHourlyStats);

  stats += "Drop:\n" + JSON.stringify(this.totalHourlyDropStats.allStats(raw)) + " /hr\n" + JSON.stringify(this.totalMinutelyDropStats.allStats(raw)) + " /min\n";

  return stats;
};

module.exports = new Tracker();