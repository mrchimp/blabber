#!/usr/bin/env node

var blabber = require('./modules/Blabber.js'),
    program = require('commander'),
    ent     = require('ent');

program
  .version('0.2.0')
  .option('-s, --silent', 'run the server with no interaction or GUI')
  .option('-w, --www  [www]', 'specify the static content directory. Default: www', __dirname + '/www')
  .option('-p, --port [port]', 'specify the port to serve on. Default: 80', parseInt, 80)
  .parse(process.argv);

var server = new blabber({
  port: program.port,
  static_dir: program.www
});

function startSilent() {
  server.start();
  
  server.on('log', function (params) {
    console.log(params.message);
  });
}

function startGUI () {
  var blessed = require('blessed'),
      blessprog = blessed.program(),
      screen = blessed.screen();

  blessprog.hideCursor();

  screen.key(['escape', 'C-c'], function (ch, key) {
    return process.exit(0);
  });

  var events = blessed.box({
    name: 'events',
    top: 0,
    left: 0,
    height: '70%',
    width: '50%',
    tags: true,
    mouse: true,
    scrollable: true,
    scrollbar: {
      fg: 'white'
    },
    style: {
      fg: 'white',
      bg: 'black',
      scrollbar: {
        bg: 'white'
      },
      focus: {
        bg: 'blue',
      }
    }
  });

  var room_list = blessed.box({
    name: 'room_list',
    top: 0,
    content: 'Room list.',
    right: 0,
    height: '70%',
    width: '50%',
    tags: true,
    scrollable: true,
    style: {
      fg: 'white',
      bg: 'black',
      scrollbar: {
        bg: 'red',
        fg: 'green'
      },
      focus: {
        bg: 'blue',
      }
    }
  });

  var chat_log = blessed.box({
    name: 'chat_log',
    top: '70%',
    left: 0,
    height: '30%',
    width: '100%',
    tags: true,
    scrollable: true,
    style: {
      fg: 'white',
      bg: 'black',
      scrollbar: {
        bg: 'red',
        fg: 'green'
      },
      focus: {
        bg: 'blue',
      }
    }
  });

  server.on('log', function (params) {
    events.insertBottom(params.message);
    events.setScrollPerc(100);
    screen.render();
  });

  server.on('message', function (params) {
    chat_log.insertBottom('[' + params.room_name + '] ' + params.author + ': ' + ent.decode(params.message));
    screen.render();
  });

  server.on('update_room_list', function (data) {
    room_list.setContent('Room list:');
    for (var i = 0; i < data.rooms.length; i++) {
      room_list.insertBottom('• ' + data.rooms[i]);
    }
    screen.render();
  });

  events.on('keypress', function (ch, key) {
    switch (key.name) {
      case 'up':
        events.scroll(1);
        break;
      case 'down':
        events.scroll(-1);
        break;
    }
    screen.render();
  });

  events.on('click', function (data) {
    events.focus();
    screen.render();
  });

  room_list.on('click', function (data) {
    room_list.focus();
    screen.render();
  });

  chat_log.on('click', function (data) {
    chat_log.focus();
    screen.render();
  });

  screen.append(events);
  screen.append(room_list);
  screen.append(chat_log);

  events.focus();
  events.setContent("Server running on port " + program.port + "!");
  server.start();
  screen.render();
}

if (program.silent) {
  console.log('silent');
  startSilent();
} else {
  console.log('gui');
  startGUI();
}

console.log('Goodbye!');
