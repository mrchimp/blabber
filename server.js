var blabber = require('./modules/Blabber.js'),
    program = require('commander');

program
  .version('0.1.0')
  .option('-s, --silent', 'run the server with no interaction')
  .option('-w, --www  [www]', 'specify the static content directory.', __dirname + '/www')
  .option('-h, --host [host]', 'specify the host', '0.0.0.0')
  .option('-p, --port [port]', 'specify the port to serve on', parseInt, 80)
  .parse(process.argv);

var server = new blabber({
  server: program.host,
  port: program.port,
  static_dir: program.www
});

if (program.silent) {
  startSilent();
} else {
  startGUI();
}

function startSilent() {
  server.start();
  
  server.on('log', function (params) {
    console.log(params.message);
  });
}

function startGUI () {
  var blessed = require('blessed');

  var screen = blessed.screen();

  var log = blessed.box({
    top: 'center',
    left: 0,
    height: '100%',
    width: '50%',
    tags: true,
    scrollable: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'red'
      }
    }
  });

  screen.append(log);

  screen.key(['escape', 'C-c'], function (ch, key) {
    return process.exit(0);
  });

  // log.on('click', function (data) {
  //   log.focus();
  // });

  screen.key(['home'], function (ch, key) { // how do we do arrow keys?
    log.scroll(-1);
    log.pushLine(1, 'o pressed');
  });

  screen.key(['end'], function (ch, key) { // how do we do arrow keys?
    log.scroll(1);
    log.pushLine(1, 'l pressed');
  });

  screen.render();

  log.focus();

  server.on('log', function (params) {
    log.pushLine(1, params.message);
  });

  server.start();
}
