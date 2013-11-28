/**
 * Blabber chat client
 *
 * http://github.com/mrchimp/blabber
 */
var Blabber = (function (overide_options) {

    var options = {
        onConnectCallback: function () {},
        onDisconnectCallback: function () {},
        onMessageCallback: function () {},
        selectors: {
            users_list: '#users',
            connect_btn: '.connect',
            conversation: '#conversation',
            use_sound: '#options .sound_enabled',
        }
    };

    $.extend(options, overide_options);

    var socket,
        alert_timeout,
        connected       = false,
        window_title    = document.title,
        $new_msg_sound  = document.createElement('audio'),
        audioTagSupport = !!($new_msg_sound.canPlayType);

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

    function zeroPad (str, len) {
        str = str.toString();
        while (str.length < len) {
            str = '0' + str;
        }
        return str;
    }

    /**
     * Flash a message in the title bar
     */
    function showAlert(message) {
        clearTimeout(alert_timeout);
        document.title = message;
        alert_timeout = window.setTimeout(function () {
            clearTimeout(this.alert_timeout);
            document.title = self.window_title;
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

    /**
     * Connect to the server
     */
    function connect (provided_username) {
        var blab = this;
        
        connected = true;
        this.socket = io.connect('http://' + window.location.hostname + ':80');
        this.socket.on('updatechat', function (username, message) {
            blab.appendMessage(username, message);
            
            if (username !== 'SERVER' && username !== blab.current_username) {
                showAlert(username + ' said something.');
                makeNoise();
            }

            options.onMessageCallback(username, message);
        });

        this.socket.on('connect', function () {
            if (!provided_username) {
                blab.current_username = prompt("What's your name?");
            } else {
                blab.current_username = provided_username;
            }
            blab.socket.emit('adduser', blab.current_username);
            $('#conversation').html('');
            $(options.selectors.connect_btn).removeClass('disconnected').addClass('connected');
            options.onConnectCallback();
        });

        this.socket.on('updateusers', function (data) {
            $(options.users_list_selector).empty();
            $.each(data, function (key, value) {
                $(options.users_list_selector).append('<li><a href="#">' + key + '</a></li>');
            });
        });
        
        this.socket.on('disconnect', function () {
            blab.connected = false;
            $(options.connect_btn_selector).removeClass('connected').addClass('disconnected');
            blab.options.onDisconnectCallback();
        });
    };

    /**
     * Disconnect from the server
     */
    function disconnect () {
        socket.emit('disconnect', 'Goodbye!');
        options.onDisconnectCallback();
    };

    /**
     * If disconnected then connect...
     */
    function toggleConnect() {
        if (connected === true) {
            console.log('toggle - connecting');
            appendMessage('CONNECTING', 'Please be patient...<br>');
            connect();
        } else {
            console.log('toggle - disconnecting');
            disconnect();
        }
    }

    function appendMessage (username, message) {
        var currentdate = new Date(),
            datetime = currentdate.getFullYear() + "/"
                     + zeroPad(currentdate.getMonth() + 1, 2) + "/"
                     + zeroPad(currentdate.getDate(), 2) + " "
                     + zeroPad(currentdate.getHours(), 2) + ":"
                     + zeroPad(currentdate.getMinutes(), 2) + ":"
                     + zeroPad(currentdate.getSeconds(), 2);

        $('#conversation').append('<span title="Message sent ' + datetime + '"><b>' + username + ':</b> ' + message + '</span><br>');
        $('body').scrollTop($("body")[0].scrollHeight);
    };

    function sendMessage (message) {
        if (connected !== true) {
            appendMessage('ERROR', 'Cant send message - disconnected.<br>');
            return false;
        }

        socket.emit('sendchat', message);
    };

    return {
        connect: connect,
        disconnect: disconnect,
        appendMessage: appendMessage,
        sendMessage: sendMessage,
        toggleConnect: toggleConnect
    };
});