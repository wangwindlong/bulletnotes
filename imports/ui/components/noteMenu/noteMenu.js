/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import './noteMenu.styl';
import './noteMenu.jade';

import {
  setShowContent,
  favorite
} from '/imports/api/notes/methods.js';

Template.noteMenu.onCreated(function() {
  return this.state = new ReactiveDict();
});

Template.noteMenu.helpers({

  showMenu() {
    return Template.instance().state.get('showMenu');
  },

  showEncrypt() {
    return Template.instance().state.get('showEncrypt');
  },

  showShare() {
    return Template.instance().state.get('showShare');
  },

  showMoveTo() {
    return Template.instance().state.get('showMoveTo');
  },

  noBody() {
    return !Template.instance().data.body;
  }
});

Template.noteMenu.events({

  'click .menuToggle'(event, instance) {
    event.stopImmediatePropagation();
    if (instance.state.get('showMenu') === true) {
      document.querySelector(`#menu_${instance.data._id}`).MaterialMenu.hide();
      return instance.state.set('showMenu', false);
    } else {
      instance.state.set('showMenu', true);
      // Give the menu time to render
      return instance.menuTimer = setTimeout(() => document.querySelector(`#menu_${instance.data._id}`).MaterialMenu.show()
      , 20);
    }
  },

  'click .zoom'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!Session.get('dragging')) {
      const title = $(instance.firstNode).closest('.noteContainer,.kanbanListItem').find('.title').first();
      const offset = title.offset();
      $(".mdl-layout__content").animate({ scrollTop: 0 }, 500);
      const headerOffset = $('.title-wrapper').offset();
      $('.title-wrapper').fadeOut();

      $('body').append(title.clone().addClass('zoomingTitle'));
      return $('.zoomingTitle').offset(offset).animate({
        left: headerOffset.left,
        top: headerOffset.top,
        color: 'white',
        fontSize: '20px'
      }, function() {
        $('.zoomingTitle').remove();
        return FlowRouter.go(`/note/${instance.data._id}/${FlowRouter.getParam('shareKey')||''}`);
      });
    }
  },


  'click .share'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    instance.state.set('showShare', true);

    const that = this;
    return setTimeout(function() {
      $(`#toggleShare_${that._id}`).click();
      return setTimeout(() => $('.modal.in').parent().append($('.modal-backdrop'))
      , 250);
    }
    , 50);
  },

  'click .indent'(event, instance) {
    return Meteor.call('notes.makeChild', {
      noteId: instance.data._id,
      parent: $(`#noteItem_${instance.data._id}`).prev().data('id'),
      shareKey: FlowRouter.getParam('shareKey')
    });
  },

  'click .unindent'(event, instance) {
    return Meteor.call('notes.makeChild', {
      noteId: instance.data._id,
      parent: $(`#noteItem_${instance.data._id}`).parentsUntil('.note-item').closest('.note-item').parentsUntil('.note-item').closest('.note-item').data('id'),
      shareKey: FlowRouter.getParam('shareKey')
    });
  },

  'click .favorite, click .unfavorite'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    return favorite.call({
      noteId: instance.data._id});
  },

  'click .moveTo'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    return Template.noteMenu.showMoveTo(instance);
  },

  'click .duplicate'(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return Meteor.call('notes.duplicate', {
      noteId: this._id
    });
  },

  'click .addBody'(event, instance) {
    return setShowContent.call({
      noteId: instance.data._id,
      showContent: true
    }
    , (err, res) =>
      setTimeout((() => $(event.target).closest('.noteContainer').find('.body').fadeIn().focus()), 20)
    );
  },

  'click a.delete'(event) {
    event.preventDefault();

    $(event.currentTarget).closest('.note').remove();
    return Meteor.call('notes.remove', {
      noteId: this._id,
      shareKey: FlowRouter.getParam('shareKey')
    }
    , function(err, res) {
      if (err) {
        return window.location = window.location;
      }
    });
  }
});

Template.noteMenu.showMoveTo = function(instance) {
    instance.state.set('showMoveTo', true);
    return setTimeout(function() {
      $(`#toggleMoveTo_${instance.data._id}`).click();
      return setTimeout(function() {
        $('.modal.in').parent().append($('.modal-backdrop'));
        return setTimeout(() => $('input.moveToInput').focus()
        , 500);
      }
      , 250);
    }
    , 50);
  };