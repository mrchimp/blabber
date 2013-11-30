blabber
=======

Web chat system with node and web sockets.


Install a Server
----------------

Install Node.js - http://nodejs.org/

Open a terminal and cd to where package.json is.

Get dependencies by typing: 

    npm install -d

Marvelous.
 
 
Run a Server
------------

You will need run Blabber as an administrator in order to use a low port number such as 80. 

    sudo node babble.js

I would recommend using [Forever](https://github.com/nodejitsu/forever) to keep your process running:

    sudo forever start blabber.js
    
Connect a Client
----------------

Point a web browser at

    http://localhost:80
