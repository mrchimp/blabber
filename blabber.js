var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');


server.listen(80, "0.0.0.0");

app.use(express.static(__dirname + '/www'));

var usernames = {},
    rooms = {};

function updateUserList() {
    io.sockets.emit('updateusers', usernames);
}

io.sockets.on('connection', function (socket) {

    socket.on('sendchat', function (data) {
        io.sockets.emit('updatechat', ent.encode(socket.username), ent.encode(data));
    });

    socket.on('adduser', function(username){
        var safe_name = ent.encode(username);
        // we store the username in the socket session for this client
        socket.username = safe_name;
        usernames[username] = safe_name;
        socket.emit('updatechat', 'SERVER', 'Greetings!');
        socket.broadcast.emit('updatechat', 'SERVER', safe_name + ' has connected');
        updateUserList();
    });
    
    socket.on('disconnect', function(){
        var safe_name = ent.encode(socket.username);

        delete usernames[safe_name];
        updateUserList();
        socket.broadcast.emit('updatechat', 'SERVER', safe_name + ' has disconnected');
    });
});
