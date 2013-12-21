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
    error,
    username,
    room,
    socket,
    alert_timeout,
    window_title = document.title,
    $new_msg_sound = document.createElement('audio'),
    audioTagSupport = !!($new_msg_sound.canPlayType),
    server_url;

    $.extend(options, override_options);

    server_url = options.server + ':' + options.port.toString();

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

    // Public Methods
    
    /**
     * Connect to the server
     * @return {boolean} True if successfully connected
     */
    function connect(new_name, new_room) {
        appendMessage('CONNECTING', 'Please be patient...<br>');

        if (isConnected()) { 
            error = 'Already connected.';
            return false; 
        }

        var t = this,
        username = new_name;
        room = new_room;

        if (!username || typeof username !== 'string') {
            return false;
        }

        if (socket) {
            socket = io.connect(server_url, { 'force new connection': true });
        } else {
            socket = io.connect(server_url);
        }

        socket.on('connect', function () {
            onConnect(username);
            socket.emit('adduser', username, room);
        });
        socket.on('updateusers', onUpdateUsers);
        socket.on('updatechat', onMessage);
        socket.on('disconnect', onDisconnect);
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
        socket.emit('disconnect', msg);
        socket.disconnect();
    }

    /**
     * If disconnected then connect...
     */
    function toggleConnect(new_name) {
        if (isConnected()) {
            console.log('DEBUG: Toggle disconnecting...');
            disconnect();
        } else {
            console.log('DEBUG: Toggle connecting...');
            if (!new_name || typeof new_name !== 'string') {
                console.log('DEBUG: No username given.');
                return false;
            }
            connect(username);
        }
    }

    /**
     * Send a message to the server
     */
    function sendMessage (message) {
        if (!isConnected()) {
            appendMessage('ERROR', err.message + '<br>');
        }
        socket.emit('sendchat', message);
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

    

    // Event handlers    

    function onConnect(username) {
        console.log('onConnect called');
        $(options.selectors.connect_btn).removeClass('disconnected').addClass('connected').find('span').text('Connected');
        options.onConnect(username);
    }

    function onUpdateUsers(userlist) {
        console.log('onUpdateUsers called');
        console.log(userlist);
        $(options.selectors.users_list).empty();
        $.each(userlist, function (username, value) {
            $(options.selectors.users_list).append('<li><a href="#">' + value + '</a></li>');
        });
    }

    function onMessage(username, message) {
        console.log('onMessage called');
        if (username !== 'SERVER' && username !== socket.username) {
            showAlert(username + ' said something.');
            makeNoise();
        }
        appendMessage(username, message);
    }

    function onDisconnect() {
        console.log('onDisconnect called');
        appendMessage('SERVER', 'Disconnected');
        $(options.selectors.connect_btn).removeClass('connected').addClass('disconnected').find('span').text('Disconnected');
        options.onDisconnect();0
    }


    // Helpers

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

    function zeroPad (str, len) {
        str = str.toString();
        while (str.length < len) {
            str = '0' + str;
        }
        return str;
    }

    /**
     * Fairly intelligent
     */
    function isConnected () {
        if (!socket) { return false }
        return socket.socket.connected;
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
