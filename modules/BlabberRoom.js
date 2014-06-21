/**
 * Contains people
 */

module.exports = (function (override_options) {
  'use strict';

  var users = [],
      name = override_options.name || 'unknown';

  if (typeof override_options.name !== 'string') {
    return false;
  }

  function getUsers() {
    return users;
  }

  function addUser(user) {
    users.push(user);
  }

  function removeUser(username){
    for (var x = 0; x < users.length; x++) {
      if (users[x].getName() === username) {
        users.splice(x, 1);
        return;
      }
    }
  }

  function getName() {
    return name;
  }

  return {
    getUsers: getUsers,
    addUser: addUser,
    getName: getName,
    removeUser: removeUser,
    users: users
  };
});
