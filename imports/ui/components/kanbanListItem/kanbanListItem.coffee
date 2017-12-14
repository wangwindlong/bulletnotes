require './kanbanListItem.jade'

require '/imports/ui/components/noteMenu/noteMenu.coffee'
require '/imports/ui/components/noteTitle/noteTitle.coffee'
require '/imports/ui/components/noteBody/noteBody.coffee'

Template.kanbanListItem.helpers
	className: ->
    className = ""
    if @children > 0
      className = className + ' hasChildren'
  
  titleArgs: (note) ->
    instance = Template.instance()
    {
      note: note
      showBody: instance.state.get 'showBody'
      setShowBody: (showBody) ->
        instance.state.set 'showBody', showBody
        setShowContent.call
          noteId: instance.data._id
          showContent: true
        , (err, res) ->
          $(event.target).siblings('.body').fadeIn().focus()
    }

  bodyArgs: (note) ->
    {
      note: note
    }

  fileArgs: (file) ->
    {
      file: file
      note: Notes.findOne file.noteId
    }