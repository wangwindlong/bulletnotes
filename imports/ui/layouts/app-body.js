/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Template } from 'meteor/templating';
import { ActiveRoute } from 'meteor/zimme:active-route';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { Notes } from '/imports/api/notes/notes.js';
import { insert } from '/imports/api/notes/methods.js';

import '/imports/ui/components/loading/loading.js';
import '/imports/ui/components/menu/menu.js';
import './app-body.jade';
import '/imports/ui/lib/emoji.js';

const CONNECTION_ISSUE_TIMEOUT = 5000;
// A store which is local to this file?
const showConnectionIssue = new ReactiveVar(false);
Meteor.startup(function() {
  // Keen.io analytics
  !(function(name, path, ctx) {
    let latest = undefined;
    const prev = (name !== 'Keen') && window.Keen ? window.Keen : false;
    ctx[name] = ctx[name] ||{ ready(fn) {
      const h = document.getElementsByTagName('head')[0];
      const s = document.createElement('script');
      const w = window;
      let loaded = undefined;
      s.onload = (s.onerror =
      (s.onreadystatechange = function() {
        if ((s.readyState && !/^c|loade/.test(s.readyState)) || loaded) {
          return;
        }
        s.onload = (s.onreadystatechange = null);
        loaded = 1;
        latest = w.Keen;
        if (prev) {
          w.Keen = prev;
        } else {
          try {
            delete w.Keen;
          } catch (e) {
            w.Keen = undefined;
          }
        }
        ctx[name] = latest;
        ctx[name].ready(fn);
      }));

      s.async = 1;
      s.src = path;
      h.parentNode.insertBefore(s, h);
    }
  };
  })('KeenAsync', 'https://d26b395fwzu5fz.cloudfront.net/keen-tracking-1.1.3.min.js', this);
  KeenAsync.ready(function() {
    // Configure a client instance
    Template.App_body.keenClient = new KeenAsync({
      projectId: Meteor.settings.public.keenProjectId,
      writeKey: Meteor.settings.public.keenWriteKey
    });
    // Record an event
    Template.App_body.keenClient.recordEvent('pageviews', {title: document.title});
  });

  // Hotjar Analytics
  (function(h, o, t, j, a, r) {
    h.hj = h.hj || function() {
      (h.hj.q = h.hj.q || []).push(arguments);
    };
    h._hjSettings = {
      hjid: 697822,
      hjsv: 6
    };
    a = o.getElementsByTagName('head')[0];
    r = o.createElement('script');
    r.async = 1;
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

  NProgress.start();
  // Only show the connection error box if it has been 5 seconds since
  // the app started
  $(document).on('keydown', function(event) {
    const editingNote = $(document.activeElement).hasClass('title');
    const menuVisible = $('#container').hasClass('menu-open');
    switch (event.keyCode) {
      // f - find / search
      case 70:
        if (Template.App_body.shouldNav()) {
          event.preventDefault();
          $('.searchIcon').addClass('is-focused');
          $('.search').focus();
          return $(".mdl-layout__content").animate({ scrollTop: 0 }, 100);
        }
        break;

      // ` Back Tick - toggle menu
      case 192:
        if (Template.App_body.shouldNav()) {
          if (Meteor.user() && Meteor.user().menuPin) {
            Meteor.call('users.setMenuPin', {menuPin:false});
            return Template.App_body.showSnackbar({
              message: "Menu unpinned"});
          } else {
            Meteor.call('users.setMenuPin', {menuPin:true});
            return Template.App_body.showSnackbar({
              message: "Menu pinned"});
          }
        }
        break;
      // , comma - load settings
      case 188:
        if (Template.App_body.shouldNav()) {
          return FlowRouter.go('/settings');
        }
        break;
      // 0
      // Home
      case 48: case 36:
        if (Template.App_body.shouldNav()) {
          return FlowRouter.go('/');
        }
        break;
      // 1
      case 49:
        return Template.App_body.loadFavorite(event, 1);
      // 2
      case 50:
        return Template.App_body.loadFavorite(event, 2);
      // 3
      case 51:
        return Template.App_body.loadFavorite(event, 3);
      // 4
      case 52:
        return Template.App_body.loadFavorite(event, 4);
      // 5
      case 53:
        return Template.App_body.loadFavorite(event, 5);
      // 6
      case 54:
        return Template.App_body.loadFavorite(event, 6);
      // 7
      case 55:
        return Template.App_body.loadFavorite(event, 7);
      // 8
      case 56:
        return Template.App_body.loadFavorite(event, 8);
      // 9
      case 57:
        return Template.App_body.loadFavorite(event, 9);
    }
  });

  setTimeout((function() {
    // FIXME:
    // Launch screen handle created in lib/router.js
    // dataReadyHold.release();
    // Show the connection error box
    showConnectionIssue.set(true);
  }), CONNECTION_ISSUE_TIMEOUT);
});

Template.App_body.onRendered(function() {

  $.urlParam = function(name) {
    const results = new RegExp(`[?&]${name}=([^&#]*)`).exec(window.location.href);
    if (results) {
      return results[1] || 0;
    }
  };

  Session.set('referral', $.urlParam('ref'));

  return $(window).keydown(function(event) {
    // If we aren't editing anything
    if ($(':focus').length < 1) {

      // Up or down
      if ((event.keyCode === 40) || (event.keyCode === 38)) {
        event.preventDefault();
        Template.bulletNoteItem.focus($('.title').first()[0]);
      }

      // Cmd + Z Undo
      if ((event.keyCode === 90) && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        return tx.undo();

      // Cmd + Y Redo
      } else if ((event.keyCode === 89) && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        return tx.redo();
      }
    }
  });
});

Template.App_body.onCreated(function() {
  const NoteSubs = new SubsManager;
  const self = this;
  self.ready = new ReactiveVar;
  return self.autorun(function() {
    Meteor.subscribe('users.prefs');
    const handle = NoteSubs.subscribe('notes.all');
    Meteor.subscribe('notes.count.total');
    Meteor.subscribe('notes.count.user');
    Session.set('ready', handle.ready());
    if (Meteor.user()) {
      if (Meteor.user().theme) {
        return $('body').removeAttr('class').addClass(Meteor.user().theme);
      } else {
        return $('body').removeAttr('class').addClass('Mountain');
      }
    }
  });
});

Template.App_body.getUploadBitsAllowed = function() {
  if (Meteor.user().isPro) {
    return Meteor.settings.public.maxProUploadBits;
  } else {
    return Meteor.settings.public.maxFreeUploadBits;
  }
};

Template.App_body.getTotalNotesAllowed = function() {
  if (!Meteor.user()) {
    return 0;
  }
  if (Meteor.user().isPro) {
    return 'Unlimited';
  } else {
    const referrals = Meteor.user().referralCount || 0;
    return Meteor.settings.public.noteLimit + (Meteor.settings.public.referralNoteBonus * referrals);
  }
};

Template.App_body.loadFavorite = function(event, number) {
  if (!event.metaKey && Template.App_body.shouldNav() && $('.favoriteNote').get(number-1)) {
    $('#tagSearchPreview').hide();
    $('input').val('');
    NProgress.start();
    $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
    return FlowRouter.go($($('.favoriteNote').get(number-1)).attr('href'));
  }
};

Template.App_body.shouldNav = function() {
  const editingNote = $(document.activeElement).hasClass('title');
  const editingFocusedNote = $(document.activeElement).hasClass('title-wrapper');
  const editingBody = $(document.activeElement).hasClass('body');
  const focused = $('input:focus').length;
  return !editingNote && !editingFocusedNote && !editingBody && !focused;
};

Template.App_body.events({
  'click #botHeaderButton'(event, instance) {
    Session.set('showBotWidget', true);
    return setTimeout(() => $('#chatInput').focus()
    , 250);
  }
});

Template.App_body.helpers({
  wrapClasses() {
    let classname = '';
    if (Meteor.isCordova) {
      classname += 'cordova';
    }
    if (Meteor.settings.public.dev) {
      classname += ' dev';
    }
    return classname;
  },

  dev() {
    return Meteor.settings.public.dev;
  },

  connected() {
    if (showConnectionIssue.get()) {
      return Meteor.status().connected;
    }
    return true;
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

  focusedNoteTitle() {
    const note = Notes.findOne(FlowRouter.getParam('noteId'), {
      fields: {
        _id: true,
        title: true
      }
    }
    );

    return Template.bulletNotes.formatText(note.title);
  },

  focusedNoteFiles() {
    Meteor.subscribe('files.note', FlowRouter.getParam('noteId'));
    return Files.find({ noteId: FlowRouter.getParam('noteId') });
  },

  templateGestures: {
    'swipeleft .cordova'(event, instance) {
      return instance.state.set('menuOpen', false);
    },

    'swiperight .cordova'(event, instance) {
      return instance.state.set('menuOpen', true);
    }
  },

  languages() {
    return _.keys(TAPi18n.getLanguages());
  },

  isActiveLanguage(language) {
    return TAPi18n.getLanguage() === language;
  },

  expandClass() {
    const instance = Template.instance();
    if (instance.state.get('menuOpen')) { return 'expanded'; } else { return ''; }
  },

  ready() {
    return Session.get('ready');
  },

  menuPin() {
    if (Meteor.user() && Meteor.user().menuPin) {
      return 'mdl-layout--fixed-drawer';
    }
  },

  theme() {
    if (Meteor.user() && Meteor.user().theme) {
      return `url('/img/bgs/${Meteor.user().theme.toLowerCase()}.jpg')`;
    } else {
      return "url('/img/bgs/mountain.jpg')";
    }
  },

  showBotWidget() {
    return Session.get('showBotWidget');
  },

  noteArgs() {
    let ret;
    const instance = Template.instance();
    // By finding the note with only the `_id` field set,
    // we don't create a dependency on the
    // `note.incompleteCount`, and avoid re-rendering the todos when it changes
    const note = Notes.findOne(FlowRouter.getParam('noteId'), {
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
        return Notes.findOne(FlowRouter.getParam('noteId'));
      }
    };
  },

  modeBackgroundLeft() {
    if (Session.get('viewMode') === "map") {
      return 120;
    } else if (Session.get('viewMode') === "calendar") {
      return 80;
    } else if (Session.get('viewMode') === "kanban") {
      return 40;
    } else {
      return 0;
    }
  },

  showingNotes() {
    return Template.App_body.showingNotes();
  }
});

Template.App_body.showingNotes = function() {
  if (FlowRouter.getParam('noteId') || (FlowRouter.getRouteName() === "App.notes") || (FlowRouter.getRouteName() === "App.home")) {
      return true;
    }
};

Template.App_body.events({
  'blur .search'(event, instance) {
    return $(event.currentTarget).val('');
  },

  'keyup .search'(event, instance) {
    console.log(event);
    if (event.keyCode === 27) {
      $(event.currentTarget).val('');
      $(event.currentTarget).blur();
    }

    // Throttle so we don't search for single letters
    clearTimeout(Template.App_body.timer);

    return Template.App_body.timer = setTimeout(function() {
      if ($(event.target).val()) {
        return FlowRouter.go(`/search/${$(event.target).val()}`);
      } else {
        return FlowRouter.go('/');
      }
    }
    , 500);
  },

  'click #scrollToTop'() {
    return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
  },

  'blur .title-wrapper'(event, instance) {
    event.stopPropagation();
    const title = Template.bulletNoteItem.stripTags(event.target.innerHTML);
    if (title !== this.title) {
      return Meteor.call('notes.updateTitle', {
        noteId: FlowRouter.getParam('noteId'),
        title
        // FlowRouter.getParam 'shareKey',
      }, (err, res) => $(event.target).html(Template.bulletNotes.formatText(title)));
    }
  },

  'keydown .title-wrapper'(event, instance) {
    if (event.keyCode === 13) {
      event.preventDefault();
      return $(event.currentTarget.blur());
    }
  },

  'click #noteMode'() {
    Session.set('viewMode','note');
    return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
  },

  'click #kanbanMode'() {
    Session.set('viewMode','kanban');
    return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
  },

});

Template.App_body.showSnackbar = data => document.querySelector('#snackbar').MaterialSnackbar.showSnackbar(data);

UI.registerHelper('getCount', function(name) {
  if (name) {
    return Counter.get(name);
  }
});

UI.registerHelper('getSetting', function(name) {
  if (name) {
    return Meteor.settings.public[name];
  }
});

UI.registerHelper('getTimeFromNow', function(time) {
  if (time) {
    return moment(time).fromNow();
  }
});

Template.App_body.recordEvent = function(event, data) {
  if (Template.App_body.keenClient) {
    return Template.App_body.keenClient.recordEvent(event, data);
  }
};
