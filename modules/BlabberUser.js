
module.exports = (function (override_options) {
  'use strict';

  var name,
      socket,
      room_name;

  if (!override_options.socket || 
  !override_options.room_name || 
  !override_options.name) {
    return false;
  }

  name = override_options.name || 'unknown';
  socket = override_options.socket;
  room_name = override_options.room_name;

  function getName() {
    return name;
  }

  return {
    socket: socket,
    getName: getName
  };
});
