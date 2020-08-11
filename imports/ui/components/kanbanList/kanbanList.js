/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { ReactiveDict } = require('meteor/reactive-dict');
const { Notes } = require('/imports/api/notes/notes.js');

require('./kanbanList.jade');
require('/imports/ui/components/kanbanListItem/kanbanListItem.js');

Template.kanbanList.helpers({
  className() {
    let className = '';

    if (!this.title) {
      className += ' noTitle';
    }
    return className;
  },

  childNotes() {
    return Notes.find({
      parent: this._id
    }, { sort: {
      complete: 1,
      rank: 1
    }
  });
  },

  title() {
    if (this.title) {
      return this.title;
    } else {
      return '( Click to add a title )';
    }
  },

  kanbanListTitleArgs(note) {
    const data = {
      note
    };
    return data;
  },

  kanbanListBodyArgs(note) {
    const data = {
      note
    };
    return data;
  },

  fileArgs(file) {
    return {
      file,
      note: Notes.findOne(file.noteId)
    };
  }});

Template.kanbanList.events({
  'click footer'(event, instance) {
    let rank;
    const parent = instance.data._id;
    const children = Notes.find({ parent });
    if (children) {
      // Overkill, but, meh. It'll get sorted. Literally.
      rank = (children.count() * 40);
    } else {
      rank = 1;
    }
    Meteor.call('notes.insert', {
      title: '',
      rank,
      parent,
      shareKey: FlowRouter.getParam('shareKey')
    });
    $(instance.firstNode).children(".kanbanChildNotes").animate({ scrollTop: $(instance.firstNode).children(".kanbanChildNotes")[0].scrollHeight }, 200);
    return $(instance.firstNode).find(".title").last().focus();
  }
});