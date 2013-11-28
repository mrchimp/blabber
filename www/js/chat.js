$(document).ready(function () {
    var blab = new Blabber({
        onConnectCallback: function () {
            console.log('Blabber connected');
        },
        onMessageCallback: function (username, message) {
            console.log(username + " said " + message);
        },
        onDisconnectCallback: function () {
            console.log('Blabber disconnected');
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

        $(this).hide();
        $('#welcome').slideUp();
        $('#msg_input').slideDown();
        blab.appendMessage('CONNECTING', 'Please be patient...<br>');
        blab.connect(username);
    });
});
