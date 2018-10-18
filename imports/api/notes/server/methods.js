/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
const Dropbox = require('dropbox');

import childCountDenormalizer from '/imports/api/notes/childCountDenormalizer.js';

import { Notes } from '/imports/api/notes/notes.js';

export var notesExport = new ValidatedMethod({
  name: 'notes.export',
  validate: new SimpleSchema({
    noteId: {
      type: String,
      optional: true
    },
    userId: Notes.simpleSchema().schema('owner'),
    level: Notes.simpleSchema().schema('level')}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    let obj = args[0],
      val = obj.noteId,
      noteId = val != null ? val : null,
      val1 = obj.userId,
      userId = val1 != null ? val1 : null,
      val2 = obj.level,
      level = val2 != null ? val2 : 0;
    if (!userId) {
      ({ userId } = this);
    }
    if (!userId) {
      throw new (Meteor.Error)('not-authorized - no userId');
    }

    const topLevelNotes = Notes.find({
      parent: noteId,
      owner: userId,
      deleted: {$exists: false}
    }, {sort: {rank: 1}});
    let exportText = '';
    topLevelNotes.forEach(function(note) {
      const spacing = new Array(level * 5).join(' ');
      exportText += spacing + '- ';
      if (note.title) {
        exportText += note.title;
      }
      exportText += '\n';
      if (note.body) {
        exportText += spacing + '  "' + note.body + '"\n';
      }
      return exportText = exportText + notesExport.call({
        noteId: note._id,
        userId,
        level: level+1
      });});
    return exportText;
  }
});

export var dropboxExport = new ValidatedMethod({
  name: 'notes.dropboxExport',
  validate: null,
  run() {
    const user = Meteor.user();
    if (
      user.profile &&
      user.profile.dropbox_token
    ) {
      const exportText = notesExport.call({
        noteId: null,
        userId: user._id
      });
      const dbx = new Dropbox({
        accessToken: user.profile.dropbox_token
      });
      return dbx.filesUpload({
        path: `/BulletNotes${moment().format('-YYYY-MM-DD')}.txt`,
        contents: exportText}).then(response => console.log(response)).catch(function(error) {
        console.error(error);
        throw new (Meteor.Error)(error);
      });
    } else {
      throw new (Meteor.Error)('No linked Dropbox account');
    }
  }
});

export var dropboxNightly = new ValidatedMethod({
  name: 'notes.dropboxNightly',
  validate: null,
  run() {
    const users = Meteor.users.find({
      isPro:true
    });
    return users.forEach(function(user) {
      if (
        user.profile &&
        user.profile.dropbox_token
      ) {
        const exportText = notesExport.call({
          noteId: null,
          userId: user._id
        });
        const dbx = new Dropbox({
          accessToken: user.profile.dropbox_token
        });
        return dbx.filesUpload({
          path: `/BulletNotes${moment().format('-YYYY-MM-DD')}.txt`,
          contents: exportText}).then(response => console.log(response)).catch(error => console.error(error));
      }
    });
  }
});

export var inbox = new ValidatedMethod({
  name: 'notes.inbox',
  validate: new SimpleSchema({
    title: Notes.simpleSchema().schema('title'),
    body: Notes.simpleSchema().schema('body'),
    userId: Notes.simpleSchema().schema('_id'),
    parentId: {
      type: String,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  // userId has already been translated from apiKey by notes/routes by the time it gets here
  run(...args) {
    // If we have a parent note to put it under, use that. But make sure we have write permissions.
    let obj = args[0],
      { title,
      body,
      userId } = obj,
      val = obj.parentId,
      parentId = val != null ? val : null;
    if (parentId) {
      const note = Notes.findOne({
        owner: userId,
        _id: parentId
      });

      if (!note) {        
        // No permission, or no note. Just quit.
        false;
      }

    // We don't have a specific note to put this under, put it in the Inbox
    } else {
      inbox = Notes.findOne({
        owner: userId,
        inbox: true,
        deleted: {$exists:false}});

      // If there is not an existing Inbox note, create one.
      if (!inbox) {
        parentId = Notes.insert({
          title: ":inbox_tray: <b>Inbox</b>",
          createdAt: new Date(),
          owner: userId,
          inbox: true,
          showChildren: true,
          complete: false
        });

      // Otherwise, use the existing inbox
      } else {
        parentId = inbox._id;
      }
    }

    if (parentId) {
      const noteId = Notes.insert({
        title,
        body,
        owner: userId,
        createdAt: new Date(),
        complete: false
      });

      Meteor.call('notes.makeChild', {
        noteId,
        parent: parentId,
      })

      Meteor.call('notes.updateTitle', {
        noteId,
        title,
        createTransaction: false
      }
      );

      Meteor.users.update(userId,
        {$inc:{"notesCreated":1}});

      return noteId;
    }
  }
});

export var summary = new ValidatedMethod({
  name: 'notes.summary',
  validate: null,
  run() {
    const users = Meteor.users.find({});
    return users.forEach(function(user) {
      if (user.emails) {
        const email = user.emails[0].address;
        const notes = Notes.search('last-changed:24h', user._id);
        SSR.compileTemplate( 'Email_summary', Assets.getText( 'email/summary.html' ) );
        const html = SSR.render('Email_summary', {
          site_url: Meteor.absoluteUrl(),
          notes
        }
        );
        return Email.send({
          to: email,
          from: "BulletNotes.io <admin@bulletnotes.io>",
          subject: "Daily Activity Summary",
          html
        });
      }
    });
  }
});

// We don't add this to to rate limiter because imports hit it a bunch. Hence the defer.
export var denormalizeChildCount = new ValidatedMethod({
  name: 'notes.denormalizeChildCount',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id')})
  .validator({
    clean: true,
    filter: false
  }),
  run({ noteId }) {
    return Meteor.defer(() => childCountDenormalizer.afterInsertNote(noteId));
  }
});

// Get note of all method names on Notes
const NOTES_METHODS = _.pluck([
  notesExport,
  dropboxExport,
  dropboxNightly,
  summary,
  inbox
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(NOTES_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 1000);
}
