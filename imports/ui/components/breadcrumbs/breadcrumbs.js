/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { Notes } = require('../../../api/notes/notes.js');
require('./breadcrumbs.jade');

Template.breadcrumbs.helpers({
  parents() {
    const parents = [];
    const note = Template.instance().data.note();
    if (note) {
      let parent = Notes.findOne(note.parent, {
        fields: {
          _id: true,
          parent: true,
          title: true
        }
      }
      );
      while (parent) {
        parents.unshift(parent);
        parent = Notes.findOne(parent.parent, {
          fields: {
            _id: true,
            parent: true,
            title: true
          }
        }
        );
      }
    }
    return parents;
  },

  focusedTitle() {
    const note = Notes.findOne(FlowRouter.getParam('noteId'));
    if (note) {
      return emojione.shortnameToUnicode(note.title);
    }
  },

  focusedId() {
    const note = Notes.findOne(FlowRouter.getParam('noteId'));
    if (note) {
      return note._id;
    }
  },

  title() {
    return emojione.shortnameToUnicode(this.title);
  },

  shareKey() {
    return FlowRouter.getParam('shareKey');
  },

  showingNotes() {
    if (((FlowRouter.getRouteName() !== "join") && (FlowRouter.getRouteName() !== "signin") && (FlowRouter.getRouteName() !== "App.intro")) || ((FlowRouter.getRouteName() === "App.intro") && Meteor.user())) {
      return true;
    }
  }
});

Template.breadcrumbs.events({
  "click a"(event, template) {
    if ($(event.currentTarget).hasClass('is-active')) {
      return false;
    }

    if ($(event.currentTarget).hasClass('home') && (window.location.pathname === '/')) {
      return false;
    }

    event.preventDefault();
    $('input.search').val('');

    const offset = $(event.currentTarget).offset();
    $(".mdl-layout__content").animate({ scrollTop: 0 }, 100);
    const headerOffset = $('.title-wrapper').offset();
    $('.title-wrapper').fadeOut();

    $('body').append($(event.currentTarget).clone().addClass('zoomingTitle'));
    return $('.zoomingTitle').offset(offset).animate({
      left: headerOffset.left,
      top: headerOffset.top,
      color: 'white',
      fontSize: '20px'
    }, 100, 'swing', function() {
      $('.zoomingTitle').remove();
      return FlowRouter.go(event.currentTarget.pathname);
    });
  }
});
