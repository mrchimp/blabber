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

        }
    });

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

        var username = $('#welcome input[name="username"]').val();

        if (!username) {
            $('#welcome input[name="username"]').attr('placeholder', 'Enter your name, stupid.');
            return false;
        }

        var room = $('#welcome input[name="room"]').val();

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
