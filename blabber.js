var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    check = require('validator').check,
    sanitize = require('validator').sanitize;

server.listen(8080, "0.0.0.0");

// routing
app.use(express.static(__dirname + '/www'));

// usernames which are currently connected to the chat
var usernames = {},
    socket_map = {};

io.sockets.on('connection', function (socket) {

    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        // sanitize user input
        data = sanitize(data).xss();
    
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.emit('updatechat', socket.username, data);
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function (username) {
        // sanitize username
        username = sanitize(username).xss();
        // map username to socket id
        socket_map[username] = socket.id;
        // we store the username in the socket session for this client
        socket.username = username;
        // add the client's username to the global list
        usernames[username] = username;
        // echo to client they've connected
        socket.emit('updatechat', 'SERVER', 'Greetings! ' + usernames.length + ' users online.');
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
        // update the list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
    });
    
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        // remove the username from global usernames list
        delete usernames[socket.username];
        // update list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
        // echo globally that this client has left
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    });
    
    socket.on('getuserlist', function () {
        socket.emit('refresh_usernames', usernames);
    });
    
    socket.on('pm', function (username, message) {
        var recipient = socket_map[username];
        io.sockets.socket(recipient).emit('updatechat', 'PM', message);
    });
});