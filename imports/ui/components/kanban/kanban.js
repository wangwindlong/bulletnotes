/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { Notes } = require('/imports/api/notes/notes.js');

require('./kanban.jade');
require('/imports/ui/components/kanbanList/kanbanList.js');

import {
  makeChild
} from '/imports/api/notes/methods.js';

Template.kanban.onRendered(function() {
  NProgress.done();
  return $('.kanbanChildNotes').sortable({
    connectWith: '.kanbanChildNotes',
    handle: '.dot',
    update(event, ui) {
      const parent = $(event.target).closest('.kanbanList').data('id');
      const upperSibling = $(ui.item[0]).prev('li').data('id');
      if (upperSibling) {
        return makeChild.call({
          noteId: $(ui.item[0]).data('id'),
          shareKey: FlowRouter.getParam('shareKey'),
          upperSibling,
          parent,
          expandParent: false
        });
      } else {
        return makeChild.call({
          noteId: $(ui.item[0]).data('id'),
          shareKey: FlowRouter.getParam('shareKey'),
          upperSibling,
          parent,
          rank: 0
        });
      }
    }
  });
});

Template.kanban.helpers({
  focusedNote() {
    return Notes.findOne(FlowRouter.getParam('noteId'));
  },
  childNotes() {
    return Notes.find({
      parent: FlowRouter.getParam('noteId')
    }, {sort: {rank: 1}});
  }
});

Template.kanban.events({
  'click .newKanbanList header'(event, instance) {
    let children, parent, rank;
    const note = Notes.findOne(FlowRouter.getParam('noteId'));
    if (note) {
      children = Notes.find({ parent: note._id });
      parent = note._id;
    } else {
      children = Notes.find({ parent: null });
      parent = null;
    }
    if (children) {
      // Overkill, but, meh. It'll get sorted. Literally.
      rank = (children.count() * 40);
    } else {
      rank = 1;
    }
    return Meteor.call('notes.insert', {
      title: '',
      rank,
      parent,
      shareKey: FlowRouter.getParam('shareKey')
    }, function(err, res) {
      if (err) {
         return Template.App_body.showSnackbar({
           message: err.message});
       }
    });
  }
});
