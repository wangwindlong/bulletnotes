require './noteBody.jade'

Template.noteBody.onRendered ->
  that = this
  Tracker.autorun ->
    if that.data.note && that.data.note.body
      bodyHtml = Template.bulletNotes.formatText that.data.note.body
      that.$('.body').first().show().html(
        bodyHtml
      )
    # simplemde = new SimpleMDE
    #   element: that.$('textarea')[0]

Template.noteBody.events
  'focus .body': (event, instance) ->
    Session.set 'focused', true
    Template.bulletNoteItem.addAutoComplete event.currentTarget

  'blur .body': (event, instance) ->
    event.stopPropagation()
    that = this
    Session.set 'focused', false
    body = Template.bulletNoteItem.stripTags event.target.innerHTML
    if body != Template.bulletNoteItem.stripTags(@note.body)
      Meteor.call 'notes.updateBody', {
        noteId: instance.data.note._id
        body: body
        shareKey: FlowRouter.getParam 'shareKey'
      }, (err, res) ->
        that.note.body = body
        $(event.target).html Template.bulletNotes.formatText body
    if !body
      $(event.target).fadeOut()
