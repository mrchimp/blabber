/**
 * Blabber server.
 */

module.exports = (function (override_options) {
    'use strict';

    var express = require('express'),
        app = express(),
        http = require('http'),
        server = http.createServer(app),
        io = require('socket.io').listen(server, { log: false }),
        ent = require('ent'),
        check = require('validator').check,
        sanitize = require('validator').sanitize;

    var options = {
            server: '0.0.0.0',
            port: 80,
            static_dir: __dirname + '/www'
        },
        users = {},
        rooms = {},
        event_handlers = {},
        reserved_names = [
            'server',
            'connecting',
            'admin',
            'mod',
            'moderator',
        ];

    options = extend(options, override_options);

    function start () {
        server.listen(options.port, options.server);
        app.use(express.static(options.static_dir));
        trigger('log', {
            message: 'Server started.'
        });
    }

    /**
     * Attach an even handler
     * @return {undefined}
     */
    function on (name, handler) {
        if (typeof event_handlers[name] === 'array') {
            event_handlers[name].push(handler);
        } else {
            event_handlers[name] = [handler];
        }
    }

    /**
     * trigger an event
     * @param  {string} name   name of the event to trigger
     * @param  {object} params parameters object for handler
     * @return {undefined}
     */
    function trigger(name, params) {
        if (!event_handlers[name]) {
            return false;
        }

        for (var i = 0; i < event_handlers[name].length; i++) {
            event_handlers[name][i](params);
        }
    }

    /**
     * Extend an object with the properties of another
     * @param  {object} target The base object
     * @param  {object} source The object whose values will override that of target
     * @return {object}        The updated target object
     */
    function extend (target, source) {
        target = target || {};
        for (var prop in source) {
            if (typeof source[prop] === 'object') {
                target[prop] = extend(target[prop], source[prop]);
            } else {
                target[prop] = source[prop];
            }
        }
        return target;
    }

    /**
     * Send a list of usernames to a room.
     * @param  {string} room_name the name of the room to update
     * @return {undefined}
     */
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
            return lParens + '<a href="' + url + '" target="_blank">' + url + '</a>' + rParens;
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

    io.sockets.on('connection', function (socket) {

        function sayToRoom(author, message) {
            console.log('  '+ author + ' in ' + socket.room_name + ' says ' + message);
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

            if (typeof username !== 'string') {
                console.log('New user kicked for invalid Username: ' + username);
                socket.emit('updatechat', 'SERVER', 'Invalid username.');
                socket.disconnect();
                return false;
            }

            if (typeof room !== 'string') {
                console.log('New user kicked for invalid room: ' + room);
                socket.emit('updatechat', 'SERVER', 'Invalid room.');
                socket.disconnect();
                return false;
            }

            try {
                check(room).is(/^[a-zA-Z0-9-]+$/);
            } catch (err) {
                console.log('New user kicked room doesnt match regex: ' + room);
                socket.emit('updatechat', 'SERVER', 'Invalid characters in room name. Only letters, numbers and the dash (-) character are allowed.');
                socket.disconnect();
                return false;
            }

            username = ent.encode(username);

            if (arrayContains(username, reserved_names)) {
                console.log('New user kicked for reserved name: ' + username);
                socket.emit('updatechat', 'SERVER', 'That username is reserved.');
                socket.disconnect();
                return false;
            }

            if (users[username]) {
                console.log('New user kicked: name already taken: ' + username);
                socket.emit('updatechat', 'SERVER', 'That name is already taken.');
                socket.disconnect();
                return false;
            }

            socket.username = username;
            socket.room_name = room;

            users[username] = {
                name: username,
                socket: socket,
                room_name: room
            };

            if (typeof rooms[room] !== 'undefined') {
                rooms[room].push(users[username]);
            } else {
                rooms[room] = [users[username]];
            }

            console.log('+ ' + username + ' joined ' + room);
            sayToRoom('SERVER', username + ' has connected');
            socket.emit('updatechat', 'SERVER', 'Greetings! You are in "' + room + '" with ' + (rooms[room].length - 1) + ' other people.');

            updateUserList(room);
        });

        socket.on('sendchat', function (message) {
            if (message[0] === '/') {
                socket.emit('updatechat', ent.encode(socket.username), message);
                var action = message.split(' ')[0];
                doAction(action, message);
                return true;
            }

            message = ent.encode(message);
            message = linkify(message);
            
            // var user = users[socket.username];
            trigger('log', {
                message: 'Message sent...'
            });
            sayToRoom(socket.username, message);
        });
        
        socket.on('disconnect', function(){
            if (socket.username) {
                console.log('- ' + socket.username + ' disconnected.');
                var user = users[socket.username];
                delete users[socket.username];

                updateUserList(user.room_name);
                socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
            }
        });
    });

    return {
        start: start,
        on: on
    };
});
