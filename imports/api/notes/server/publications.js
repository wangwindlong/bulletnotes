/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Meteor } = require('meteor/meteor');
const { check } = require('meteor/check');
const { Match } = require('meteor/check');
const { Notes, NoteLogs } = require('../notes.js');

Meteor.publish('notes.all', function() {
  return Notes.find({
    owner: this.userId,
    deleted: {
      $exists: false
    }
  });
});

Meteor.publish('notes.count.user', function() {
  return new Counter('notes.count.user', Notes.find({
    owner: this.userId,
    deleted: {$exists: false}}));
});

const totalNotes = new Counter('notes.count.total', Notes.find({}));
Meteor.publish('notes.count.total', () => totalNotes);

const recentNotes = new Counter('notes.count.recent', Notes.find(
    {
        createdAt: { $gte :  moment().subtract(24, 'hours').toDate()  }
    }, {})
);

Meteor.publish('notes.count.recent', () => recentNotes);

Meteor.publish('notes.calendar', function() {
  return Notes.find({
    owner: this.userId,
    due: {$exists: true},
    deleted: {$exists: false}});
});

Meteor.publish('notes.logs', function(noteId, shareKey = null) {
  check(noteId, Match.Maybe(String));
  check(shareKey, Match.Maybe(String));
  if (shareKey) {
    if (Notes.getSharedParent(noteId, shareKey)) {
    // We have a valid shared parent key for this noteid and shareKey
    // Go ahead and return the requested note.
      let note;
      return note = Notes.find({
        _id: noteId,
        deleted: {$exists: false}});
    }
  } else {
    return NoteLogs.find({
      user_id: this.userId,
      "context.noteId": noteId
    });
  }
});

Meteor.publish('notes.view', function(noteId, shareKey = null) {
  let note;
  check(noteId, Match.Maybe(String));
  check(shareKey, Match.Maybe(String));
  if (shareKey) {
    if (Notes.getSharedParent(noteId, shareKey)) {
    // We have a valid shared parent key for this noteid and shareKey
    // Go ahead and return the requested note.
      note = Notes.find({
        _id: noteId,
        deleted: {$exists: false}});
    }
  } else {
    note = Notes.find({
      owner: this.userId,
      _id: noteId,
      deleted: {$exists: false}});
  }

  return note;
});

Meteor.publish('notes.children', function(noteId, shareKey = null) {
  let notes;
  check(noteId, Match.Maybe(String));
  check(shareKey, Match.Maybe(String));
  if (shareKey) {
    const note = Notes.findOne(noteId);
    // If we don't have a valid shared note, look at the parents,
    // is one of them valid?
    if (Notes.getSharedParent(noteId, shareKey)) {
      // One of the parents is validly shared, return the original note
      return notes = Notes.find({
        parent: noteId,
        deleted: {$exists: false}});
    }
  } else {
    return notes = Notes.find({
      owner: this.userId,
      parent: noteId,
      deleted: {$exists: false}});
  }
});

Meteor.publish('notes.favorites', function() {
  return Notes.find({
    owner: this.userId,
    favorite: true,
    deleted: {$exists: false}});
});

Meteor.publish('notes.search', function(search) {
  return Notes.search(search, this.userId);
});
