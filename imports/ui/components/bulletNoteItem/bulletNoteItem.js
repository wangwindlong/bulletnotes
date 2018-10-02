/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { Notes } = require('/imports/api/notes/notes.js');
const { Files } = require('/imports/api/files/files.js');
const { ReactiveDict } = require('meteor/reactive-dict');

import SimpleSchema from 'simpl-schema';

require('./bulletNoteItem.jade');

require('/imports/ui/components/fileItem/fileItem.js');
require('/imports/ui/components/share/share.js');
require('/imports/ui/components/encrypt/encrypt.js');
require('/imports/ui/components/moveTo/moveTo.js');
require('/imports/ui/components/noteMenu/noteMenu.js');
require('/imports/ui/components/noteTitle/noteTitle.js');
require('/imports/ui/components/noteBody/noteBody.js');
require('/imports/ui/components/noteDetailCard/noteDetailCard.js');

import {
  setShowContent
} from '/imports/api/notes/methods.js';

Template.bulletNoteItem.previewXOffset = 20;
Template.bulletNoteItem.previewYOffset = 20;

Template.bulletNoteItem.encodeImageFileAsURL = function(cb,file) {
  const reader = new FileReader;

  reader.onloadend = () => cb(reader.result);

  return reader.readAsDataURL(file);
};

Template.bulletNoteItem.isValidImageUrl = (url, callback) =>
  $('<img>', {
    src: url,
    error() {
      return callback(url, false);
    },
    load() {
      return callback(url, true);
    }
  }
  )
;

Template.bulletNoteItem.onCreated(function(count) {
  let handle;
  Meteor.subscribe('files.note', this.data._id);
  if (this.data.showChildren && this.data.children && !FlowRouter.getParam('searchParam')) {
    Meteor.call('notes.setChildrenLastShown', {
      noteId: this.data._id
    });
  }

  this.state = new ReactiveDict();
  this.state.setDefault({
    focused: false,
    showComplete: false
  });
  this.currentUpload = new ReactiveVar(false);
  const query = Notes.find({_id:this.data._id});

  return handle = query.observeChanges({
    changed(id, fields) {
      if (fields.title !== null) {
        return $(`#noteItem_${id}`).find('.title').first().html(
          Template.bulletNotes.formatText(fields.title)
        );
      }
    }
  });
});

Template.bulletNoteItem.onRendered(function() {
  const noteElement = this;

  return Session.set(`expand_${this.data._id}`, this.data.showChildren);
});

Template.bulletNoteItem.helpers({
  currentShareKey() {
    return FlowRouter.getParam('shareKey');
  },

  count() {
    return this.rank / 2;
  },

  files() {
    return Files.find({noteId:this._id}, {
      sort: {
        'meta.created_at': -1
      }
    });
  },

  childNotes() {
    if (
      (this.showChildren && !FlowRouter.getParam('searchParam')) ||
      Session.get(`expand_${this._id}`)
    ) {
      Meteor.subscribe('notes.children',
        this._id,
        FlowRouter.getParam('shareKey'));
      if (Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete')) {
        return Notes.find({ parent: this._id }, {sort: { complete: 1, rank: 1 }});
      } else {
        return Notes.find({ parent: this._id, complete: false }, {sort: { rank: 1 }});
      }
    }
  },

  showComplete() {
    return Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete');
  },

  alwaysShowComplete() {
    return Session.get('alwaysShowComplete');
  },

  completedCount() {
    return Notes.find({ parent: this._id, complete: true }).count();
  },

  editingClass(editing) {
    return editing && 'editing';
  },

  expandClass() {
    if (Notes.find({parent: this._id}).count() > 0) {
      if (
        (this.showChildren && !FlowRouter.getParam('searchParam')) ||
        Session.get(`expand_${this._id}`)
      ) {
        return 'remove';
      } else {
        return 'add';
      }
    }
  },

  hoverInfo() {
    let info = `Created ${moment(this.createdAt).fromNow()}.`;
    if (this.updatedAt) {
      info += ` Updated ${moment(this.updatedAt).fromNow()}.`;
    }
    if (this.updateCount) {
      info += ` Edits: ${this.updateCount}`;
    }
    if (this.childrenShownCount) {
      info += ` Views: ${this.childrenShownCount}`;
    }
    return info;
  },

  className() {
    let showChildren;
    let className = "note";
    if (this.title) {
      const tags = this.title.match(/#\w+/g);
      if (tags) {
        tags.forEach(tag => className = className + ' tag-' + tag.substr(1).toLowerCase());
      }
    }

    if (this.showChildren || Session.get(`expand_${this._id}`)) {
      showChildren = true;
    }
    if (!showChildren && (this.children > 0)) {
      className = className + ' hasHiddenChildren';
    }
    if (this.children > 0) {
      className = className + ' hasChildren';
    }
    if (this.shared) {
      className = className + ' shared';
    }
    if (Template.instance().state.get('focused')) {
      className = className + ' focused';
    }
    if (this.encrypted) {
      className = className + ' encrypted';
    }
    if (this.favorite) {
      className = className + ' favorite';
    }
    if (this.encryptedRoot) {
      className = className + ' encryptedRoot';
    }
    return className;
  },

  userOwnsNote() {
    return Meteor.userId() === this.owner;
  },

  progress() {
    setTimeout(() => $('[data-toggle="tooltip"]').tooltip()
    , 100);
    return this.progress;
  },

  progressClass() {
    return Template.bulletNotes.getProgressClass(this);
  },

  displayEncrypted() {
    if (this.encrypted || this.encryptedRoot) {
      return true;
    }
  },

  editable() {
    if (!Meteor.userId()) {
      return false;
    } else {
      return true;
    }
  },

  hasContent() {
    Meteor.subscribe('files.note', this._id);
    return (this.body || (Files.find({ noteId: this._id }).count() > 0));
  },

  canIndent() {
    if ($(`#noteItem_${this._id}`).prev('.note-item').length) {
      return true;
    }
  },

  canUnindent() {
    return $(`#noteItem_${this._id}`).parentsUntil('.note-item').closest('.note-item').length;
  },

  currentUpload() {
    return Template.instance().currentUpload.get();
  },

  showBody() {
    return Template.instance().state.get('showBody') || this.body;
  },

  titleArgs(note) {
    const instance = Template.instance();
    return {
      note,
      showBody: instance.state.get('showBody'),
      setShowBody(showBody) {
        instance.state.set('showBody', showBody);
        return setShowContent.call({
          noteId: instance.data._id,
          showContent: true
        }
        , (err, res) => $(event.target).siblings('.body').fadeIn().focus());
      }
    };
  },

  bodyArgs(note) {
    return {
      note
    };
  },

  fileArgs(file) {
    return {
      file,
      note: Notes.findOne(file.noteId)
    };
  }});
Template.bulletNoteItem.events({
  'click .encryptLink, click .decryptLink, click .encryptedIcon'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();
    instance.state.set('showEncrypt', true);
    // Hacky ugly shit to work around MDL modal bs
    const that = this;
    return setTimeout(function() {
      $(`#toggleEncrypt_${that._id}`).click();
      return setTimeout(function() {
        $('.modal.in').parent().append($('.modal-backdrop'));
        return $('input.cryptPass').focus();
      }
      , 250);
    }
    , 50);
  },

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

  'click .showContent'(event, instance) {
    event.stopImmediatePropagation();
    return setShowContent.call({
      noteId: instance.data._id,
      showContent: true
    });
  },

  'click .hideContent'(event, instance) {
    event.stopImmediatePropagation();
    return setShowContent.call({
      noteId: instance.data._id,
      showContent: false
    });
  },

  'mouseover .tagLink, mouseover .atLink'(event) {
    if (Session.get('dragging')) {
      return;
    }
    const notes = Notes.search(event.target.innerHTML, null, 5);
    $('#tagSearchPreview').html('');
    notes.forEach(function(note) {
      // Only show the note in the preview box if it is not the current note being hovered.
      if (note._id !== $(event.target).closest('.note-item').data('id')) {
        return $('#tagSearchPreview').append('<li><a class="previewTagLink">'+
        Template.bulletNotes.formatText(note.title,false)+'</a></li>')
          .css('top', (event.pageY - Template.bulletNoteItem.previewYOffset) + 'px')
          .css('left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px')
          .show();
      }
    });
    return $('#tagSearchPreview').append('<li><a class="previewTagViewAll">Click to view all</a></li>');
  },

  'mousemove .tagLink, mousemove .atLink'(event) {
    return $('#tagSearchPreview').css('top', (event.pageY - Template.bulletNoteItem.previewYOffset) + 'px')
      .css('left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px');
  },

  'mouseleave .tagLink, mouseleave .atLink'(event) {
    return $('#tagSearchPreview').hide();
  },

  'mouseover .previewLink'(event) {
    if (Session.get('dragging')) {
      return;
    }
    const date = new Date;
    const url = event.currentTarget.href;
    return Template.bulletNoteItem.isValidImageUrl(url, function(url, valid) {
      if (valid) {
        let imageUrl;
        if (url.indexOf("?") > -1) {
          imageUrl = url + "&" + date.getTime();
        } else {
          imageUrl = url + "?" + date.getTime();
        }
        $('body').append('<p id=\'preview\'><a href=\'' +
          url + '\' target=\'_blank\'><img src=\'' + imageUrl +
          '\' alt=\'Image preview\' /></p>'
        );
        $('#preview').css('top', (event.pageY - Template.bulletNoteItem.previewYOffset) + 'px')
          .css('left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px')
          .fadeIn('fast');
        // This needs to be here
        return $('#preview img').mouseleave(() => $('#preview').remove());
      }
    });
  },

  'mousemove .previewLink'(event) {
    return $('#preview').css('top', (event.pageY - Template.bulletNoteItem.previewYOffset) + 'px')
      .css('left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px');
  },

  'mouseleave .previewLink'(event) {
    return $('#preview').remove();
  },

  'paste .title'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const lines = event.originalEvent.clipboardData.getData('text/plain').split(/\n/g);

    // Add the first line to the current note
    const line = lines.shift();
    const combinedTitle = event.target.innerHTML + line;
    Meteor.call('notes.updateTitle', {
      noteId: instance.data._id,
      title: combinedTitle,
      shareKey: FlowRouter.getParam('shareKey')
    });

    return lines.forEach(function(line) {
      if (line) {
        return Meteor.call('notes.insert', {
          title: line,
          rank: instance.data.rank + 1,
          parent: instance.data.parent,
          shareKey: FlowRouter.getParam('shareKey')
        });
      }});
  },

 
  'keydown .body'(event, instance) {
    const note = this;
    event.stopImmediatePropagation();
    switch (event.keyCode) {
      // Escape
      case 27:
        if ($('.textcomplete-dropdown:visible').length) {
          // We're showing a dropdown, don't do anything.
          event.preventDefault();
          return false;
        }
        $(event.currentTarget).blur();
        return window.getSelection().removeAllRanges();
    }
  },

  'blur .title'(event, instance) {
    instance.state.set('focused', false);
    return Session.set('focused', false);
  },

  'click .expand'(event, instance) {
    event.stopImmediatePropagation();
    event.preventDefault();
    $('.mdl-tooltip').fadeOut().remove();

    return Template.bulletNoteItem.toggleChildren(instance);
  },

  'click .dot'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!Session.get('dragging')) {
      const offset = $(instance.firstNode).find('.title').offset();
      $(".mdl-layout__content").animate({ scrollTop: 0 }, 500);
      const headerOffset = $('.title-wrapper').offset();
      $('.title-wrapper').fadeOut();

      $('body').append($(instance.firstNode).find('.title').first().clone().addClass('zoomingTitle'));
      return $('.zoomingTitle').offset(offset).animate({
        left: headerOffset.left,
        top: headerOffset.top,
        color: 'white',
        fontSize: '20px'
      }, 100, 'swing', function() {
        $('.zoomingTitle').remove();
        return FlowRouter.go(`/note/${instance.data._id}/${FlowRouter.getParam('shareKey')||''}`);
      });
    }
  },

  'dragover .title, dragover .filesContainer'(event, instance) {
    return $(event.currentTarget).closest('.noteContainer').addClass('dragging');
  },

  'dragleave .title, dragleave .filesContainer'(event, instance) {
    return $(event.currentTarget).closest('.noteContainer').removeClass('dragging');
  },

  // 'drop .noteContainer': (event, instance) ->
  //   event.preventDefault()
  //   event.stopPropagation()
  //   if event.toElement
  //     console.log "Move file!"
  //   else if event.originalEvent.dataTransfer
  //     for file in event.originalEvent.dataTransfer.files
  //       Template.bulletNoteItem.upload file, instance

  'change .fileInput'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();

    return Array.from(event.currentTarget.files).map((file) =>
      Template.bulletNoteItem.upload(file, instance));
  }
});

Template.bulletNoteItem.toggleChildren = function(instance) {
  if (Meteor.userId()) {
    Meteor.call('notes.setShowChildren', {
      noteId: instance.data._id,
      show: !instance.data.showChildren,
      shareKey: FlowRouter.getParam('shareKey')
    });
  }

  // If we haven't set session to show it to expand, expand it now.
  if (!Session.get(`expand_${instance.data._id}`)) {
    $(instance.firstNode).find('.childWrap').first().hide();
    Session.set(`expand_${instance.data._id}`, true);
    // Hacky fun to let Meteor render the child notes first
    return setTimeout(function() {
      $(instance.firstNode).find('ol').first().hide();
      $(instance.firstNode).find('.childWrap').first().show();
      return $(instance.firstNode).find('ol').first().slideDown();
    }
    , 1);
  } else {
    return $(instance.firstNode).find('ol').first().slideUp(() => Session.set(`expand_${instance.data._id}`, false));
  }
};

Template.bulletNoteItem.focus = function(noteItem) {
  const view = Blaze.getView(noteItem);
  const instance = view.templateInstance();
  $(noteItem).find('.title').first().focus();
  if (instance.state) {
    instance.state.set('focused', true);
    return Session.set('focused', true);
  }
};

Template.bulletNoteItem.stripTags = function(inputText) {
  if (!inputText) {
    return;
  }
  inputText = inputText.replace(/<\/?span[^>]*>/g, '');
  inputText = inputText.replace(/&nbsp;/g, ' ');
  inputText = inputText.replace(/<\/?a[^>]*>/g, '');
  if (inputText) {
    inputText = inputText.trim();
  }
  return inputText;
};

Template.bulletNoteItem.setCursorToEnd = function(ele) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStart(ele, 1);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  return ele.focus();
};

Template.bulletNoteItem.addAutoComplete = target =>
  $(target).textcomplete([ {
    match: /\B:([\-+\w]*)$/,
    search(term, callback) {
      const results = [];
      const results2 = [];
      const results3 = [];
      $.each(Template.App_body.emojiStrategy, function(shortname, data) {
        if (shortname.indexOf(term) > -1) {
          results.push(shortname);
        } else {
          if ((data.aliases !== null) && (data.aliases.indexOf(term) > -1)) {
            results2.push(shortname);
          } else if ((data.keywords !== null) && (data.keywords.indexOf(term) > -1)) {
            results3.push(shortname);
          }
        }
      });
      if (term.length >= 3) {
        results.sort((a, b) => a.length > b.length);
        results2.sort((a, b) => a.length > b.length);
        results3.sort();
      }
      const newResults = results.concat(results2).concat(results3);
      callback(newResults);
    },
    template(shortname) {
      return '<img class="emojione" src="//cdn.jsdelivr.net/emojione/assets/png/' +
      Template.App_body.emojiStrategy[shortname].unicode + '.png"> :' + shortname + ':';
    },
    replace(shortname) {
      Template.App_body.insertingData = true;
      return `:${shortname}: `;
    },
    index: 1,
    maxCount: 10
  } ], { footer:
    '<a href="http://www.emoji.codes" target="_blank">'+
    'Browse All<span class="arrow">»</span></a>'
}
  )
;


Template.bulletNoteItem.upload = function(file, template) {
  if (file) {
    let uploadInstance;
    try {
      uploadInstance = Files.insert({
        file,
        streams: 'dynamic',
        chunkSize: 'dynamic'
      }, false);
    } catch (e) {
      console.log(e);
    }
    uploadInstance.on('start', function() {
      return template.currentUpload.set(this);
    });

    uploadInstance.on('end', function(error, fileObj) {
      if (error) {
        Template.App_body.showSnackbar({
          message: `Error during upload: ${error.reason}`});
      } else {
        Template.App_body.showSnackbar({
          message: `File "${fileObj.name}" successfully uploaded`});
        Meteor.call('files.setNote', {
            noteId: template.data._id,
            fileId: fileObj._id
          }
        );
        setShowContent.call({
          noteId: template.data._id,
          showContent: true
        });
      }

      return template.currentUpload.set(false);
    });

    return uploadInstance.start();
  }
};