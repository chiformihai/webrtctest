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

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
server.listen(serverPort, function(){
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

  io.to(connectedUsersRoom).emit('connectedUser', socket.handshake.query['userId'], socket.id);
  socket.join(connectedUsersRoom);

  socket.on('disconnect', function(){
    io.to(connectedUsersRoom).emit('disconnectedUser', socket.handshake.query['userId'], socket.id);
    socket.leave(connectedUsersRoom);

    var rooms = io.nsps['/'].adapter.rooms;
    for (const room in rooms) {
      if (room !== connectedUsersRoom) {
        io.to(room).emit('leave', socket.id);
        socket.leave(room);
      }
    }
  });

  socket.on('join', function(name, callback){
    var socketIds = socketIdsInRoom(name);
    callback(socketIds);
    socket.join(name);
  });

  socket.on('initiateCall', function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('callRequest', data);
  });

  socket.on('callResponse', function(accepted, socketId, roomId) {
    if (accepted) {
      io.sockets.connected[socketId].join(roomId);
      socket.join(roomId);
    }
    var data = { accepted: accepted, socketId: socket.id};
    io.sockets.connected[socketId].emit('callResponse', data);
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
