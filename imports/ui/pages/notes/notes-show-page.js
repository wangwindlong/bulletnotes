/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Notes } from '/imports/api/notes/notes.js';

import { noteRenderHold } from '/imports/ui/launch-screen.js';
import './notes-show-page.jade'

// Components used inside the template
import '/imports/ui/pages/404/app-not-found.js';
import '/imports/ui/components/bulletNotes/bulletNotes.js';
import '/imports/ui/components/kanban/kanban.js';
import '/imports/ui/components/calendar/calendar.js';
import '/imports/ui/components/map/map.js';

Template.Notes_show_page.onCreated(function() {
  return this.getNoteId = () => FlowRouter.getParam('noteId');
});

Template.Notes_show_page.onRendered(function() {
  analytics.page('Note View');
  Session.set('searchTerm', FlowRouter.getParam('searchTerm'));
  return this.autorun(() => {
    if (Meteor.user()) {
      Meteor.call('notes.setChildrenLastShown', {
        noteId: FlowRouter.getParam('noteId')
      });
    }
    if (this.subscriptionsReady()) {
      return noteRenderHold.release();
    }
  });
});

Template.Notes_show_page.events({
  'focus .body'(event, instance) {
    Session.set('focused', true);
    return Template.bulletNoteItem.addAutoComplete(event.currentTarget);
  },

  'blur .body'(event, instance) {
    event.stopPropagation();
    const that = this;
    Session.set('focused', false);
    const body = Template.bulletNoteItem.stripTags(event.target.innerHTML);
    if (body !== Template.bulletNoteItem.stripTags(this.body)) {
      const note = Notes.findOne(FlowRouter.getParam('noteId', {
        fields: {
          _id: true
        }
      }
      )
      );
      Meteor.call('notes.updateBody', {
        noteId: note._id,
        body,
        shareKey: FlowRouter.getParam('shareKey')
      }, function(err, res) {
        that.body = body;
        return $(event.target).html(Template.bulletNotes.formatText(body));
      });
    }
    if (!body) {
      return $(event.target).fadeOut();
    }
  }
});

Template.Notes_show_page.helpers({
  showNotes() {
    if ((Session.get('viewMode') !== "kanban") && (Session.get('viewMode') !== "calendar") && (Session.get('viewMode') !== "map")) {
      return true;
    }
  },

  showKanban() {
    if (Session.get('viewMode') === "kanban") {
      return true;
    }
  },

  showCalendar() {
    if (Session.get('viewMode') === "calendar") {
      return true;
    }
  },

  showMap() {
    if (Session.get('viewMode') === "map") {
      return true;
    }
  },

  focusedNoteId() {
    return FlowRouter.getParam('noteId');
  },

  focusedNote() {
    return Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        _id: true,
        body: true,
        title: true,
        favorite: true
      }
    }
    )
    );
  },

  focusedNoteFiles() {
    Meteor.subscribe('files.note', FlowRouter.getParam('noteId'));
    return Files.find({ noteId: FlowRouter.getParam('noteId') });
  },

  favorited() {
    const note = Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        _id: true,
        favorite: true
      }
    }
    )
    );
    if (note.favorite) {
      return 'favorited';
    }
  },

  progress() {
    setTimeout(() => $('[data-toggle="tooltip"]').tooltip()
    , 100);
    const note = Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        _id: true
      }
    }
    )
    );
    if (note) {
      return note.progress;
    }
  },

  progressClass() {
    const note = Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        _id: true
      }
    }
    )
    );
    return Template.bulletNotes.getProgressClass(note);
  },

  searchTerm() {
    return FlowRouter.getParam('searchTerm');
  },

  // We use #each on an array of one item so that the "note" template is
  // removed and a new copy is added when changing notes, which is
  // important for animation purposes.
  noteIdArray() {
    const instance = Template.instance();
    const noteId = instance.getNoteId();
    if (noteId) {
      if (Notes.findOne(noteId)) { return [ noteId ]; } else { return []; }
    } else {
      if (!Meteor.user() && !Session.get('introLoaded')) {
        return FlowRouter.go('/intro');
      } else {
        return [ 0 ];
      }
    }
  },

  noteArgs(noteId) {
    let ret;
    const instance = Template.instance();
    // By finding the note with only the `_id` field set,
    // we don't create a dependency on the
    // `note.incompleteCount`, and avoid re-rendering the todos when it changes
    const note = Notes.findOne(noteId, {
      fields: {
        _id: true
      }
    }
    );

    return ret = {
      todosReady: instance.subscriptionsReady(),
      // We pass `note` (which contains the full note, with all fields, as a function
      // because we want to control reactivity. When you check a todo item, the
      // `note.incompleteCount` changes. If we didn't do this the entire note would
      // re-render whenever you checked an item. By isolating the reactiviy on the note
      // to the area that cares about it, we stop it from happening.
      note() {
        return Notes.findOne(noteId);
      }
    };
  }
});
