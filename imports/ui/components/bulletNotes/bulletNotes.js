/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';
import SimpleSchema from 'simpl-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import sanitizeHtml from 'sanitize-html';

import { Notes } from '/imports/api/notes/notes.js';
import { Files } from '/imports/api/files/files.js';

import './bulletNotes.jade';

import '/imports/ui/components/breadcrumbs/breadcrumbs.js';
import '/imports/ui/components/footer/footer.js';
import '/imports/ui/components/bulletNoteItem/bulletNoteItem.js';

import {
  updateTitle,
  makePublic,
  makePrivate,
  remove,
  insert,
  makeChild
} from '/imports/api/notes/methods.js';

const { displayError } = '../../lib/errors.js';

// URLs starting with http://, https://, or ftp://
Template.bulletNotes.urlPattern1 =
  /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

// URLs starting with "www." (without // before it
// or it'd re-link the ones done above).
Template.bulletNotes.urlPattern2 =
  /(^|[^\/])(www\.[\S]+(\b|$))/gim;

Template.bulletNotes.onCreated(function() {
  if (this.data.showChildren && this.data.children && !FlowRouter.getParam('searchParam')) {
    Meteor.call('notes.setChildrenLastShown', {
      noteId: this.data._id
    });
  }

  this.state = new ReactiveDict();
  this.state.setDefault({
    showComplete: false});

  if (this.data.note()) {
    this.noteId = this.data.note()._id;
  } else {
    this.noteId = null;
  }

  this.favoriteNote = () => {
    return Meteor.call('notes.favorite',
      {noteId: this.data.note()._id});
  };

  return this.deleteNote = () => {
    const note = this.data.note();
    const title = sanitizeHtml(note.title,
      {allowedTags: []});
    const message = `${TAPi18n.__('notes.remove.confirm')} “`+title+"”?";
    if (confirm(message)) {
      remove.call({ noteId: note._id }, displayError);

      FlowRouter.go('App.home');
      return true;
    }
    return false;
  };
});

Template.bulletNotes.onRendered(function() {
  $('.title-wrapper').show();
  Template.App_body.recordEvent('notesRendered', {owner: this.userId});

  return setTimeout(function() {
    $('.fileItem').draggable({
      revert: true});

    return $('.noteContainer').droppable({
      drop(event, ui ) {
        event.stopImmediatePropagation();
        return Meteor.call('files.setNote', {
          fileId: ui.draggable.context.dataset.id,
          noteId: $(event.target).parent().data('id')
        }
        );
      }
    });
  }
  , 1500);
});
  
Template.bulletNotes.helpers({
  notes() {
    NProgress.done();
    let parentId = null;
    if (this.note()) {
      parentId = this.note()._id;
    }

    Meteor.subscribe('notes.children',
      parentId,
      FlowRouter.getParam('shareKey'));

    if (FlowRouter.getParam('searchTerm')) {
      return Notes.search(FlowRouter.getParam('searchTerm'));
    } else if (parentId) {
      if (Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete')) {
        return Notes.find({ parent: parentId }, {sort: { complete: 1, rank: 1 }});
      } else {
         return Notes.find({ parent: parentId, complete: false }, {sort: { rank: 1 }});
       }
    } else {
      if (Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete')) {
        return Notes.find({ parent: null }, {sort: { complete: 1, rank: 1 }});
      } else {
         return Notes.find({ parent: null, complete: false }, {sort: { rank: 1 }});
       }
    }
  },

  notesReady() {
    return Template.instance().subscriptionsReady();
  },

  focusedNote() {
    return Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        _id: true,
        body: true,
        title: true,
        favorite: true,
        children: true
      }
    }
    )
    );
  },

  focusedNoteFiles() {
    Meteor.subscribe('files.note', FlowRouter.getParam('noteId'));
    try {
      return Files.find({ noteId: FlowRouter.getParam('noteId') });
    } catch (e) {
      return console.log(e);
    }
  },

  focusedNoteBody() {
    const note = Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        _id: true,
        title: true
      }
    }
    )
    );
    return emojione.shortnameToUnicode(note.body);
  },

  showComplete() {
    return Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete');
  },

  alwaysShowComplete() {
    return Session.get('alwaysShowComplete');
  },

  completedCount() {
    if (this.note()) {
      return Notes.find({ parent: this.note()._id, complete: true }).count();
    } else {
      return Notes.find({ parent: null, complete: true }).count();
    }
  }
});

Template.bulletNotes.events({
  'click .toggleComplete'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    return instance.state.set('showComplete',!instance.state.get('showComplete'));
  },

  'click .toggleAlwaysShowComplete'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    return Session.set('alwaysShowComplete',!Session.get('alwaysShowComplete'));
  },

  'keydown input[type=text]'(event) {
    // ESC
    if (event.which === 27) {
      event.preventDefault();
      return $(event.target).blur();
    }
  },

  'mousedown .js-cancel, click .js-cancel'(event, instance) {
    event.preventDefault();
    return instance.state.set('editing', false);
  },

  'click .uploadHeaderBtn'(event, instance) {
    const input = $(document.createElement('input'));
    input.attr("type", "file");
    input.trigger('click');
    return input.change(function(submitEvent) {
      const file = submitEvent.currentTarget.files[0];
      const { name } = file;
      return Template.bulletNoteItem.encodeImageFileAsURL(res =>
        upload.call({
          noteId: instance.data.note()._id,
          data: res,
          name
        }, (err, res) => $(event.currentTarget).closest('.noteContainer').removeClass('dragging'))
      
      , file);
    });
  },

  'click .newNote'(event, instance) {
    let children, parent, rank;
    const note = Notes.findOne(Template.currentData().note());
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
  },

  'change .note-edit'(event, instance) {
    const { target } = event;
    if ($(target).val() === 'edit') {
      instance.editNote();
    } else if ($(target).val() === 'delete') {
      instance.deleteNote();
    } else if ($(target).val() === 'favorite') {
      instance.favoriteNote();
    } else if ($(target).val() === 'calendar') {
      FlowRouter.go(`/calendar/${instance.data.note()._id}`);
    } else if ($(target).val() === 'kanban') {
      FlowRouter.go(`/kanban/${instance.data.note()._id}`);
    }
    return target.selectedIndex = 0;
  },

  'blur .title-wrapper'(event, instance) {
    event.stopPropagation();
    const title = Template.bulletNoteItem.stripTags(event.target.innerHTML);
    if (title !== this.title) {
      return Meteor.call('notes.updateTitle', {
        noteId: instance.data.note()._id,
        title
        // FlowRouter.getParam 'shareKey',
      }, (err, res) => $(event.target).html(Template.bulletNotes.formatText(title)));
    }
  }
});

Template.bulletNotes.formatText = function(inputText, createLinks) {
  let element;
  if (createLinks == null) { createLinks = true; }
  if (!inputText) {
    return;
  }
  if (createLinks) {
    element = 'a';
  } else {
    element = 'span';
  }

  let replacedText = undefined;
  const replacePattern1 = undefined;
  const replacePattern2 = undefined;
  let replacePattern3 = undefined;

  replacedText = inputText.replace(/&nbsp;/gim, ' ');
  replacedText = replacedText.replace(Template.bulletNotes.urlPattern1,
    `<${element} href="$1" target="_blank" class="previewLink">$1</${element}>`);
  replacedText = replacedText.replace(Template.bulletNotes.urlPattern2,
    `<${element} href="http://$2" target="_blank" class="previewLink">$2</${element}>`);

  // Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(replacePattern3,
    `<${element} href="mailto:$1">$1</${element}>`);

  // Highlight Search Terms
  // searchTerm = new RegExp(FlowRouter.getParam('searchTerm'),"gi")
  // replacedText = replacedText.replace searchTerm,
  //   '<span class=\'searchResult\'>$&</span>'

  replacedText = replacedText.replace(Notes.hashtagPattern,
    ` <${element} href="/search/%23$4" class="tagLink tag-$4">#$4</${element}>`);

  replacedText = replacedText.replace(Notes.namePattern,
    ` <${element} href="/search/%40$4" class="atLink at-$4">@$4</${element}>`);

  replacedText = emojione.shortnameToUnicode(replacedText);

  return replacedText;
};

Template.bulletNotes.rendered = function() {
  const notes = this;
  NProgress.done();
  $('.mdl-layout__tab-bar').animate({
    scrollLeft: $('.mdl-layout__tab-bar-container').innerWidth()+500
  });

  // $('#notes').selectable
  //   delay: 150
  return $('.sortable').nestedSortable({
    handle: '.handle',
    items: 'li.note-item',
    placeholder: 'placeholder',
    opacity: .6,
    toleranceElement: '> div.noteContainer',

    stop(event, ui) {
      Session.set('dragging', false);
      return $('.sortable').removeClass('sorting');
    },

    sort(event, ui) {
      Session.set('dragging', true);
      return $('.sortable').addClass('sorting');
    },

    revert(event, ui) {
      Session.set('dragging', false);
      return $('.sortable').removeClass('sorting');
    },

    update(event, ui) {
      let parent = $(ui.item).closest('ol').closest('li').data('id');
      if (!parent) {
        parent = FlowRouter.getParam('noteId');
      }
      let upperSibling 
      let lowerSibling

      upperSibling = $(ui.item).closest('li').prev('li')[0] && Blaze.getData($(ui.item).closest('li').prev('li')[0])
      lowerSibling = $(ui.item).closest('li').next('li')[0] && Blaze.getData($(ui.item).closest('li').next('li')[0])

      Session.set('dragging', false);
      $('.sortable').removeClass('sorting');

      if (!upperSibling && !lowerSibling) {
        return makeChild.call({
          noteId: $(ui.item).closest('li').data('id'),
          shareKey: FlowRouter.getParam('shareKey'),
          rank: 1,
          parent
        });
      } else if (!upperSibling) {
        return makeChild.call({
          noteId: $(ui.item).closest('li').data('id'),
          shareKey: FlowRouter.getParam('shareKey'),
          rank: lowerSibling.rank - 1,
          parent
        });
      } else if (!lowerSibling) {
        return makeChild.call({
          noteId: $(ui.item).closest('li').data('id'),
          shareKey: FlowRouter.getParam('shareKey'),
          rank: upperSibling.rank + 1,
          parent
        });
      } else {
        return makeChild.call({
          noteId: $(ui.item).closest('li').data('id'),
          shareKey: FlowRouter.getParam('shareKey'),
          rank: (upperSibling.rank + lowerSibling.rank) / 2,
          parent
        }); 
      }
    }
  });
};

Template.bulletNotes.getProgressClass = function(note) {
  if (note.progress < 25) {
    return 'danger';
  } else if (note.progress > 74) {
    return 'success';
  } else {
    return 'warning';
  }
};
