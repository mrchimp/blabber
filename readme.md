Blabber
=======

Web chat system with node and web sockets.

Requirements
------------------

[Node js](http://nodejs.org/)


Install a Server
----------------

1.   Clone the repo into a folder.
2.   Open a terminal and cd to `blabber/`.
3.   Get dependencies by running: `npm install -d`
4.   Marvelous.

  
Run a Server
------------

    sudo node blabber.js

 > Note: You will need to run Blabber as root in order to use a port number below 1024, i.e. 80. 

I recommend using [Forever](https://github.com/nodejitsu/forever) to keep your process running:

    sudo forever start blabber.js


Connect a Client
----------------

Point a web browser at `http://localhost:80`
