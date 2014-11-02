/**
 * Blabber server.
 */

module.exports = (function (override_options) {
  'use strict';

  var User    = require('./BlabberUser.js'),
      Room    = require('./BlabberRoom.js'),
      util    = require('util'),
      express = require('express'),
      app     = express(),
      http    = require('http'),
      server  = http.createServer(app),
      io      = require('socket.io').listen(server, { log: false }),
      ent     = require('ent'),
      surly   = require('surly'),
      Logger  = require('./logger');

  var options = {
        server:       '0.0.0.0',
        port:         80,
        static_dir:   __dirname + '/www',
        server_color: '#B00',
        bot_name:     'Surly',
        bot_color:    '#00B',
        aiml_dir:     'node_modules/surly/aiml',
        log_file:     'logs/blabber.log',
      },
      bot = new surly(),
      rooms = [],
      event_handlers = {},
      reserved_names = [
        'server',
        'connecting',
        'admin',
        'mod',
        'moderator',
        'system'
      ],
      logger;

  options = extend(options, override_options);

  logger = new Logger(options.log_file);

  bot.loadAimlDir(options.aiml_dir);
  reserved_names.push(options.bot_name);

  log('====================');

  function log(message) {
    logger.write(message);
    trigger('log', {message: message});
  }

  /**
   * Start the server
   */
  function start() {
    app.use(express.static(options.static_dir));

    server.on('listening',function(){
      log('[event] Server is listening');
    });

    server.listen(options.port);
  }

  /**
   * Attach an event handler
   * @return {undefined}
   */
  function on(name, handler) {
    event_handlers[name] = [handler];
  }

  /**
   * Trigger an event
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
    var usernames = [{
          name: options.bot_name,
          color: options.bot_color
        }],
        room = getRoom(room_name),
        users = room.getUsers();

    if (!room || !users.length) {
      return false;
    }

    // get list of usernames
    for (var x = 0; x < users.length; x++) {
      usernames.push({
        name: users[x].getName(),
        color: users[x].getColor()
      });
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
    if (rooms.length === 0) {
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
        // We want m[1] to be greedy, unless a period precedes the
        // right parenthesis.  These tests cannot be simplified as
        //     /(.*)(\.?\).*)/.exec(url)
        // because if (.*) is greedy then \.? never gets a chance.
        var m = /(.*)(\.\).*)/.exec(url) ||
                /(.*)(\).*)/.exec(url);

        if (m) {
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

    /**
     * Send a message (trigger "updatechat") to everyone in
     * socket's room.
     * @param  {String} author_name  Name of person sending message
     * @param  {String} message      The message to send
     * @param  {String} author_color Hex color value (including #)
     * @return {Mixed}               False if can't find room
     */
    function sayToRoom(author_name, message, author_color) {
      var room = getRoom(socket.room_name);

      if (room === false) {
        console.error('Room not found.');
        return false;
      }

      for (var i = 0; i < room.users.length; i++) {
        room.users[i].socket.emit('updatechat', author_name, message, author_color);
      }

      trigger('message', {
        message: message,
        author: author_name,
        author_color: author_color,
        room_name: socket.room_name
      });
    }

    /**
     * Handle slash commands, i.e. non-chat messages
     * @param  {String} action  The command to perform
     * @param  {String} message The full message
     */
    function doAction(action, message) {
      switch (action) {
        case '/help':
          socket.emit('updatechat', 'SERVER', 'Are you having problems?', options.server_color);
          break;
        default:
          socket.emit('updatechat', 'SERVER', ent.encode(action)+' is not a command.', options.server_color);
      }
    }

    /**
     * adduser event received from user
     * @param  {string} username  The user's name
     * @param  {string} room_name The name of the room they are trying to join
     */
    socket.on('adduser', function(username, room_name){
      var room,
          user;

      if (typeof username !== 'string') {
          log('[event] New user kicked for invalid username: ' + username);
          socket.emit('updatechat', 'SERVER', 'Invalid username.', options.server_color);
          socket.disconnect();
          return false;
      }

      if (typeof room_name !== 'string') {
          log('[event] New user kicked for invalid room: ' + room_name);
          socket.emit('updatechat', 'SERVER', 'Invalid room.', options.server_color);
          socket.disconnect();
          return false;
      }

      if (!/^[a-zA-Z0-9-]+$/.test(room_name)) {
        log('[event] New user kicked room doesnt match regex: ' + room_name);
        socket.emit('updatechat', 'SERVER', 'Invalid characters in room name ' + room_name + '. Only letters, numbers and the dash (-) character are allowed.', options.server_color);
        socket.disconnect();
        return false;
      }

      username = ent.encode(username);

      if (arrayContains(username.toLowerCase(), reserved_names)) {
        log('[event] New user kicked for reserved name: ' + username);
        socket.emit('updatechat', 'SERVER', 'That username is reserved.', 'options.server_color');
        socket.disconnect();
        return false;
      }

      room = getRoom(room_name);

      log('[event] [+user] ' + username + ' joined ' + room_name);

      if (!room) {
        log('[event] [+room] room ' + room_name + ' created');
        room = new Room({
          name: room_name
        });

        rooms.push(room);
      }

      if (typeof room.users[username] !== 'undefined') {
        log('[event] [-user] New user kicked. User "' + username + '" already exists.');
        socket.emit('updatechat', 'SERVER', 'That username exists.', 'options.server_color');
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

      // Create a user
      user = new User({
          name: username,
          socket: socket,
          room_name: room_name
      });

      socket.username = username;
      socket.user = user;
      socket.room_name = room_name;

      // Add user to list of all users
      room.addUser(user);

      // Tell people what just happened
      log('[event] [+user] + ' + username + ' joined ' + room_name);

      sayToRoom('SERVER', username + ' has connected', options.server_color);
      socket.emit('updatechat', 'SERVER', 'Greetings! You are in "' + room_name + '" with ' + room.users.length + ' other people.', options.server_color);

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
      var action,
          bot_msg = false,
          clean_message;

      if (message[0] === '/') {
        socket.emit('updatechat', ent.encode(socket.username), message, socket.username, socket.user.getColor());
        action = message.split(' ')[0];
        doAction(action, message);
        return true;
      }

      if (message.substr(0,options.bot_name.length + 1).toLowerCase() === options.bot_name.toLowerCase() + ':') {
        bot_msg = true;
      }

      clean_message = ent.encode(message);
      clean_message = linkify(clean_message);
      
      sayToRoom(socket.username, clean_message, socket.user.getColor());

      if (bot_msg) {
        log('[event] Bot message!');
        sayToRoom(options.bot_name, bot.talk(message.substr(options.bot_name.length + 1).trim()), options.bot_color);
      }
    });
    
    /**
     * Triggered when a user actively or passively disconnects
     */
    socket.on('disconnect', function (){
      var room;

      if (socket.username) {
        room = getRoom(socket.room_name);
        
        room.removeUser(socket.username);
        log('[event] [-user] ' + socket.username + '[' + socket.room_name + '] disconnected.');
        updateUserList(room.getName());
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected', options.server_color);
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
