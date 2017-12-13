require './noteBody.jade'

# import SimpleMDE from 'simplemde'
# import '/node_modules/simplemde/src/css/simplemde.css';

Template.noteBody.onRendered ->
  that = this
  Tracker.autorun ->
    if this.data && this.data.body
      bodyHtml = Template.bulletNotes.formatText this.data.body
      $(this.firstNode).find('.body').first().show().html(
        bodyHtml
      )
    # simplemde = new SimpleMDE
    #   element: that.$('.body')[0]

Template.noteBody.events
  'focus .body': (event, instance) ->
    Session.set 'focused', true
    Template.bulletNoteItem.addAutoComplete event.currentTarget

  'blur .body': (event, instance) ->
    event.stopPropagation()
    that = this
    Session.set 'focused', false
    # console.log event.target
    body = Template.bulletNoteItem.stripTags event.target.innerHTML
    if body != Template.bulletNoteItem.stripTags(@body)
      Meteor.call 'notes.updateBody', {
        noteId: instance.data._id
        body: body
        shareKey: FlowRouter.getParam 'shareKey'
      }, (err, res) ->
        that.body = body
        $(event.target).html Template.bulletNotes.formatText body
    if !body
      $(event.target).fadeOut()
