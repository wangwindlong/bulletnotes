/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Meteor } = require('meteor/meteor');

Meteor.publish('users.prefs', function() {
  const user = Meteor.users.find(
    {_id: this.userId}
  , {
    fields: {
      menuPin: 1,
      muted: 1,
      referralCount: 1,
      isAdmin: 1,
      theme: 1,
      language: 1,
      isPro: 1,
      apiKey: 1,
      services: 1,
      notesCreated: 1
    }
  }
  );
  return user;
});

Meteor.publish('users.count.total', () => new Counter('users.count.total', Meteor.users.find()));

Meteor.publish('users.count.recent', () => new Counter('users.count.recent', Meteor.users.find()));
