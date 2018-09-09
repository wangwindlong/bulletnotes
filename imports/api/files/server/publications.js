/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Meteor } = require('meteor/meteor');
const { check } = require('meteor/check');
const { Match } = require('meteor/check');
const { Files } = require('./files.js');

Meteor.publish('files.note', function(noteId) {
  check(noteId, Match.Maybe(String));
  return Files.find({
    noteId,
    deleted: {$exists: false}
  }).cursor;
});