/**
 * Blabber chat client
 *
 * http://github.com/mrchimp/blabber
 */
var BlabberClient = (function (override_options) {
    var options = {
        server: 'http://' + window.location.hostname,
        port: 80,
        selectors: {
            users_list: '#users',
            connect_btn: '.connect',
            conversation: '#conversation',
            use_sound: '#settings .sound_enabled',
            use_voice_output: '#settings .voice_output_enabled',
            use_voice_input: '#settings .voice_input_enabled',
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
    audio_supported = !!($new_msg_sound.canPlayType),
    voice_supported = 'speechSynthesis' in window,
    voices,
    server_url;

    var SoundSettings = Backbone.Model.extend({
        defaults: {
            voice_in_enabled: false,
            voice_out_enabled: false,
            sound_enabled: false,
            voice_in_available: true,
            voice_out_available: true,
            voice_in_class: '',
            voice_out_class: ''
        },
        initialize: function () {
            this.on('change:sound_enabled', this.onChangeSound, this);
            this.on('change:voice_in_available', this.updateClasses, this);
            this.on('change:voice_in_enabled', this.updateClasses, this);
            this.on('change:voice_out_available', this.updateClasses, this);
            this.on('change:voice_out_enabled', this.updateClasses, this);
            this.set('voice_in_available', !!annyang);
            this.set('voice_out_available', 'speechSynthesis' in window);
        },
        onChangeSound: function (model, sound_enabled) {
            console.log('sound enabled: ', sound_enabled);
        },
        updateClasses: function (mode, voice_in_enabled) {
            this.set('voice_in_class', (this.get('voice_in_enabled') ? 'enabled' : 'disabled') + ' ' + (this.get('voice_in_available') ? 'available' : 'unavailable'));
            this.set('voice_out_class', (this.get('voice_out_enabled') ? 'enabled' : 'disabled') + ' ' + (this.get('voice_out_available') ? 'available' : 'unavailable'));
        }
    });

    var SoundSettingsView = Backbone.View.extend({
        tagName: 'div',
        className: 'settings-form',
        template: _.template($('#sound-settings-modal-template').html()),
        events: {
            'click .setting-voice-out': 'onToggleVoiceOutEnabled',
            'click .setting-voice-in': 'onToggleVoiceInEnabled'
        },
        initialize: function () {
            this.listenTo(this.model, "change", this.render);
        },
        render: function () {
            console.debug('Rendering settings view');
            this.$el.html(this.template(this.model.attributes));
            return this;
        },
        onToggleVoiceOutEnabled: function() {
            this.model.set('voice_out_enabled', !this.model.get('voice_out_enabled'));
        },
        onToggleVoiceInEnabled: function() {
            this.model.set('voice_in_enabled', !this.model.get('voice_in_enabled'));
        }
    });

    var sound_settings = new SoundSettings(),
    sound_settings_view = new SoundSettingsView({
        el: $('#sound-settings-modal-body'),
        model: sound_settings,
        id: 'sound-settings-modal-body'
    });

    if (voice_supported) {
        voices = window.speechSynthesis.getVoices();
    }

    $.extend(options, override_options);

    server_url = options.server + ':' + options.port.toString();

    if (audio_supported) {
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

    initVoice();

    $(options.selectors.use_voice_input).on('change', function() {
        if ($(this).is(':checked')) {
            if (voice_supported) {
                enableVoiceIn();
            }
        } else {
            disableVoiceIn();
        }
    });


    $('.setting-voice-in').on('click', function () {
        sound_settings.toggleVoiceInEnabled();
    });

    $('.setting-voice-out').on('click', function () {
        sound_settings.toggleVoiceOutEnabled();
    });

    sound_settings_view.render();



    // Public Methods
    
    /**
     * Connect to the server
     * @return {boolean} True if successfully connected
     */
    function connect (new_name, new_room) {
        appendMessage('SYSTEM', 'Connecting. Please be patient...<br>');

        if (isConnected()) { 
            error = 'Already connected.';
            return false; 
        }

        var that = this,
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
        socket.on('updateusers', function (userlist) {
            $(options.selectors.users_list).empty();
            $.each(userlist, function (index, user) {
                $(options.selectors.users_list).append('<li><a href="#" style="color:' + user.color + '">' + user.name + '</a></li>');
            });
        });
        socket.on('updatechat', function (msg_username, message, user_color) {
            if (msg_username !== 'SERVER' && msg_username !== username) {
                showAlert(msg_username + ' said something.');

                if (useVoice()) {
                    speakMessage(msg_username + ' says: ' + message);
                } else {
                    makeNoise();
                }
            }

            appendMessage(msg_username, message, user_color);
        });
        socket.on('disconnect', function onDisconnect () {
            appendMessage('SYSTEM', 'Disconnected');
            $(options.selectors.connect_btn).removeClass('connected').addClass('disconnected').find('span').text('Disconnected');
            options.onDisconnect();
            disableVoiceIn();
        });
    }

    /**
     * Disconnect from server
     * @param  {string} msg
     * @return {boolean}
     */
    function disconnect (msg) {
        if (!msg) {
            msg = 'Goodbye!';
        }
        socket.emit('disconnect', msg);
        socket.disconnect();
    }

    /**
     * If disconnected then connect...
     */
    function toggleConnect (new_name) {
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
            appendMessage('SYSTEM', 'Error: ' + err.message + '<br>');
        }
        socket.emit('sendchat', message);
    }

    /**
     * Write a message to the screen
     */
    function appendMessage (msg_username, message, color) {
        var currentdate = new Date(),
            username_elem,
            message_elem,
            datetime = currentdate.getFullYear() + "/" + 
                       zeroPad(currentdate.getMonth() + 1, 2) + "/" + 
                       zeroPad(currentdate.getDate(), 2) + " " + 
                       zeroPad(currentdate.getHours(), 2) + ":" + 
                       zeroPad(currentdate.getMinutes(), 2) + ":" + 
                       zeroPad(currentdate.getSeconds(), 2);

        message = linkify(message);

        username_elem = $('<b />')
            .css('color', color)
            .html(msg_username);

        message_elem = $('<p />')
            .attr('title', 'Message sent ' + datetime)
            .html(username_elem)
            .append(': ' + message)
            .appendTo(options.selectors.conversation);

        $('body').scrollTop($('body')[0].scrollHeight);
    }


    // Event handlers    

    function onConnect (theusername) {
        $(options.selectors.connect_btn).removeClass('disconnected').addClass('connected').find('span').text('Connected');
        options.onConnect(theusername);

        enableVoiceIn();
    }

    function speakMessage (msg) {
        var utterance;

        if (!useVoice()) {
            return false;
        }

        utterance = new SpeechSynthesisUtterance();
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.pitch = 2;
        utterance.text = msg;
        window.speechSynthesis.speak(utterance);
    }


    // Helpers

    /**
     * Check browser capabilities and user settings. 
     * @return {Boolean} true if voice can && should be used.
     */
    function useVoice () {
        return (voice_supported && $(options.selectors.use_voice_output).is(':checked'));
    }

    /**
     * By MikeMestnik: http://stackoverflow.com/questions/19547008/how-to-replace-plain-urls-with-links-with-example/19708150#19708150
     * @param  {string} text The text to be searched fro URLs.
     * @return {string}      The text with URLs replaced
     */
    function linkify (text) {
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
                m = (/(.*)(\.\).*)/.exec(url) || /(.*)(\).*)/.exec(url));
                if (m) {
                    url = m[1];
                    rParens = m[2] + rParens;
                }
            }
            return lParens + "<a href='" + url + "'>" + url + "</a>" + rParens;
        });
    }

    /**
     * Prepend zeros to a string up to a given length.
     * @param  {string} str the number to pad.
     * @param  {number} len the final length to return
     * @return {string}     the padded string
     */
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
        return (socket && socket.socket ? socket.socket.connected : false);
    }

    /**
     * Flash a message in the title bar
     */
    function showAlert (message) {
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
    function makeNoise () {
        if (audio_supported && $(options.selectors.use_sound).is(':checked')) {
            $new_msg_sound.get(0).play();
        }
    }

    function initVoice () {
        if (annyang) {
            var commands = {
                'send': function() {
                    sendMessage($('#msg_input').val());
                    $('#msg_input').val('');
                },
                '*sentence': function (sentence) {
                    $('#msg_input').val($('#msg_input').val() + sentence);
                }
            };

            annyang.addCommands(commands);

            annyang.addCallback('start', function () {
                console.log('DEBUG: voice started');
                $('.voice-input-indicator').css('color', 'red');
            }, this);

            annyang.addCallback('end', function () {
                console.log('DEBUG: voice ended');
                $('.voice-input-indicator').css('color', '#999');
            }, this);

            annyang.addCallback('error', function () {
                console.log('DEBUG: voice error!');
            }, this);

            annyang.addCallback('result', function () {}, this);

            annyang.addCallback('resultMatch', function () {}, this);

            annyang.addCallback('resultNoMatch', function () {}, this);

            annyang.addCallback('errorNetwork', function () {
                console.log('DEBUG: error network');
            }, this);

            annyang.addCallback('errorPermissionBlocked', function () {
                console.log('DEBUG: error permission blocked');
            }, this);

            annyang.addCallback('errorPermissionDenied', function () {
                console.log('DEBUG: error permission denied');
            }, this);
        }
    }

    /**
     * Start listening for voice input
     */
    function enableVoiceIn () {
        if (voice_supported) {
            annyang.start();
        }
    }

    function disableVoiceIn () {
        if (voice_supported) {
            annyang.abort();
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
