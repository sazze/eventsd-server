
var error = require('debug')('error');
var warn = require('debug')('warn');
var log = require('debug')('info');
var debug = require('debug')('debug');
var verbose = require('debug')('verbose');

log.log = console.log.bind(console);
debug.log = console.log.bind(console);
verbose.log = console.log.bind(console);

module.exports = {
  error: error,
  warn: warn,
  log: log,
  debug: debug,
  verbose: verbose
};