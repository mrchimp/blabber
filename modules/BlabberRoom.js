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

  function getName() {
    return name;
  }

  return {
    getUsers: getUsers,
    addUser: addUser,
    getName: getName,
    users: users
  };
});
