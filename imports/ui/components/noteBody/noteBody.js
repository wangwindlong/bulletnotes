/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./noteBody.jade');

Template.noteBody.onRendered(function() {
  const that = this;
  return Tracker.autorun(function() {
    if (that.data.note && that.data.note.body) {
      const bodyHtml = Template.bulletNotes.formatText(that.data.note.body);
      return that.$('.body').first().show().html(
        bodyHtml
      );
    }
  });
});
    // simplemde = new SimpleMDE
    //   element: that.$('textarea')[0]

Template.noteBody.events({
  'focus .body'(event, instance) {
    Session.set('focused', true);
    return Template.bulletNoteItem.addAutoComplete(event.currentTarget);
  },

  'blur .body'(event, instance) {
    event.stopPropagation();
    const that = this;
    Session.set('focused', false);
    const body = Template.bulletNoteItem.stripTags(event.target.innerHTML);
    if (body !== Template.bulletNoteItem.stripTags(this.note.body)) {
      Meteor.call('notes.updateBody', {
        noteId: instance.data.note._id,
        body,
        shareKey: FlowRouter.getParam('shareKey')
      }, function(err, res) {
        that.note.body = body;
        return $(event.target).html(Template.bulletNotes.formatText(body));
      });
    }
    if (!body) {
      return $(event.target).fadeOut();
    }
  }
});
