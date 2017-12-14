require './noteTitle.jade'

Template.noteTitle.onCreated ->
  console.log "Render title: ",this
  @state = new ReactiveDict()
  @state.setDefault
      focused: false

Template.noteTitle.onRendered ->
  instance = this
  Tracker.autorun ->
    if instance.data.note.title
      $(instance.firstNode).find('.title').first().html(
        Template.bulletNotes.formatText instance.data.note.title
      )

Template.noteTitle.helpers
  className: ->
    className = ''
    if Template.instance().state.get 'dirty'
      className += ' dirty'
    className

  editable: ->
    if !Meteor.userId()
      return false
    else
      return true

Template.noteTitle.saveTitle = (event, instance) ->
  title = Template.bulletNoteItem.stripTags(event.target.innerHTML)

  if !instance.data.note.title || title != Template.bulletNoteItem.stripTags emojione.shortnameToUnicode instance.data.note.title
    $(event.target).html Template.bulletNotes.formatText title
    
    # Don't show the 'dirty' status right away, let it try and save first.
    dirtyTimer = setTimeout ->
      instance.state.set 'dirty', true
    , 1000

    if Meteor.user().storeLocation && navigator.geolocation
      success = (position) ->
        Meteor.call 'notes.updateLocation',
          noteId: instance.data.note._id
          shareKey: FlowRouter.getParam 'shareKey'
          lat: position.coords.latitude
          lon: position.coords.longitude

      error = (error) ->
        Template.App_body.showSnackbar
          message: "Couldn't get location"+error.code
      navigator.geolocation.getCurrentPosition success, error

    Meteor.call 'notes.updateTitle', {
      noteId: instance.data.note._id
      title: title
      shareKey: FlowRouter.getParam 'shareKey'
    }, (err, res) ->
      clearTimeout dirtyTimer
      if err
        Template.App_body.showSnackbar
          message: err.error
      else
        instance.state.set 'dirty', false

Template.noteTitle.events
  'click .title': (event, instance) ->
    if instance.view.parentView.templateInstance().state
      instance.view.parentView.templateInstance().state.set 'focused', true

  'focus .title': (event, instance) ->
    Session.set 'focused', true
    Template.bulletNoteItem.addAutoComplete event.currentTarget

  'blur .title': (event, instance) ->
    Template.noteTitle.saveTitle event, instance

  'click .title a': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()
    if !$(event.target).hasClass('tagLink') && !$(event.target).hasClass('atLink')
      window.open(event.target.href)
    else
      $(".mdl-layout__content").animate({ scrollTop: 0 }, 500)
      FlowRouter.go(event.target.pathname)
  
  'keydown .title': (event, instance) ->
    note = this
    event.stopImmediatePropagation()
    switch event.keyCode
      # Cmd ] - Zoom in
      when 221
        if event.metaKey
          FlowRouter.go('/note/'+instance.data._id)

      # Cmd [ - Zoom out
      when 219
        if event.metaKey
          FlowRouter.go('/note/'+instance.data.parent)

      # U - Upload
      when 85
        if event.metaKey && event.shiftKey
          $('#noteItem_'+instance.data._id).find('.fileInput').first().trigger('click')

      # Enter
      when 13
        event.preventDefault()
        event.stopImmediatePropagation()

        if $('.textcomplete-dropdown:visible').length < 1
          if event.shiftKey
            # Edit the body
            console.log instance
            instance.data.setShowBody true
          else if event.ctrlKey
            Template.bulletNoteItem.toggleChildren instance
          else
            # Create a new note below the current.
            Meteor.call 'notes.insert', {
              title: ''
              rank: note.rank + 0.5
              parent: note.parent
              shareKey: FlowRouter.getParam('shareKey')
            }, (err, res) ->
              if err
               Template.App_body.showSnackbar
                 message: err.message

            Template.bulletNoteItem.focus $(event.target).closest('.note-item').next()[0]

            return

            # TODO: This code needs cleaned up a bit
            # If the cursor is at the start of the line, it duplicates rather than moves the text.
            # Also it is wonky when links or tags are present

            # Chop the text in half at the cursor
            # put what's on the left in a note on top
            # put what's to the right in a note below
            # position = event.target.selectionStart
            # text = event.target.innerHTML
            # if !position
            #   range = window.getSelection().getRangeAt(0)
            #   position = range.startOffset
            #
            # topNote = text.substr(0, position)
            # bottomNote = text.substr(position)
            # if topNote != Template.bulletNoteItem.stripTags(note.title)
            #   Meteor.call 'notes.updateTitle', {
            #     noteId: note._id
            #     title: topNote
            #     shareKey: FlowRouter.getParam('shareKey')
            #   }
            # # Create a new note below the current.
            # Meteor.call 'notes.insert', {
            #   title: bottomNote
            #   rank: note.rank + 1
            #   parent: note.parent
            #   shareKey: FlowRouter.getParam('shareKey')
            # }, (err, res) ->
            #   if err
            #     Template.App_body.showSnackbar
            #       message: err.error
            #       actionHandler: ->
            #         FlowRouter.go('/account')
            #       ,
            #       actionText: 'More Info'
            # Template.bulletNoteItem.focus $(event.target).closest('.note-item').next()[0]

      # D - Duplicate
      when 68
        if event.metaKey || event.ctrlKey
          event.preventDefault()
          Meteor.call 'notes.duplicate', instance.data._id

      # Tab
      when 9
        event.preventDefault()

        # First save the title in case it was changed.
        title = Template.bulletNoteItem.stripTags(event.target.innerHTML)
        if title != @title
          Meteor.call 'notes.updateTitle',
            noteId: @_id
            title: title

            # FlowRouter.getParam 'shareKey'
        parent_id = Blaze.getData(
          $(event.currentTarget).closest('.note-item').prev().get(0)
        )._id
        noteId = @_id
        if event.shiftKey
          Meteor.call 'notes.outdent', {
            noteId: noteId
            shareKey: FlowRouter.getParam 'shareKey'
          }
          Template.bulletNoteItem.focus $('#noteItem_'+noteId)[0]

        else
          childCount = Notes.find({parent: parent_id}).count()
          Meteor.call 'notes.makeChild', {
            noteId: @_id
            parent: parent_id
            rank: (childCount*2)+1
            shareKey: FlowRouter.getParam 'shareKey'
            expandParent: true
          }
          Session.set('expand_'+parent_id, true)
          Template.bulletNoteItem.focus $('#noteItem_'+noteId)[0]

      # Backspace / delete
      when 8
        if $('.textcomplete-dropdown:visible').length
          # We're showing a dropdown, don't do anything.
          return

        # If the note is empty and hit delete again, or delete with ctrl key
        if event.currentTarget.innerText.trim().length == 0 || event.ctrlKey
          $(event.currentTarget).closest('.note-item').fadeOut()
          Meteor.call 'notes.remove',
            noteId: @_id
            shareKey: FlowRouter.getParam 'shareKey'
          Template.bulletNoteItem.focus $(event.currentTarget).closest('.note-item').prev()[0]
          return

        # If there is no selection
        if window.getSelection().toString() == ''
          position = event.target.selectionStart
          if !position
            range = window.getSelection().getRangeAt(0)
            position = range.startOffset
          if position == 0
            # We're at the start of the note,
            # add this to the note above, and remove it.
            prev = $(event.currentTarget).closest('.note-item').prev()
            prevNote = Blaze.getData(prev.get(0))
            note = this
            Meteor.call 'notes.updateTitle', {
              noteId: prevNote._id
              title: prevNote.title + event.target.innerHTML
              shareKey: FlowRouter.getParam 'shareKey'
            }, (err, res) ->
              if !err
                Meteor.call 'notes.remove',
                  noteId: note._id,
                  shareKey: FlowRouter.getParam 'shareKey',
                  (err, res) ->
                    # Moves the caret to the correct position
                    if !err
                      prev.find('div.title').focus()

      # . Period
      when 190
        if event.metaKey
          Template.bulletNoteItem.toggleChildren(instance)

      # Up
      when 38
        if $('.textcomplete-dropdown:visible').length
          # We're showing a dropdown, don't do anything.
          event.preventDefault()
          return false
        if $(event.currentTarget).closest('.note-item').prev().length
          if event.metaKey || event.ctrlKey
            event.stopImmediatePropagation()
            # Move note above the previous note
            item = $(event.currentTarget).closest('.note-item')
            prev = item.prev()
            upperSibling = Blaze.getView(prev.prev()[0]).templateInstance()
            if prev.length == 0
              return
            prev.css('z-index', 999).css('position', 'relative').animate { top: item.height() }, 250
            item.css('z-index', 1000).css('position', 'relative').animate { top: '-' + prev.height() }, 300, ->
              setTimeout ->
                prev.css('z-index', '').css('top', '').css 'position', ''
                item.css('z-index', '').css('top', '').css 'position', ''
                item.insertBefore prev
                setTimeout ->
                  Template.bulletNoteItem.focus item[0]
                , 100

                Meteor.call 'notes.makeChild', {
                  noteId: instance.data._id
                  parent: instance.data.parent
                  upperSibling: upperSibling.data._id
                  shareKey: FlowRouter.getParam 'shareKey'
                }
              , 50
          else
            # Focus on the previous note
            Template.bulletNoteItem.focus $(event.currentTarget).closest('.note-item').prev()[0]
        else
          # There is no previous note in the current sub list, go up a note.
          Template.bulletNoteItem.focus $(event.currentTarget).closest('ol').closest('.note-item')[0]

      # Down
      when 40
        # Command is held
        if event.metaKey || event.ctrlKey
          # Move down
          item = $(event.currentTarget).closest('.note-item')
          next = item.next()
          if next.length == 0
            return
          next.css('z-index', 999).css('position', 'relative').animate { top: '-' + item.height() }, 250
          item.css('z-index', 1000).css('position', 'relative').animate { top: next.height() }, 300, ->
            setTimeout ->
              next.css('z-index', '').css('top', '').css 'position', ''
              item.css('z-index', '').css('top', '').css 'position', ''
              item.insertAfter next

              setTimeout ->
                Template.bulletNoteItem.focus item[0]
              , 100

              view = Blaze.getView(next[0])
              upperSibling = view.templateInstance()

              Meteor.call 'notes.makeChild', {
                noteId: instance.data._id
                parent: instance.data.parent
                upperSibling: upperSibling.data._id
                shareKey: FlowRouter.getParam 'shareKey'
              }
            , 50
        else
          if $('.textcomplete-dropdown:visible').length
            # We're showing a dropdown, don't do anything.
            event.preventDefault()
            return false
          # Go to a child note if available
          note = $(event.currentTarget).closest('.note-item')
            .find('ol .note-item').first()
          if !note.length
            # If not, get the next note on the same level
            note = $(event.currentTarget).closest('.note-item').next()
          if !note.length
            # Nothing there, keep going up levels.
            count = 0
            searchNote = $(event.currentTarget).parent().closest('.note-item')
            while note.length < 1 && count < 10
              note = searchNote.next()
              if !note.length
                searchNote = searchNote.parent().closest('.note-item')
                count++
          if note.length
            Template.bulletNoteItem.focus note[0]
          else
            $('#new-note').focus()

      # Escape
      when 27
        if $('.textcomplete-dropdown:visible').length
          # We're showing a dropdown, don't do anything.
          event.preventDefault()
          return false
        $(event.currentTarget).blur()
        window.getSelection().removeAllRanges()

      # M - Move To
      when 77
        if event.metaKey && event.shiftKey
          Template.bulletNoteItem.showMoveTo instance
