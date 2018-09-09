/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

import { Notes } from '/imports/api/notes/notes.js';
import { Files } from './files.js';

export var remove = new ValidatedMethod({
  name: 'files.remove',
  validate: new SimpleSchema({
    id: Notes.simpleSchema().schema('_id')})
  .validator({
    clean: true,
    filter: false
  }),
  run({ id }) {
    const file = Files.findOne(id);
    if (this.userId !== file.userId) {
      throw new (Meteor.Error)('not-authorized');
    }
    Meteor.users.update(this.userId, {
      $inc: {
        uploadedFilesSize: file.size * -1
      }
    }
    );
    return Files.remove({ _id: id });
  }});

export var setNote = new ValidatedMethod({
  name: 'files.setNote',
  validate: new SimpleSchema({
    fileId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    },
    noteId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ fileId, noteId }) {
    const file = Files.findOne(fileId);
    if (file.userId !== Meteor.userId()) {
      throw new (Meteor.Error)('not-authorized');
    }

    return Files.update(fileId, { $set: {
      noteId
    }
  }
    );
  }
});

// Get note of all method names on Notes
const FILES_METHODS = _.pluck([
  remove,
  setNote
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(FILES_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 1000);
}
