/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
// import {
//   encrypt,
//   stopSharing
// } from '/imports/api/notes/methods.js'

const { Notes } = require('/imports/api/notes/notes.js');

require('./encrypt.jade');

Template.encrypt.onRendered(function() {
  let prevTarget;
  const checkeventcount = 1;
  return prevTarget = undefined;
});

Template.encrypt.helpers({
    'decrypting'() {
        if (this.encryptedRoot || this.encrypted) {
            return true;
        }
    }
});

Template.encrypt.events({

  'click .encryptBtn'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();
    
    const password = $('.encryptPassword').val();

    if (password.length < 3) {
        alert("Password too short");
        return;
    }

    if ($('.encryptPassword').val() !== $('.encryptPasswordVerify').val()) {
        alert("Passwords do not match!");
        return;
    }

    if ($('.encryptRoot').first().hasClass('is-checked')) {
        Template.encrypt.encryptNote(this, password);
        Meteor.call('notes.setEncrypted', {
          noteId: this._id,
          encrypted: true,
          encryptedRoot: true
        });
    } else {
        const notes = Notes.find({ parent: this._id }, {sort: {rank: 1}});
        notes.forEach(note => Template.encrypt.encryptNote(note, password)); 

        Meteor.call('notes.setEncrypted', {
            noteId: this._id,
            encrypted: false,
            encryptedRoot: true
        });
    }

    Blaze.getView($(`#menuItem_${this._id}`)[0]).templateInstance().state.set('showEncrypt', false);
    return $('.modal-backdrop.in').fadeOut();
},

  'click .decryptBtn'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const password = $('.decryptPassword').val();

    if (this.encrypted) {
        Template.encrypt.decryptNote(this, password);
    } else {
        // The note is not encrypted, which means it is a root note with encrypted children, so skip this note
        const notes = Notes.find({ parent: this._id }, {sort: {rank: 1}});
        let badPass = false;
        notes.forEach(function(note) {
            if (badPass || !Template.encrypt.decryptNote(note, password)) {
                badPass = true;
                return false;
            }
        });

        if (!badPass) {
            Meteor.call('notes.setEncrypted', {
                noteId: this._id,
                encrypted: false,
                encryptedRoot: false
            });
        }
    }

    Blaze.getView($(`#menuItem_${this._id}`)[0]).templateInstance().state.set('showEncrypt', false);
    return $('.modal-backdrop.in').fadeOut();
}
});

Template.encrypt.encryptNote = function(note, password) {
    const encrypted = CryptoJS.AES.encrypt(note.title, password).toString();
    const encryptedBody = CryptoJS.AES.encrypt(note.body, password).toString();

    Meteor.call('notes.updateTitle', {
      noteId: note._id,
      title: encrypted,
      shareKey: FlowRouter.getParam('shareKey')
    });

    Meteor.call('notes.updateBody', {
      noteId: note._id,
      body: encryptedBody,
      shareKey: FlowRouter.getParam('shareKey')
    });

    Meteor.call('notes.setEncrypted', {
      noteId: note._id,
      encrypted: true
    });

    // Get and encrypt child notes
    const notes = Notes.find({ parent: note._id }, {sort: {rank: 1}});
    return notes.forEach(function(note) {
        if (!Template.encrypt.encryptNote(note, password)) {
            return false;
        } else {
            return true;
        }
    });
};

Template.encrypt.decryptNote = function(note, password) {
    let crypt, cryptBody;
    try { 
        crypt = CryptoJS.AES.decrypt(note.title, password);
        cryptBody = CryptoJS.AES.decrypt(note.body, password);
    } catch (e) {
        Template.App_body.showSnackbar({
          message: "Bad password"});
        return false;
    }
        
    const decrypted = crypt.toString(CryptoJS.enc.Utf8);
    const decryptedBody = cryptBody.toString(CryptoJS.enc.Utf8);
    if (!crypt || (decrypted.length < 1)) {
        Template.App_body.showSnackbar({
          message: "Bad password"});
        return false;
    }

    

    Meteor.call('notes.updateTitle', {
      noteId: note._id,
      title: decrypted,
      shareKey: FlowRouter.getParam('shareKey')
    });

    Meteor.call('notes.updateBody', {
      noteId: note._id,
      body: decryptedBody
    });

    Meteor.call('notes.setEncrypted', {
      noteId: note._id,
      encrypted: false
    });

    // Get and decrypt child notes
    const notes = Notes.find({ parent: note._id }, {sort: {rank: 1}});
    notes.forEach(function(note) {
        if (!Template.encrypt.decryptNote(note, password)) {
            return false;
        } else {
            return true;
        }
    });
    
    return true;
};