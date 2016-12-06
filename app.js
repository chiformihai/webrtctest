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
const socketEvents = require('./socketEvents')(io);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
server.listen(serverPort, function(){
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort)
  }
});
