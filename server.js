/**
 * Blabber server.
 */

var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

var users = {},
    rooms = {},
    reserved_names = [
        'server',
        'connecting',
        'admin',
        'mod',
        'moderator',
    ];

function updateUserList(room_name) {
    var usernames = [];
    for (var x = 0; x < rooms[room_name].length; x++) {
        usernames.push(rooms[room_name][x].name);
    }
    for (var i = 0; i < rooms[room_name].length; i++) {
        rooms[room_name][i].socket.emit('updateusers', usernames);
    }
}

/**
 * By MikeMestnik: http://stackoverflow.com/questions/19547008/how-to-replace-plain-urls-with-links-with-example/19708150#19708150
 * Edited to work with escaped HTML entities
 * @param  {string} text The text to be searched fro URLs.
 * @return {string}      The text with URLs replaced
 */
function linkify(text) {
    var re = /(\(.*?)?\b((?:https?|ftp|file)&colon;&sol;&sol;[-a-z0-9+&@#\/%?=~_()|!:,.;]*[-a-z0-9+&@#\/%=~_()|])/ig;
    return text.replace(re, function(match, lParens, url) {
        var rParens = '';
        lParens = lParens || '';

        // Try to strip the same number of right parens from url
        // as there are left parens.  Here, lParenCounter must be
        // a RegExp object.  You cannot use a literal
        //     while (/\(/g.exec(lParens)) { ... }
        // because an object is needed to store the lastIndex state.
        var lParenCounter = /\(/g;
        while (lParenCounter.exec(lParens)) {
            var m;
            // We want m[1] to be greedy, unless a period precedes the
            // right parenthesis.  These tests cannot be simplified as
            //     /(.*)(\.?\).*)/.exec(url)
            // because if (.*) is greedy then \.? never gets a chance.
            if (m = /(.*)(\.\).*)/.exec(url) ||
                    /(.*)(\).*)/.exec(url)) {
                url = m[1];
                rParens = m[2] + rParens;
            }
        }
        return lParens + "<a href='" + url + "' target=\"_blank\">" + url + "</a>" + rParens;
    });
}

/**
 * Search for a string in an array
 * @param  {string} needle      the string to search for
 * @param  {array}  arrhaystack the array to search
 * @return {boolean}             true if needle is found
 */
function arrayContains(needle, arrhaystack) {
    return (arrhaystack.indexOf(needle) > -1);
}


server.listen(80, "0.0.0.0");

app.use(express.static(__dirname + '/www'));

io.sockets.on('connection', function (socket) {

    function sayToRoom(author, message) {
        for (var i = 0; i < rooms[socket.room_name].length; i++) {
            rooms[socket.room_name][i].socket.emit('updatechat', author, message);
        }
    }

    function doAction(action, message) {
        switch (action) {
            case '/help':
                socket.emit('updatechat', 'SERVER', 'Are you having problems?');
                break;
            default:
                socket.emit('updatechat', 'SERVER', ent.encode(action)+' is not a command.');
        }
    }

    socket.on('adduser', function(username, room){

        if (!username || typeof username !== 'string') {
            console.log('Invalid Username: '+username);
            socket.emit('updatechat', 'SERVER', 'Invalid username.');
            socket.disconnect();
            return false;
        }

        if (!room || typeof room !== 'string') {
            console.log('Invalid room: '+room);
            socket.emit('updatechat', 'SERVER', 'Invalid room.');
            socket.disconnect();
            return false;
        }

        var safe_name = ent.encode(username);
        var safe_room = ent.encode(room);

        if (arrayContains(safe_name, reserved_names)) {
            console.log('Reserved bane: '+username);
            socket.emit('updatechat', 'SERVER', 'That username is reserved.');
            socket.disconnect();
            return false;
        }

        if (users[safe_name]) {
            socket.emit('updatechat', 'SERVER', 'That name is already taken.');
            socket.disconnect();
            return false;
        }

        socket.username = safe_name;
        socket.room_name = safe_room;

        users[safe_name] = {
            name: safe_name,
            socket: socket,
            room_name: room
        };

        if (typeof rooms[room] !== 'undefined') {
            rooms[room].push(users[safe_name]);
        } else {
            rooms[room] = [users[safe_name]];
        }

        sayToRoom('SERVER', safe_name + ' has connected');
        socket.emit('updatechat', 'SERVER', 'Greetings! You are in this room: '+room);

        updateUserList(room);
    });

    socket.on('sendchat', function (message) {
        if (message[0] === '/') {
            socket.emit('updatechat', ent.encode(socket.username), message);
            var action = message.split(' ')[0];
            doAction(action, message);
            return true;
        }
        message = ent.encode(message)
        message = linkify(message);
        // io.sockets.emit('updatechat', ent.encode(socket.username), message);
        
        var user = users[socket.username];

        for (var i = 0; i < rooms[user.room_name].length; i++) {
            rooms[user.room_name][i].socket.emit('updatechat', ent.encode(socket.username), message);
        }
    });
    
    socket.on('disconnect', function(){
        if (socket.username) {
            var user = users[socket.username];
            delete users[socket.username];

            updateUserList(user.room_name);
            socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        }
    });
});
