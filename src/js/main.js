$(document).ready(function () {
    var blab = new BlabberClient({
        'onConnect': function () {
            $('.connect')
                .removeClass('disconnected')
                .addClass('connected');
            $('#welcome').hide();
            $('#chat-block').fadeTo(300, 1);
            $('#userlist').slideDown();
            $('#chat_input').slideDown();
        },
        'onMessage': function (username, message) {
            console.log(username + ": " + message);
        },
        'onDisconnect': function () {
            console.log('Blabber disconnected');
            $('.connect')
                .removeClass('connected')
                .addClass('disconnected');
            $('#welcome').slideDown();
            $('#userlist').slideUp();
            $('#chat_input').slideUp();
        },
        port: 80,
        voice: false
    });

    // Get QueryString
    var QueryString = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        QueryString.push(hash[0]);
        QueryString[hash[0]] = hash[1];
    }

    if (typeof QueryString.room === 'string') {
        $('#welcome input[name="room"]').val(QueryString.room).attr('type', 'hidden').parent('.form-group').hide();
    }
console.log(QueryString);
console.log(hashes);

    $('#msg_input').keypress(function (e) {
        if (e.which === 13) { // Enter
            blab.sendMessage($('#msg_input').val());
            $('#msg_input').val('');
        }
    });

    $('.connect').on('click', function (e) {
        e.preventDefault();
        blab.toggleConnect();
    });

    $('#welcome form').on('submit', function (e) {
        e.preventDefault();

        var username = $('#welcome input[name="username"]').val(),
            room = $('#welcome input[name="room"]').val();

        if (!username) {
            $('#welcome input[name="username"]').attr('placeholder', 'Enter your name, stupid.');
            return false;
        }

        if (!room) {
            $('#welcome input[name="room"]').attr('placeholder', 'Enter a room name, stupid.');
            return false;
        }

        blab.connect(username, room);
    });

    $('.toggle-userlist').on('click', function (e) {
        e.preventDefault();
        $('#users').slideToggle();
    });
});
