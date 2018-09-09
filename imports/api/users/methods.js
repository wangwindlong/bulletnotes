/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Dropbox = require('dropbox');
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

Meteor.methods({
  'users.clearDropboxOauth'() {
    return Meteor.users.update({_id:this.userId}, {$unset:{"profile.dropbox_token": "profile.dropbox_token"}});
  }});

export var setTelegramId = new ValidatedMethod({
  name: 'users.setTelegramId',
  validate: new SimpleSchema({
    id: {
      type: String
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ id }) {
    return Meteor.users.update({_id:this.userId},
      {$set:{"telegramId":id}});
  }});

export var setStoreLocation = new ValidatedMethod({
  name: 'users.setStoreLocation',
  validate: new SimpleSchema({
    storeLocation: {
      type: Boolean
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ storeLocation }) {
    return Meteor.users.update({_id:this.userId},
      {$set:{"storeLocation":storeLocation}});
  }});

export var setDropboxOauth = new ValidatedMethod({
  name: 'users.setDropboxOauth',
  validate: new SimpleSchema({
    access_token: {
      type: String
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ access_token }) {
    return Meteor.users.update({_id:this.userId},
      {$set:{"profile.dropbox_token":access_token}});
  }});

export var setMenuPin = new ValidatedMethod({
  name: 'users.setMenuPin',
  validate: new SimpleSchema({
    menuPin: {
      type: Boolean
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ menuPin }) {
    return Meteor.users.update({_id:this.userId}, {$set:{menuPin}});
  }});

export var setMuted = new ValidatedMethod({
  name: 'users.setMuted',
  validate: new SimpleSchema({
    muted: {
      type: Boolean
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ muted }) {
    return Meteor.users.update({_id:this.userId}, {$set:{muted}});
  }});

export var setTheme = new ValidatedMethod({
  name: 'users.setTheme',
  validate: new SimpleSchema({
    theme: {
      type: String
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ theme }) {
    return Meteor.users.update({_id:this.userId}, {$set:{theme}});
  }});

export var setLanguage = new ValidatedMethod({
  name: 'users.setLanguage',
  validate: new SimpleSchema({
    language: {
      type: String
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ language }) {
    return Meteor.users.update({_id:this.userId}, {$set:{language}});
  }});

const USER_METHODS = _.pluck([
  setTelegramId,
  setDropboxOauth,
  setMenuPin,
  setMuted,
  setTheme
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(USER_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 1000);
}

Meteor.users.deny({update() {
  return true;
}
});