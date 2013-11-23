var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');


server.listen(80, "0.0.0.0");

// routing
app.use(express.static(__dirname + '/www'));

// usernames which are currently connected to the chat
var usernames = {};

io.sockets.on('connection', function (socket) {

    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.emit('updatechat', ent.encode(socket.username), ent.encode(data));
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(username){
        var safe_name = ent.encode(username);
        // we store the username in the socket session for this client
        socket.username = safe_name;
        // add the client's username to the global list
        usernames[username] = safe_name;
        // echo to client they've connected
        socket.emit('updatechat', 'SERVER', 'Greetings!');
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('updatechat', 'SERVER', safe_name + ' has connected');
        // update the list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
    });
    
    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
        var safe_name = ent.encode(socket.username);

        // remove the username from global usernames list
        delete usernames[safe_name];
        // update list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
        // echo globally that this client has left
        socket.broadcast.emit('updatechat', 'SERVER', safe_name + ' has disconnected');
    });
});
