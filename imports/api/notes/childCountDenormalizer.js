/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let childCountDenormalizer;
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

import { Notes } from './notes.js';

export default childCountDenormalizer = {
  _updateNote(noteId) {
    // Recalculate the correct incomplete count direct from MongoDB
    const childCount = Notes.find({
      parent: noteId,
      deleted: {$exists: false}})
    .count();

    return Notes.update(noteId, {$set: {children: childCount}});
  },

  afterInsertNote(noteId) {
    return this._updateNote(noteId);
  },

  afterRemoveNotes(notes) {
    return notes.forEach(note => {
      return this._updateNote(note.noteId);
    });
  }
};
