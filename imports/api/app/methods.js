/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const pjson = require('/package.json');
const { Meteor } = require('meteor/meteor');

Meteor.methods({
  'version'(version) {
    return pjson.version;
  }
});
