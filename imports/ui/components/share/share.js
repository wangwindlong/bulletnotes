/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
import {
  share,
  stopSharing
} from '/imports/api/notes/methods.js';
require('./share.jade');

Template.share.onRendered(function() {
  let prevTarget;
  const checkeventcount = 1;
  return prevTarget = undefined;
});

Template.share.events({
  'click .viewShare'(event) {
    event.preventDefault();
    return share.call({
      noteId: this._id});
  },
  'click .editShare'(event) {
    event.preventDefault();
    return share.call({
      noteId: this._id,
      editable: true
    });
  },
  'click .stopSharing'(event) {
    event.preventDefault();
    return stopSharing.call({
      noteId: this._id});
  },
  'click .fa-copy'(event) {
    const copyTextarea = document.querySelector('.shareUrl');
    copyTextarea.select();
    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'successful' : 'unsuccessful';
      return $.gritter.add({
        title: 'Link Copied',
        text: 'Share link copied to your clipboard.',
        time: 1000
      });
    } catch (error) {}
  }
});

Template.share.helpers({
  shareUrl() {
    return Meteor.absoluteUrl(`note/${this._id}/${this.shareKey}`);
  }
});
