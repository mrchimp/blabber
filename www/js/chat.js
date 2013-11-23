
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
    self.alert_timeout;

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
};

Blabber.prototype.connect = function () {
    var t = this;
    
    this.disconnected = false;
    this.socket = io.connect('http://' + window.location.hostname + ':80');
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

    this.socket.on('connect', function () {
        t.current_username = prompt("What's your name?");
        t.socket.emit('adduser', t.current_username);
        $('#conversation').html('');
        $('#connect').removeClass('disconnected').addClass('connected');
    });

    this.socket.on('updateusers', function (data) {
        $('#users').empty();
        $.each(data, function (key, value) {
            $('#users').append('<li><a href="#">' + key + '</a></li>');
        });
    });
    
    this.socket.on('disconnect', function () {
        this.disconnected = true;
        $('#connect').removeClass('connected').addClass('disconnected');
    });
};

Blabber.prototype.disconnect = function () {
    this.socket.emit('disconnect', 'Goodbye!');
    console.log('disconnected');
};

Blabber.prototype.resetTitle = function () {
    clearTimeout(this.alert_timeout);
    document.title = self.window_title;
};

Blabber.prototype.appendMessage = function (username, message) {
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

Blabber.prototype.sendMessage = function (message) {
    if (this.disconnected === true) {
        this.appendMessage('ERROR', 'Cant send message - disconnected.<br>');
        return false;
    }

    // tell server to execute 'sendchat' and send along one parameter
    this.socket.emit('sendchat', message);
};

$(document).ready(function () {
    var blab = new Blabber();

    // when the client hits ENTER on their keyboard
    $('#msg_input').keypress(function (e) {
        if (e.which === 13) {
            blab.sendMessage($('#msg_input').val());
            $('#msg_input').val('');
        }
    });

    $('#connect').on('click', function (e) {
        e.preventDefault();
        
        if (blab.disconnected === true) {
            blab.appendMessage('CONNECTING', 'Please be patient...<br>');
            blab.connect();
        } else {
            blab.disconnect();
        }
    });
});
