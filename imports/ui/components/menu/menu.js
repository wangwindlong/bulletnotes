/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { ReactiveDict } = require('meteor/reactive-dict');
const { Notes } = require('/imports/api/notes/notes.js');

import filesize from 'filesize';

require('./menu.jade');

Template.menu.onRendered(() =>
  setInterval(function() {
    const notesPercentFull = (Counter.get('notes.count.user') / Template.App_body.getTotalNotesAllowed()) * 100;
    if (document.querySelector('#noteSpaceUsedBar')) {
      document.querySelector('#noteSpaceUsedBar').MaterialProgress.setProgress(notesPercentFull);
    }

    if (Meteor.user()) {
      const filesPercentFull = (Meteor.user().uploadedFilesSize / Template.App_body.getUploadBitsAllowed()) * 100; 
      if (document.querySelector('#fileSpaceUsedBar')) {
        document.querySelector('#fileSpaceUsedBar').MaterialProgress.setProgress(filesPercentFull);
      }

      // THis is hacky. Should be somewhere else.
      if (Meteor.user().language) {
        T9n.setLanguage(Meteor.user().language);
        TAPi18n.setLanguage(Meteor.user().language);
      }

      if (Session.get('referral')) {
        Meteor.call('users.referral', {
          referral: Session.get('referral') 
        });
        return Session.set('referral', null);
      }
    }
  }
  , 1000)
);
  

Template.menu.helpers({
  displayName() {
    let displayName = '';
    if (Meteor.user().emails) {
      const email = Meteor.user().emails[0].address;
      displayName = email.substring(0, email.indexOf('@'));
    } else {
      displayName = Meteor.user().profile.name;
    }
    return displayName;
  },

  totalNotesAllowed() {
    return Template.App_body.getTotalNotesAllowed();
  },

  referralCount() {
    return Meteor.user().referralCount;
  },

  notes() {
    return Notes.find({ favorite: true }, {sort: {favoritedAt: -1}});
  },

  activeNoteClass(note) {
    const active = ActiveRoute.name('Notes.show') && (FlowRouter.getParam('_id') === note._id);
    return active && 'active';
  },

  hideUndoButton() {
    if (tx.Transactions.find({
      user_id: Meteor.userId(),
      $or: [
        { undone: null },
        { undone: {$exists: false} }
      ],
      expired: { $exists: false
    }}).count()) { return true; }
  },

  hideRedoButton() {
    var undoneRedoConditions = function() {
      'var undoneRedoConditions';
      undoneRedoConditions = {
        $exists: true,
        $ne: null
      };
      const lastAction = tx.Transactions.findOne({
        user_id: Meteor.userId(),
        $or: [
          { undone: null },
          { undone: {$exists: false} }
        ],
        expired: { $exists: false
      }
      }, {sort: {lastModified: -1}});
      if (lastAction) {
        undoneRedoConditions['$gt'] = lastAction.lastModified;
      }
      return undoneRedoConditions;
    };

    if (tx.Transactions.find({
      user_id: Meteor.userId(),
      undone: undoneRedoConditions(),
      expired: { $exists: false
    }}).count()) { return true; }
  },

  action(type) {
    const sel = {
      user_id: Meteor.userId(),
      expired: { $exists: false
    }
    };
    // This is for autopublish scenarios
    const existsOrNot = type === 'redo' ? {undone: undoneRedoConditions()} :{ $or: [
      { undone: null },
      { undone: {$exists: false} }
    ]
  };
    const sorter = {};
    sorter[type === 'redo' ? 'undone' : 'lastModified'] = -1;
    const transaction = tx.Transactions.findOne(_.extend(sel, existsOrNot), {sort: sorter});
    return transaction && transaction.description;
  },

  ready() {
    return Session.get('ready');
  },

  menuPin() {
    if (Meteor.user()) {
      return Meteor.user().menuPin;
    } else {
      return true;
    }
  },

  menuPinIcon() {
    if (Meteor.user().menuPin) {
      return 'chevron_left';
    } else {
      return 'chevron_right';
    }
  },

  muteIcon() {
    if (Meteor.user().muted) {
      return 'volume_off';
    } else {
      return 'volume_up';
    }
  },

  muteClass() {
    if (!Meteor.user().muted) {
      return 'mdl-button--colored';
    }
  },

  maxFileUpload() {
    return filesize(Template.App_body.getUploadBitsAllowed());
  },

  getFileSize(number) {
    if (number) {
      return filesize(number);
    } else {
      return '0';
    }
  },
  
  avatar() {
    if (Meteor.user().emails) {
      return Gravatar.imageUrl(Meteor.user().emails[0].address,
        {secure: true});
    } else if (Meteor.user()) {
      return Avatar.getUrl(Meteor.user());
    }
  }
});

Template.menu.events({
  'click .menuToggle'(event, instance) {
    event.stopImmediatePropagation();

    return Meteor.call('users.setMenuPin', {menuPin:false}, () => $( 'div[class^="mdl-layout__obfuscator"]' ).trigger( "click" ));
  },

  'click .js-logout'(event) {
    event.stopImmediatePropagation();

    Meteor.logout();
    return FlowRouter.go('/intro');
  },

  'click #menuPin'(event) {
    event.stopImmediatePropagation();

    if (Meteor.user().menuPin) {
      return Meteor.call('users.setMenuPin', {menuPin:false});
    } else {
      return Meteor.call('users.setMenuPin', {menuPin:true});
    }
  },

  'click .homeLink'(event) {
    event.stopImmediatePropagation();
    return $('#searchForm input').val('');
  },

  'click #undo'(event) {
    event.stopImmediatePropagation();
    return tx.undo();
  },

  'click #redo'(event) {
    event.stopImmediatePropagation();
    return tx.redo();
  },

  'click a'(event) {
    $('.mdl-layout__obfuscator.is-visible').trigger( "click" );
    return $('.mdl-layout__content').animate({ scrollTop: 0 }, 200);
  }
});

Template.registerHelper('increment', count => count + 1);

Template.registerHelper('emoji', argument => emojione.shortnameToUnicode(argument));
