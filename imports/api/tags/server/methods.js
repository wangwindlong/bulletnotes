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

export var updateNoteTags = new ValidatedMethod({
  name: 'tags.updateNoteTags',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id')})
  .validator({
    clean: true,
    filter: false
  }),
  run({ noteId }) {
    if (!Meteor.user() && !Meteor.isServer) {
      throw new (Meteor.Error)('not-authorized');
    }

    return Meteor.defer(function() {
      const note = Notes.findOne(noteId);

      if (note.title) {

        const pattern = /#pct-([0-9]+)/gim;
        let match = pattern.exec(note.title);
        if (match) {
          return Notes.update(noteId, {$set: {
            progress: match[1]
          }});
        } else {
          // If there is not a defined percent tag (e.g., #pct-20)
          // then calculate the #done rate of notes
          const notes = Notes.find({ parent: note.parent, deleted: {$exists: false} });
          let total = 0;
          let done = 0;
          notes.forEach(function(note) {
            total++;
            if (note.title) {
              match = note.title.match(Notes.donePattern);
              if (match) {
                return done++;
              }
            }
          });
          return Notes.update(note.parent, {$set: {
            progress: Math.round((done/total)*100)
          }});
        }
      }});
  }});


        // tags = note.title.match Notes.hashtagPattern
        // if tags
        //   tags.forEach (tag) ->
        //     console.log "Save a link to tag: "+tag

        // tags = note.title.match Notes.namePattern
        // if tags
        //   tags.forEach (tag) ->
        //     console.log "Save a link to dude: "+tag

// Get note of all method names on Notes
const TAGS_METHODS = _.pluck([
  updateNoteTags
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(TAGS_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 1000);
}
