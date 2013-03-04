
function zeroPad(str, len) {
    str = str.toString();
    while (str.length < len) {
        str = '0' + str;
    }
    return str;
}

var Blabber = function () {
    this.window_title = document.title;
    this.disconnected = true;
    this.alert_timeout;
    this.username = '';
    // set up audio
    this.$new_msg_sound = document.createElement('audio');
    this.audioTagSupport = !!(this.$new_msg_sound.canPlayType);

    if (this.audioTagSupport) {
        // Currently canPlayType(type) returns: "", "maybe" or "probably" 
        this.canPlayMp3 = !!this.$new_msg_sound.canPlayType && "" !== this.$new_msg_sound.canPlayType('audio/mpeg');
        this.canPlayOgg = !!this.$new_msg_sound.canPlayType && "" !== this.$new_msg_sound.canPlayType('audio/ogg; codecs="vorbis"');
        $('body').append(this.$new_msg_sound);
    }

    if (this.canPlayMp3) {
        this.$new_msg_sound = $('<audio />')
                            .attr({
                                'id': 'new_msg_sound',
                                'src': 'audio/alert.mp3'
                            });
        $.get();
    } else if (this.canPlayOgg) {
        this.$new_msg_sound = $('<audio />')
                            .attr({
                                'id': 'new_msg_sound',
                                'src': 'audio/alert.ogg'
                            });
        $.get();
    }
    
    this.focusOnInput();
};

Blabber.prototype.connect = function () {
    var t = this;
    
    if (this.disconnect === false) {
        return true;
    }
    
    this.disconnected = false;
    this.users = '';
    this.appendMessage('CONNECTING', 'Please be patient...');
    this.socket = io.connect('http://' + window.location.hostname + ':8080');
    this.my_username = '';
    
    // listener, whenever the server emits 'updatechat', this updates the chat body
    this.socket.on('updatechat', function (username, data) {
        t.appendMessage(username, data);
        
        if (username !== 'SERVER' && username !== t.current_username) {
            // Show message in title
            clearTimeout(t.alert_timeout);
            document.title = 'MESSAGE FROM ' + username;
            t.alert_timeout = window.setTimeout(this.resetTitle, 3000);

            // play a sound
            if (t.audioTagSupport && $('#sound_enabled').is(':checked')) {
                t.$new_msg_sound.get(0).play();
            }
        }
    });

    // on connection to server, ask for user's name with an anonymous callback    
    this.socket.on('connect', function () {
        //t.current_username = prompt("What's your name?");

        // call the server-side function 'adduser' and send one parameter (value of prompt)
        console.log(t);
        console.log('adding user: ' + t.my_username);
        t.socket.emit('adduser', t.my_username);
        t.clear();
        $('#prompt').removeClass('disconnected').addClass('connected');
    });

    // listener, whenever the server emits 'updateusers', this updates the username list
    this.socket.on('updateusers', function (data) {
        $('#users').empty();
        t.users = data;
        $.each(data, function (key, value) {
            $('#users').append('<li>' + key + '</li>');
        });
    });
    
    this.socket.on('disconnect', function () {
        t.disconnected = true;
        $('#prompt').removeClass('connected').addClass('disconnected');
    });
};

Blabber.prototype.setUserName = function (username) {
    console.log(setting username to: ' + username);
    this.username = username;
};

Blabber.prototype.disconnect = function () {
    this.socket.emit('disconnect', 'Goodbye!');
    console.log('disconnected');
};

Blabber.prototype.resetTitle = function () {
    clearTimeout(this.alert_timeout);
    document.title = self.window_title;
};

Blabber.prototype.clear = function () {
    $('msg_out').html('');
}

Blabber.prototype.appendMessage = function (username, message) {
    console.log(username);
    var currentdate = new Date(),
        datetime = currentdate.getFullYear() + "/"
                 + zeroPad(currentdate.getMonth() + 1, 2) + "/"
                 + zeroPad(currentdate.getDate(), 2) + " "
                 + zeroPad(currentdate.getHours(), 2) + ":"
                 + zeroPad(currentdate.getMinutes(), 2) + ":"
                 + zeroPad(currentdate.getSeconds(), 2),
        isme = '';
        
    if (username === this.my_username) {
        isme = ' me';
    }
    
    $('#msg_out').append('<span title="Message sent ' + datetime + '"><span class="username' + isme + '">' + username + ':</span> ' + message + '</span><br>');
    $('body').scrollTop($("body")[0].scrollHeight);
};

Blabber.prototype.sendMessage = function (message) {
    if (this.disconnected === true) {
        this.appendMessage('ERROR', 'Cant send message - disconnected.');
        this.focusOnInput();
        return false;
    }

    // tell server to execute 'sendchat' and send along one parameter
    this.socket.emit('sendchat', message);
    this.focusOnInput();
};

Blabber.prototype.sendPM = function (username, message) {
    this.socket.emit('pm', username, message);
}

Blabber.prototype.focusOnInput = function() {
  var target_top = $('#page_bottom').offset().top;

  $('html, body').animate({
    duration: 'fast',
    scrollTop: target_top}, 10);
    
  $('#msg_in').focus();
};

$(document).ready(function () {
    var blab = new Blabber();

    // Always keep focus on input
    $('body, html').click(blab.focusOnInput);
    $(window).resize(blab.focusOnInput);
    
    $('#msg_in').keypress(function (e) {
        if (e.which === 13) { // Enter
            var msg = $('#msg_in').val();
            var msg_split = msg.split(' ', 2);
            
            if (msg.charAt(0) === '@') {
                blab.sendPM(msg_split[0].substr(1), msg_split[1]);
                return true;
            }
            
            switch (msg_split[0]) {
                case '/connect':
                    if (msg_split.length < 2) {
                        blab.appendMessage('HINT', 'Enter your username after /connect.');
                        break;
                    }
                    blab.setUserName(msg_split[1]);
                    blab.connect();
                    $('#msg_in').val('');
                    break;
                case '/disconnect':
                    blab.disconnect();
                    $('#msg_in').val('');
                    break;
                case '/users':
                    $('#userlist').toggle();
                    $('body').toggleClass('sidebar');
                    $('#msg_in').val('');
                    break;
                case '/help':
                    blab.appendMessage('HELP', 'Available commands:<br>'
                        + '/connect - connect<br>'
                        + '/disconnect - disconnect<br>'
                        + '/users - toggle user list<br>'
                        + '/help - you just did that<br>'
                        + 'Send a pm by prefixing @<em>username</em>'
                    );
                    $('#msg_in').val('');
                    break;
                default:
                    blab.sendMessage(msg);
                    $('#msg_in').val('');
            }
        }
    });

    $('#connect').on('click', function (e) {
        e.preventDefault();
        
        if (blab.disconnected === true) {
            blab.connect();
        } else {
            blab.disconnect();
        }
    });
});