/**
 * Blabber server.
 */

module.exports = (function (override_options) {
  'use strict';

  var User     = require('./BlabberUser.js'),
      Room     = require('./BlabberRoom.js'),
      util     = require('util'),
      express  = require('express'),
      app      = express(),
      http     = require('http'),
      server   = http.createServer(app),
      io       = require('socket.io').listen(server, { log: false }),
      ent      = require('ent'),
      check    = require('validator').check,
      sanitize = require('validator').sanitize;

  var options = {
        server: '0.0.0.0',
        port: 80,
        static_dir: __dirname + '/www'
      },
      rooms = [],
      event_handlers = {},
      reserved_names = [
        'server',
        'connecting',
        'admin',
        'mod',
        'moderator',
      ];

  options = extend(options, override_options);

  function log(message) {
    trigger('log', {message: message});
  }

  /**
   * Start the server
   */
  function start() {
    server.listen(options.port, options.server);
    app.use(express.static(options.static_dir));
  }

  /**
   * Attach an even handler
   * @return {undefined}
   */
  function on(name, handler) {
    if (typeof event_handlers[name] === 'array') {
      event_handlers[name].push(handler);
    } else {
      event_handlers[name] = [handler];
    }
  }

  /**
   * trigger an event
   * @param  {string} name   name of the event to trigger
   * @param  {object} params parameters object for handler
   * @return {undefined}
   */
  function trigger(name, params) {
    if (!event_handlers[name]) {
      return false;
    }

    for (var i = 0; i < event_handlers[name].length; i++) {
      event_handlers[name][i](params);
    }
  }

  /**
   * Extend an object with the properties of another
   * @param  {object} target The base object
   * @param  {object} source The object whose values will override that of target
   * @return {object}        The updated target object
   */
  function extend(target, source) {
    target = target || {};
    
    for (var prop in source) {
      if (typeof source[prop] === 'object') {
        target[prop] = extend(target[prop], source[prop]);
      } else {
        target[prop] = source[prop];
      }
    }
    
    return target;
  }

  /**
   * Send a list of usernames to a room.
   * @param  {string} room_name the name of the room to update
   * @return {undefined}
   */
  function updateUserList(room_name) {
    var usernames = [],
        room = getRoom(room_name),
        users = room.getUsers();

    if (!room || !users.length) {
      return false;
    }

    // get list of usernames
    for (var x = 0; x < users.length; x++) {
      usernames.push(users[x].getName());
    }
    
    // send out to each user
    for (var i = 0; i < users.length; i++) {
      if (users[i].socket) {
        users[i].socket.emit('updateusers', usernames);
      } else {
        console.error('socket not set...');
      }
    }
  }

  /**
   * Get an array of all room names
   * @return {array}
   */
  function getRoomNames() {
    var room_names = [];

    for (var i = 0; i < rooms.length; i++) {
      room_names.push(rooms[i].getName());
    }

    return room_names;
  }

  /**
   * Get room by name
   * @param {string} room Name of the room
   */
  function getRoom(room) {
    if (rooms.length == 0) {
      return false;
    }

    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].getName() === room) {
        return rooms[i];
      }
    }
  }

  /**
   * By MikeMestnik: http://stackoverflow.com/questions/19547008/how-to-replace-plain-urls-with-links-with-example/19708150#19708150
   * Edited to work with escaped HTML entities
   * @param  {string} text The text to be searched fro URLs.
   * @return {string}      The text with URLs replaced
   */
  function linkify(text) {
    var re = /(\(.*?)?\b((?:https?|ftp|file)&colon;&sol;&sol;[-a-z0-9+&@#\/%?=~_()|!:,.;]*[-a-z0-9+&@#\/%=~_()|])/ig;
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
      return lParens + '<a href="' + url + '" target="_blank">' + url + '</a>' + rParens;
    });
  }

  /**
   * Search for a string in an array
   * @param  {string} needle      the string to search for
   * @param  {array}  arrhaystack the array to search
   * @return {boolean}             true if needle is found
   */
  function arrayContains(needle, arrhaystack) {
    return (arrhaystack.indexOf(needle) > -1);
  }

  io.sockets.on('connection', function (socket) {

    function sayToRoom(author, message) {

      var room = getRoom(socket.room_name);

      if (room == false) {
        console.error('Room not found.');
        return false;
      }

      for (var i = 0; i < room.users.length; i++) {
        room.users[i].socket.emit('updatechat', author, message);
      }

      // trigger('message', '  '+ author + ' in ' + socket.room_name + ' says ' + message);
      trigger('message', {
        message: message,
        author: author,
        room_name: socket.room_name
      });
    }

    function doAction(action, message) {
      switch (action) {
        case '/help':
          socket.emit('updatechat', 'SERVER', 'Are you having problems?');
          break;
        default:
          socket.emit('updatechat', 'SERVER', ent.encode(action)+' is not a command.');
      }
    }

    /**
     * adduser event received from user
     * @param  {string} username  The user's name
     * @param  {string} room_name The name of the room they are trying to join
     */
    socket.on('adduser', function(username, room_name){
      if (typeof username !== 'string') {
          log('New user kicked for invalid Username: ' + username);
          socket.emit('updatechat', 'SERVER', 'Invalid username.');
          socket.disconnect();
          return false;
      }

      if (typeof room_name !== 'string') {
          log('New user kicked for invalid room: ' + room_name);
          socket.emit('updatechat', 'SERVER', 'Invalid room.');
          socket.disconnect();
          return false;
      }

      try {
        check(room_name).is(/^[a-zA-Z0-9-]+$/);
      } catch (err) {
        log('New user kicked room doesnt match regex: ' + room_name);
        socket.emit('updatechat', 'SERVER', 'Invalid characters in room name. Only letters, numbers and the dash (-) character are allowed.');
        socket.disconnect();
        return false;
      }

      username = ent.encode(username);

      if (arrayContains(username, reserved_names)) {
        log('New user kicked for reserved name: ' + username);
        socket.emit('updatechat', 'SERVER', 'That username is reserved.');
        socket.disconnect();
        return false;
      }

      var room = getRoom(room_name);

      if (!room) {
        room = new Room({
          name: room_name
        });

        rooms.push(room);
      }

      if (typeof room.users[username] !== 'undefined') {
        log('New user kicked. User "' + username + '" already exists.');
        socket.emit('updatechat', 'SERVER', 'That username exists.');
        socket.disconnect();
        return false;
      }

      // replace with per-room check
      // if (users[username]) {
      //     log('New user kicked: name already taken: ' + username);
      //     socket.emit('updatechat', 'SERVER', 'That name is already taken.');
      //     socket.disconnect();
      //     return false;
      // }

      socket.username = username;
      socket.room_name = room_name;

      // Create a user
      var user = new User({
          name: username,
          socket: socket,
          room_name: room_name
      });

      // Add user to list of all users
      room.addUser(user);

      // Tell people what just happened
      log('+ ' + username + ' joined ' + room_name);
      sayToRoom('SERVER', username + ' has connected');
      socket.emit('updatechat', 'SERVER', 'Greetings! You are in "' + room_name + '" with ' + (room.users.length - 1) + ' other people.');

      trigger('update_room_list', {
        rooms: getRoomNames()
      });

      updateUserList(room_name);
    });

    /**
     * Receive a message from a user
     * @param  {string} message The user's message 
     */
    socket.on('sendchat', function (message) {
      if (message[0] === '/') {
        socket.emit('updatechat', ent.encode(socket.username), message);
        var action = message.split(' ')[0];
        doAction(action, message);
        return true;
      }

      message = ent.encode(message);
      message = linkify(message);
      
      sayToRoom(socket.username, message);
    });
    
    /**
     * Triggered when a user actively or passively disconnects
     */
    socket.on('disconnect', function(){
      if (socket.username) {
        var room = getRoom(socket.room_name);
        
        room.removeUser(socket.username);
        log('- ' + socket.username + ' disconnected.');
        updateUserList(room.getName());
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
      }

      trigger('update_room_list', {
        rooms: getRoomNames()
      });
    });
  });

  return {
    start: start,
    on: on
  };
});
