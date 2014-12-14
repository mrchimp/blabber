# Blabber #

Real-time instant messaging system featuring text-to-speech and voice recognition (where available). Built with Node JS and web sockets.

[Demo](http://blabber.jit.su)


## Requirements ##

[Node js](http://nodejs.org/)


## Install a Server ##

1.   Clone the repo into a folder.
2.   Open a terminal and cd to `blabber/`.
3.   Get Node dependencies by running: `npm install`
4.   Get front end dependencies by running `bower install`
5.   Build project by running `grunt`
6.   Marvelous.


## Run a Server ##

    node blabber.js -p 80

 > Note: You might need to run Blabber as root in order to use a port number below 1024, i.e. 80.

Type `node blabber.js --help` for available flags.

You can use [Forever](https://github.com/nodejitsu/forever) to keep your process running:

    sudo forever start blabber.js


## Connect a Client ##

Point a web browser at `http://localhost:80`
