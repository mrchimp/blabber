/**
 * Blabber chat client
 *
 * http://github.com/mrchimp/blabber
 */

/**
 * This is the main interface.
 */
var BlabberClient = (function (override_options) {

    var options = {
        server: 'http://' + window.location.hostname,
        port:   80,
        selectors: {
            users_list: '#users',
            connect_btn: '.connect',
            conversation: '#conversation',
            use_sound: '#options .sound_enabled',
        },
        onConnect: function (username) {},
        onDisconnect: function () {},
        onMessage: function (username, message) {},
        onUpdateUsers: function (userlist) {},
    },
    socket,
    alert_timeout,
    window_title = document.title,
    $new_msg_sound = document.createElement('audio'),
    audioTagSupport = !!($new_msg_sound.canPlayType);

    $.extend(options, override_options);

    socket = new BlabberSocket(options.server + ':' + options.port.toString());

    if (audioTagSupport) {
        canPlayMp3 = !!$new_msg_sound.canPlayType && "" !== $new_msg_sound.canPlayType('audio/mpeg');
        canPlayOgg = !!$new_msg_sound.canPlayType && "" !== $new_msg_sound.canPlayType('audio/ogg; codecs="vorbis"');
        $('body').append($new_msg_sound);
    }

    if (canPlayMp3) {
        $new_msg_sound = $('<audio />')
        .attr({
            'id': 'new_msg_sound',
            'src': 'audio/alert.mp3'
        });
        $.get();
    } else if (canPlayOgg) {
        $new_msg_sound = $('<audio />')
        .attr({
            'id': 'new_msg_sound',
            'src': 'audio/alert.ogg'
        });
        $.get();
    }

    socket.onConnect = function (username) {
        // $(options.selectors.conversation).html('');
        $(options.selectors.connect_btn).removeClass('disconnected').addClass('connected').find('span').text('Connected');
        options.onConnect(username);
    }

    socket.onUpdateUsers = function (userlist) {
        $(options.selectors.users_list).empty();
        $.each(userlist, function (username, value) {
            $(options.selectors.users_list).append('<li><a href="#">' + username + '</a></li>');
        });
    }

    socket.onMessage = function (username, message) {
        if (username !== 'SERVER' && username !== socket.username) {
            showAlert(username + ' said something.');
            makeNoise();
        }
        appendMessage(username, message);
    }

    socket.onDisconnect = function () {
        appendMessage('SERVER', 'Disconnected');
        $(options.selectors.connect_btn).removeClass('connected').addClass('disconnected').find('span').text('Disconnected');
        options.onDisconnect();
    }

    /**
     * By MikeMestnik: http://stackoverflow.com/questions/19547008/how-to-replace-plain-urls-with-links-with-example/19708150#19708150
     * @param  {string} text The text to be searched fro URLs.
     * @return {string}      The text with URLs replaced
     */
    function linkify(text) {
        console.log('linkifying: '+text);
        var re = /(\(.*?)?\b((?:https?|ftp|file):\/\/[-a-z0-9+&@#\/%?=~_()|!:,.;]*[-a-z0-9+&@#\/%=~_()|])/ig;
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
            console.log('ping!');
            return lParens + "<a href='" + url + "'>" + url + "</a>" + rParens;
        });
    }

    /**
     * If disconnected then connect...
     */
    function toggleConnect(username) {
        if (socket.isConnected()) {
            console.log('DEBUG: toggle disconnecting');
            socket.disconnect();
        } else {
            console.log('DEBUG: toggle connecting');
            if (!username || typeof username !== 'string') {
                username = prompt('What is your name?');   
            }
            if (!username || typeof username !== 'string') {
                appendMessage('ERROR', 'You need to provide a username.');
                return false;
            }
            connect(username);
        }
    }

    function zeroPad (str, len) {
        str = str.toString();
        while (str.length < len) {
            str = '0' + str;
        }
        return str;
    }

    /**
     * Write a message to the screen
     */
    function appendMessage (username, message) {
        var currentdate = new Date(),
            datetime = currentdate.getFullYear() + "/"
                     + zeroPad(currentdate.getMonth() + 1, 2) + "/"
                     + zeroPad(currentdate.getDate(), 2) + " "
                     + zeroPad(currentdate.getHours(), 2) + ":"
                     + zeroPad(currentdate.getMinutes(), 2) + ":"
                     + zeroPad(currentdate.getSeconds(), 2);

        message = linkify(message);

        $('<p />')
            .attr('title', 'Message sent ' + datetime)
            .html('<b>' + username + ':</b> ' + message)
            .appendTo(options.selectors.conversation);
        $('body').scrollTop($('body')[0].scrollHeight);
    };

    /**
     * Send a message to the server
     */
    function sendMessage (message) {
        try {
            return socket.sendMessage(message);
        } catch (err) {
            appendMessage('ERROR', err.message + '<br>');
        }
    }

    /**
     * Connect to the server
     * @return {boolean} True if successfully connected
     */
    function connect(username) {
        appendMessage('CONNECTING', 'Please be patient...<br>');

        try {
            socket.connect(username);
        } catch (err) {
            appendMessage('ERROR', 'Could not connect: ' + err);
        }
    }

    /**
     * Disconnect from server
     * @param  {string} msg
     * @return {boolean}
     */
    function disconnect(msg) {
        if (!msg) {
            msg = 'Goodbye!'
        }
        socket.disconnect(msg);
    }

    /**
     * Flash a message in the title bar
     */
    function showAlert(message) {
        clearTimeout(alert_timeout);
        document.title = message;
        alert_timeout = window.setTimeout(function () {
            clearTimeout(this.alert_timeout);
            document.title = window_title;
        }, 3000);
    }

    /** 
     * If we're allowed & able, make a sound.
     */
    function makeNoise() {
        if (audioTagSupport && $(options.selectors.use_sound).is(':checked')) {
            $new_msg_sound.get(0).play();
        }
    }

    return {
        connect: connect,
        disconnect: disconnect,
        toggleConnect: toggleConnect,
        appendMessage: appendMessage,
        sendMessage: sendMessage,
    };
});


var BlabberSocket = (function (server_url) {

    var error,
        socket,
        username,
        onUpdateUsers = function(userlist){}, // Hook for client
        onMessage     = function(username, message){}, // Hook for client
        onConnect     = function(){}, // Hook for client
        onDisconnect  = function(){}; // Hook for client

    /**
     * Fairly intelligent
     */
    function isConnected () {
        if (!socket) { return false }
        return socket.socket.connected;
    }

    /**
     * Connect to the server
     */
    function connect (new_name) {
        if (isConnected()) { 
            error = 'Already connected.';
            return false; 
        }

        var t = this;
        username = new_name;

        if (!username || typeof username !== 'string') {
            return false;
        }

        if (socket) {
            socket = io.connect(server_url, { 'force new connection': true });
        } else {
            socket = io.connect(server_url);
        }

        socket.on('connect', function () {
            t.onConnect(username);
            socket.emit('adduser', username);
        });
        socket.on('updateusers', t.onUpdateUsers);
        socket.on('updatechat', t.onMessage);
        socket.on('disconnect', t.onDisconnect);
    };

    /**
     * Disconnect from the server
     */
    function disconnect (message) {
        socket.emit('disconnect', message);
        socket.disconnect();
    };

    /**
     * Send a message to the server
     */
    function sendMessage (message) {
        if (!isConnected()) {
            throw {
                name: 'Disconnected',
                message: 'Cannot send message: there is no connection.'
            };
            return false;
        }

        socket.emit('sendchat', message);
    };

    return {
        connect: connect,
        isConnected: isConnected,
        disconnect: disconnect,
        sendMessage: sendMessage,
    };
});