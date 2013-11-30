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

io.sockets.on('connection', function (socket) {

    socket.on('sendchat', function (message) {
        message = ent.encode(message)
        message = linkify(message);
        io.sockets.emit('updatechat', ent.encode(socket.username), message);
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
