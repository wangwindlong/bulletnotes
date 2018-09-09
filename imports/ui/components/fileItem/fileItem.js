/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { ReactiveDict } = require('meteor/reactive-dict');
const { Notes } = require('/imports/api/notes/notes.js');
const { Files } = require('/imports/api/files/files.js');

require('./fileItem.jade');

Template.fileItem.isImage = true;

Template.fileItem.onCreated(function() {
  this.showOriginal = new ReactiveVar(false);
  this.fetchedText = new ReactiveVar(false);
  this.showPreview = new ReactiveVar(false);
  this.showError = new ReactiveVar(false);
  this.showInfo = new ReactiveVar(false);
  this.warning = new ReactiveVar(false);
  return this.showModal = new ReactiveVar(false);
});

  // $(this.find('.fileModal .delete')).click (event) ->
  //   if confirm "Are you sure you want to delete this file?"
  //     Meteor.call 'files.remove',
  //       id: event.target.dataset.id
  //     , (err, res) ->
  //       $('.modal-backdrop').fadeOut().remove()

Template.fileItem.onRendered(function() {
  this.warning.set(false);
  this.fetchedText.set(false);

  const that = this;
  if (this.data.file.isText || this.data.file.isJSON) {
    if (this.data.file.size < (1024 * 64)) {
      return HTTP.call('GET', this.data.file.link(), function(error, resp) {
        that.showPreview.set(true);
        if (error) {
          console.error(error);
        } else {
          if (!~[
              500,
              404,
              400
            ].indexOf(resp.statusCode)) {
            if (resp.content.length < (1024 * 64)) {
              that.fetchedText.set(resp.content);
            } else {
              that.warning.set(true);
            }
          }
        }
      });
    } else {
      return this.warning.set(true);
    }
  } else if (this.data.file.isImage) {
    const img = new Image;
    if (/png|jpe?g/i.test(this.data.file.type)) {
      let handle = undefined;

      img.onload = function() {
        that.showPreview.set(true);
      };

      img.onerror = function() {
        that.showError.set(true);
      };

      if (this.data.file.versions && (typeof this.data.file.versions.preview !== 'undefined') && this.data.file.versions.preview.extension) {
        return img.src = this.data.file.link('preview');
      } else {
        return handle = Files.find(this.data.file._id).observeChanges({changed(_id, fields) {
          if ((fields !== null) && (fields.versions !== null) && (fields.versions.preview !== null) && fields.versions.preview.extension) {
            img.src = that.data.file.link('preview');
            handle.stop();
          }
        }
        });
      }
    } else {

      img.onload = function() {
        that.showOriginal.set(true);
      };

      img.onerror = function() {
        that.showError.set(true);
      };

      return img.src = this.data.file.link();
    }
  }
});

Template.fileItem.helpers({
  warning() {
    return Template.instance().warning.get();
  },
  getCode() {
    if (this.type && !!~this.type.indexOf('/')) {
      return this.type.split('/')[1];
    }
    return '';
  },
  isBlamed() {
    return !!~_app.blamed.get().indexOf(this._id);
  },
  showInfo() {
    return Template.instance().showInfo.get();
  },
  showError() {
    return Template.instance().showError.get();
  },
  fetchedText() {
    return Template.instance().fetchedText.get();
  },
  showPreview() {
    return Template.instance().showPreview.get();
  },
  showOriginal() {
    return Template.instance().showOriginal.get();
  },
  showModal() {
    return Template.instance().showModal.get();
  }
});

Template.fileItem.events({
  'click [data-show-info]'(e, template) {
    e.preventDefault();
    template.showInfo.set(!template.showInfo.get());
    return false;
  },

  'touchmove .file-overlay'(e) {
    return e.preventDefault();
  },

  'touchmove .file'(e, template) {
    if (template.$(e.currentTarget).height() < template.$('.file-table').height()) {
      let timer;
      template.$('a.show-info').hide();
      template.$('h1.file-title').hide();
      template.$('a.download-file').hide();
      if (timer) {
        Meteor.clearTimeout(timer);
      }
      return timer = Meteor.setTimeout((function() {
        template.$('a.show-info').show();
        template.$('h1.file-title').show();
        template.$('a.download-file').show();
      }), 768);
    }
  },

  'click .fileImage'(event, template) {
    template.showModal.set(true);
    return setTimeout(function() {
      template.$('.modalTrigger').trigger('click');
      return $('#__blaze-root').append($(event.currentTarget).siblings('.modal'));
    }
    , 20);
  },

  'click .delete'(event, template) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this file?")) {
      return Meteor.call('files.remove',
        {id: event.target.dataset.id});
    }
  }
});

