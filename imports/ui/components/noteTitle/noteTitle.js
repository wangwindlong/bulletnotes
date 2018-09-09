/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./noteTitle.jade');

import { Notes } from '/imports/api/notes/notes.js';

Template.noteTitle.onCreated(function() {
  this.state = new ReactiveDict();
  return this.state.setDefault({
      focused: false});
});

Template.noteTitle.onRendered(function() {
  const instance = this;
  return Tracker.autorun(function() {
    if (instance.data.note.title) {
      return $(instance.firstNode).find('.title').first().html(
        Template.bulletNotes.formatText(instance.data.note.title)
      );
    }
  });
});

Template.noteTitle.helpers({
  className() {
    let className = '';
    if (Template.instance().state.get('dirty')) {
      className += ' dirty';
    }
    return className;
  },

  editable() {
    if (!Meteor.userId()) {
      return false;
    } else {
      return true;
    }
  }
});

Template.noteTitle.saveTitle = function(event, instance) {
  const title = Template.bulletNoteItem.stripTags(event.target.innerHTML);

  if (!instance.data.note.title || (title !== Template.bulletNoteItem.stripTags(emojione.shortnameToUnicode(instance.data.note.title)))) {
    let error;
    $(event.target).html(Template.bulletNotes.formatText(title));
    
    // Don't show the 'dirty' status right away, let it try and save first.
    const dirtyTimer = setTimeout(() => instance.state.set('dirty', true)
    , 1000);

    if (Meteor.user().storeLocation && navigator.geolocation) {
      const success = position =>
        Meteor.call('notes.updateLocation', {
          noteId: instance.data.note._id,
          shareKey: FlowRouter.getParam('shareKey'),
          lat: position.coords.latitude,
          lon: position.coords.longitude
        }
        )
      ;

      error = error =>
        Template.App_body.showSnackbar({
          message: `Couldn't get location${error.code}`})
      ;
      navigator.geolocation.getCurrentPosition(success, error);
    }

    return Meteor.call('notes.updateTitle', {
      noteId: instance.data.note._id,
      title,
      shareKey: FlowRouter.getParam('shareKey')
    }, function(err, res) {
      clearTimeout(dirtyTimer);
      if (err) {
        return Template.App_body.showSnackbar({
          message: err.error});
      } else {
        return instance.state.set('dirty', false);
      }
    });
  }
};

Template.noteTitle.events({
  'focus .title'(event, instance) {
    Session.set('focused', true);
    return Template.bulletNoteItem.addAutoComplete(event.currentTarget);
  },

  'blur .title'(event, instance) {
    return Template.noteTitle.saveTitle(event, instance);
  },

  'click .title a'(event, instance) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!$(event.target).hasClass('tagLink') && !$(event.target).hasClass('atLink')) {
      return window.open(event.target.href);
    } else {
      $(".mdl-layout__content").animate({ scrollTop: 0 }, 500);
      return FlowRouter.go(event.target.pathname);
    }
  },
  
  'keydown .title'(event, instance) {
    let item, next, note, prev, upperSibling;
    event.stopImmediatePropagation();
    switch (event.keyCode) {
      // Cmd ] - Zoom in
      case 221:
        if (event.metaKey) {
          return FlowRouter.go(`/note/${instance.data._id}`);
        }
        break;

      // Cmd [ - Zoom out
      case 219:
        if (event.metaKey) {
          return FlowRouter.go(`/note/${instance.data.parent}`);
        }
        break;

      // U - Upload
      case 85:
        if (event.metaKey && event.shiftKey) {
          return $(`#noteItem_${instance.data._id}`).find('.fileInput').first().trigger('click');
        }
        break;

      // Enter
      case 13:
        event.preventDefault();
        event.stopImmediatePropagation();

        if ($('.textcomplete-dropdown:visible').length < 1) {
          if (event.shiftKey) {
            // Edit the body
            return instance.data.setShowBody(true);
          } else if (event.ctrlKey) {
            return Template.bulletNoteItem.toggleChildren(instance);
          } else {
            // Create a new note below the current.
            Meteor.call('notes.insert', {
              title: '',
              rank: instance.data.note.rank + 0.5,
              parent: instance.data.note.parent,
              shareKey: FlowRouter.getParam('shareKey')
            }, function(err, res) {
              if (err) {
               return Template.App_body.showSnackbar({
                 message: err.message});
             }
            });

            Template.bulletNoteItem.focus($(event.target).closest('.note-item').next()[0]);

            return;
          }
        }
        break;

            // TODO: This code needs cleaned up a bit
            // If the cursor is at the start of the line, it duplicates rather than moves the text.
            // Also it is wonky when links or tags are present

            // Chop the text in half at the cursor
            // put what's on the left in a note on top
            // put what's to the right in a note below
            // position = event.target.selectionStart
            // text = event.target.innerHTML
            // if !position
            //   range = window.getSelection().getRangeAt(0)
            //   position = range.startOffset
            //
            // topNote = text.substr(0, position)
            // bottomNote = text.substr(position)
            // if topNote != Template.bulletNoteItem.stripTags(note.title)
            //   Meteor.call 'notes.updateTitle', {
            //     noteId: note._id
            //     title: topNote
            //     shareKey: FlowRouter.getParam('shareKey')
            //   }
            // # Create a new note below the current.
            // Meteor.call 'notes.insert', {
            //   title: bottomNote
            //   rank: note.rank + 1
            //   parent: note.parent
            //   shareKey: FlowRouter.getParam('shareKey')
            // }, (err, res) ->
            //   if err
            //     Template.App_body.showSnackbar
            //       message: err.error
            //       actionHandler: ->
            //         FlowRouter.go('/account')
            //       ,
            //       actionText: 'More Info'
            // Template.bulletNoteItem.focus $(event.target).closest('.note-item').next()[0]

      // D - Duplicate
      case 68:
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          return Meteor.call('notes.duplicate', instance.data.note._id);
        }
        break;

      // Tab
      case 9:
        event.preventDefault();

        // First save the title in case it was changed.
        var title = Template.bulletNoteItem.stripTags(event.target.innerHTML);
        if (title !== instance.data.note.title) {
          Meteor.call('notes.updateTitle', {
            noteId: instance.data.note._id,
            title
          }
          );
        }

            // FlowRouter.getParam 'shareKey'
        var parent_id = Blaze.getData(
          $(event.currentTarget).closest('.note-item').prev().get(0)
        )._id;
        var noteId = instance.data.note._id;
        if (event.shiftKey) {
          Meteor.call('notes.outdent', {
            noteId,
            shareKey: FlowRouter.getParam('shareKey')
          });
          return Template.bulletNoteItem.focus($(`#noteItem_${noteId}`)[0]);

        } else {
          const childCount = Notes.find({parent: parent_id}).count();
          Meteor.call('notes.makeChild', {
            noteId,
            parent: parent_id,
            rank: (childCount*2)+1,
            shareKey: FlowRouter.getParam('shareKey'),
            expandParent: true
          });
          Session.set(`expand_${parent_id}`, true);
          return Template.bulletNoteItem.focus($(`#noteItem_${noteId}`)[0]);
        }

      // Backspace / delete
      case 8:
        if ($('.textcomplete-dropdown:visible').length) {
          // We're showing a dropdown, don't do anything.
          return;
        }
        
        // If the note is empty and hit delete again, or delete with ctrl key
        if ((event.currentTarget.innerText.trim().length === 0) || event.ctrlKey) {
          $(event.currentTarget).closest('.note-item').fadeOut();
          Meteor.call('notes.remove', {
            noteId: instance.data.note._id,
            shareKey: FlowRouter.getParam('shareKey')
          }
          );
          Template.bulletNoteItem.focus($(event.currentTarget).closest('.note-item').prev()[0]);
          return;
        }

        // If there is no selection
        if (window.getSelection().toString() === '') {
          let position = event.target.selectionStart;
          if (!position) {
            const range = window.getSelection().getRangeAt(0);
            position = range.startOffset;
          }
          if (position === 0) {
            // We're at the start of the note,
            // add this to the note above, and remove it.
            prev = $(event.currentTarget).closest('.note-item').prev();
            const prevNote = Blaze.getData(prev.get(0));
            note = this;
            return Meteor.call('notes.updateTitle', {
              noteId: prevNote._id,
              title: prevNote.title + event.target.innerHTML,
              shareKey: FlowRouter.getParam('shareKey')
            }, function(err, res) {
              if (!err) {
                return Meteor.call('notes.remove', {
                  noteId: note._id,
                  shareKey: FlowRouter.getParam('shareKey',
                  function(err, res) {
                    // Moves the caret to the correct position
                    if (!err) {
                      return prev.find('div.title').focus();
                    }
                  })
                }
                );
              }
            });
          }
        }
        break;

      // . Period
      case 190:
        if (event.metaKey) {
          return Template.bulletNoteItem.toggleChildren(instance);
        }
        break;

      // Up
      case 38:
        if ($('.textcomplete-dropdown:visible').length) {
          // We're showing a dropdown, don't do anything.
          event.preventDefault();
          return false;
        }
        if ($(event.currentTarget).closest('.note-item').prev().length) {
          if (event.metaKey || event.ctrlKey) {
            event.stopImmediatePropagation();
            // Move note above the previous note
            item = $(event.currentTarget).closest('.note-item');
            prev = item.prev();
            upperSibling = Blaze.getView(prev.prev()[0]).templateInstance();
            if (prev.length === 0) {
              return;
            }
            prev.css('z-index', 999).css('position', 'relative').animate({ top: item.height() }, 250);
            return item.css('z-index', 1000).css('position', 'relative').animate({ top: `-${prev.height()}` }, 300, () =>
              setTimeout(function() {
                prev.css('z-index', '').css('top', '').css('position', '');
                item.css('z-index', '').css('top', '').css('position', '');
                item.insertBefore(prev);
                setTimeout(() => Template.bulletNoteItem.focus(item[0])
                , 100);
                console.log(instance.data);

                return Meteor.call('notes.makeChild', {
                  noteId: instance.data.note._id,
                  parent: instance.data.note.parent,
                  upperSibling: upperSibling.data._id,
                  shareKey: FlowRouter.getParam('shareKey')
                });
              }
              , 50)
            );
          } else {
            // Focus on the previous note
            return Template.bulletNoteItem.focus($(event.currentTarget).closest('.note-item').prev()[0]);
          }
        } else {
          // There is no previous note in the current sub list, go up a note.
          return Template.bulletNoteItem.focus($(event.currentTarget).closest('ol').closest('.note-item')[0]);
        }

      // Down
      case 40:
        // Command is held
        if (event.metaKey || event.ctrlKey) {
          // Move down
          item = $(event.currentTarget).closest('.note-item');
          next = item.next();
          if (next.length === 0) {
            return;
          }
          next.css('z-index', 999).css('position', 'relative').animate({ top: `-${item.height()}` }, 250);
          return item.css('z-index', 1000).css('position', 'relative').animate({ top: next.height() }, 300, () =>
            setTimeout(function() {
              next.css('z-index', '').css('top', '').css('position', '');
              item.css('z-index', '').css('top', '').css('position', '');
              item.insertAfter(next);

              setTimeout(() => Template.bulletNoteItem.focus(item[0])
              , 100);

              const view = Blaze.getView(next[0]);
              upperSibling = view.templateInstance();

              return Meteor.call('notes.makeChild', {
                noteId: instance.data.note._id,
                parent: instance.data.note.parent,
                upperSibling: upperSibling.data._id,
                shareKey: FlowRouter.getParam('shareKey')
              });
            }
            , 50)
          );
        } else {
          if ($('.textcomplete-dropdown:visible').length) {
            // We're showing a dropdown, don't do anything.
            event.preventDefault();
            return false;
          }
          // Go to a child note if available
          note = $(event.currentTarget).closest('.note-item')
            .find('ol .note-item').first();
          if (!note.length) {
            // If not, get the next note on the same level
            note = $(event.currentTarget).closest('.note-item').next();
          }
          if (!note.length) {
            // Nothing there, keep going up levels.
            let count = 0;
            let searchNote = $(event.currentTarget).parent().closest('.note-item');
            while ((note.length < 1) && (count < 10)) {
              note = searchNote.next();
              if (!note.length) {
                searchNote = searchNote.parent().closest('.note-item');
                count++;
              }
            }
          }
          if (note.length) {
            return Template.bulletNoteItem.focus(note[0]);
          } else {
            return $('#new-note').focus();
          }
        }

      // Escape
      case 27:
        if ($('.textcomplete-dropdown:visible').length) {
          // We're showing a dropdown, don't do anything.
          event.preventDefault();
          return false;
        }
        $(event.currentTarget).blur();
        return window.getSelection().removeAllRanges();

      // M - Move To
      case 77:
        if (event.metaKey && event.shiftKey) {
          return Template.bulletNoteItem.showMoveTo(instance);
        }
        break;
    }
  }
});
