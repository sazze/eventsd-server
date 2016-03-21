
var client = require('socket.io-client');

var options = {
  rememberUpgrade: true,
  transports: ['websocket']
};

var socket = client('ws://127.0.0.1:8151', options);

socket.on('connect', function () {
  console.log('socket open');

  var msg = {routingKey: '#'};

  console.log('calling consume: ' + JSON.stringify(msg));

  socket.emit('consume', msg);
});

socket.on('reconnect', function () {
  console.log('socket reconnected');
});

socket.on('reconnect_attempt', function () {
  console.log('socket attempting reconnect');
});

socket.on('reconnect_error', function (err) {
  console.log('reconnect error');
  console.log(err.stack || err.message || err);
});

socket.on('reconnect_failed', function () {
  console.log('failed to reconnect');
});

socket.on('event', function (data) {
  console.log(data);
});

socket.on('close', function () {
  console.log('socket close');
});

socket.on('disconnect', function () {
  console.log('socket disconnect');
});

socket.on('error', function (err) {
  console.error(err.stack || err.message || err);
});

process.on('SIGINT', function () {
  if (socket.id) {
    var msg = {routingKey: '#'};

    socket.emit('stop', msg);

    socket.close();
  }
});