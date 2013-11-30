$(document).ready(function () {
    var blab = new BlabberClient({
        'onConnect': function () {
            console.log('Blabber connected');
            $(this).hide();
            $('#welcome').hide();
            $('#chat-block').fadeTo(300, 1);
        },
        'onMessage': function (username, message) {
            console.log(username + ": " + message);
        },
        'onDisconnect': function () {
            console.log('Blabber disconnected');
            $('.connect')
                .removeClass('connected')
                .addClass('disconnected');
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

        var username = $('#welcome .username').val();
        if (!username) {
            $('#welcome .username').attr('placeholder', 'Enter your name, stupid.');
            return false;
        }

        blab.connect(username);
    });

    $('.toggle-userlist').on('click', function (e) {
        e.preventDefault();
        $('#users').slideToggle();
    });
});
