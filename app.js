var express = require('express');
var app = express();
var fs = require('fs');
var open = require('open');
var options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};
var serverPort = (process.env.PORT  || 4443);
var https = require('https');
var http = require('http');
var server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
var io = require('socket.io')(server);

const connectedUsersRoom = 'connectedUsers';
var roomList = {};

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
});
server.listen(serverPort, function(){
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort)
  }
});

function socketIdsInRoom(name) {
  var socketIds = io.nsps['/'].adapter.rooms[name];
  if (socketIds) {
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  } else {
    return [];
  }
}

io.on('connection', function(socket){
  console.log('connection');

  // socket.handshake.query['userId'] - the id of the user that connected that we should associate with "socket.id"
  io.to(connectedUsersRoom).emit('connectedUser', socket.handshake.query['userId'], socket.id);
  socket.join(connectedUsersRoom);

  socket.on('disconnect', function(){
    console.log('disconnect');
    if (socket.room) {
      var room = socket.room;
      io.to(room).emit('leave', socket.id);
      socket.leave(room);
    }
  });

  socket.on('join', function(name, callback){
    console.log('join', name);
    var socketIds = socketIdsInRoom(name);
    callback(socketIds);
    socket.join(name);
    socket.room = name;
  });

  socket.on('offer', function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('offer', data);
  });

  socket.on('answer', function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('answer', data);
  });

  socket.on('candidate', function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('candidate', data);
  });

  socket.on('connectionAccepted', function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('connectionAccepted', data);
  });

});
