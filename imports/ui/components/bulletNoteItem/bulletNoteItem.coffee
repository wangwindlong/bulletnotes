{ Template } = require 'meteor/templating'
{ Notes } = require '/imports/api/notes/notes.coffee'
{ Files } = require '/imports/api/files/files.coffee'
{ ReactiveDict } = require 'meteor/reactive-dict'

import SimpleSchema from 'simpl-schema'

require './bulletNoteItem.jade'

require '/imports/ui/components/fileItem/fileItem.coffee'
require '/imports/ui/components/share/share.coffee'
require '/imports/ui/components/encrypt/encrypt.coffee'
require '/imports/ui/components/moveTo/moveTo.coffee'
require '/imports/ui/components/noteMenu/noteMenu.coffee'
require '/imports/ui/components/noteTitle/noteTitle.coffee'
require '/imports/ui/components/noteBody/noteBody.coffee'
require '/imports/ui/components/noteDetailCard/noteDetailCard.coffee'

import {
  setShowContent
} from '/imports/api/notes/methods.coffee'

Template.bulletNoteItem.previewXOffset = 20
Template.bulletNoteItem.previewYOffset = 20

Template.bulletNoteItem.encodeImageFileAsURL = (cb,file) ->
  reader = new FileReader

  reader.onloadend = ->
    cb reader.result

  reader.readAsDataURL file

Template.bulletNoteItem.isValidImageUrl = (url, callback) ->
  $ '<img>',
    src: url
    error: ->
      callback url, false
    load: ->
      callback url, true

Template.bulletNoteItem.onCreated ->
  Meteor.subscribe 'files.note', @data._id
  if @data.showChildren && @data.children && !FlowRouter.getParam 'searchParam'
    Meteor.call 'notes.setChildrenLastShown', {
      noteId: @data._id
    }

  @state = new ReactiveDict()
  @state.setDefault
    focused: false
    showComplete: false
  @currentUpload = new ReactiveVar(false)
  query = Notes.find({_id:@data._id})

  handle = query.observeChanges(
    changed: (id, fields) ->
      if fields.title != null
        $('#noteItem_'+id).find('.title').first().html(
          Template.bulletNotes.formatText fields.title
        )
  )

Template.bulletNoteItem.onRendered ->
  noteElement = this

  Session.set('expand_'+this.data._id, this.data.showChildren)

Template.bulletNoteItem.helpers
  currentShareKey: () ->
    FlowRouter.getParam('shareKey')

  count: () ->
    @rank / 2

  files: () ->
      sort: {
        'meta.created_at': -1
      }
    }).count()
    Files.find({noteId:@_id}, {
      sort: {
        'meta.created_at': -1
      }
    })

  childNotes: () ->
    if (
      (@showChildren && !FlowRouter.getParam('searchParam')) ||
      Session.get('expand_'+@_id)
    )
      Meteor.subscribe 'notes.children',
        @_id
        FlowRouter.getParam 'shareKey'
      if (Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete'))
        Notes.find { parent: @_id }, sort: { complete: 1, rank: 1 }
      else
        Notes.find { parent: @_id, complete: false }, sort: { rank: 1 }

  showComplete: () ->
    Template.instance().state.get('showComplete') || Session.get('alwaysShowComplete')

  alwaysShowComplete: () ->
    Session.get 'alwaysShowComplete'

  completedCount: () ->
    Notes.find({ parent: @_id, complete: true }).count()

  editingClass: (editing) ->
    editing and 'editing'

  expandClass: () ->
    if Notes.find({parent: @_id}).count() > 0
      if (
        (@showChildren && !FlowRouter.getParam('searchParam')) ||
        Session.get('expand_'+@_id)
      )
        'remove'
      else
        'add'

  hoverInfo: ->
    info = 'Created '+moment(@createdAt).fromNow()+'.'
    if @updatedAt
      info += ' Updated '+moment(@updatedAt).fromNow()+'.'
    if @updateCount
      info += ' Edits: '+@updateCount
    if @childrenShownCount
      info += ' Views: '+@childrenShownCount
    info

  className: ->
    className = "note"
    if @title
      tags = @title.match(/#\w+/g)
      if tags
        tags.forEach (tag) ->
          className = className + ' tag-' + tag.substr(1).toLowerCase()

    if @showChildren || Session.get('expand_'+@_id)
      showChildren = true
    if !showChildren && @children > 0
      className = className + ' hasHiddenChildren'
    if @children > 0
      className = className + ' hasChildren'
    if @shared
      className = className + ' shared'
    if Template.instance().state.get 'focused'
      className = className + ' focused'
    if @encrypted
      className = className + ' encrypted'
    if @favorite
      className = className + ' favorite'
    if @encryptedRoot
      className = className + ' encryptedRoot'
    className

  userOwnsNote: ->
    Meteor.userId() == @owner

  progress: ->
    setTimeout ->
      $('[data-toggle="tooltip"]').tooltip()
    , 100
    @progress

  progressClass: ->
    Template.bulletNotes.getProgressClass this

  displayEncrypted: ->
    if @encrypted || @encryptedRoot
      true

  editable: ->
    if !Meteor.userId()
      return false
    else
      return true

  hasContent: ->
    Meteor.subscribe 'files.note', @_id
    (@body || Files.find({ noteId: @_id }).count() > 0)

  canIndent: ->
    if $('#noteItem_'+@_id).prev('.note-item').length
      true

  canUnindent: ->
    $('#noteItem_'+@_id).parentsUntil('.note-item').closest('.note-item').length

  currentUpload: ->
    Template.instance().currentUpload.get()

  showBody: ->
    Template.instance().state.get('showBody') || @body

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
Template.bulletNoteItem.events
  'click .encryptLink, click .decryptLink, click .encryptedIcon': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()
    instance.state.set 'showEncrypt', true
    # Hacky ugly shit to work around MDL modal bs
    that = this
    setTimeout ->
      $('#toggleEncrypt_'+that._id).click()
      setTimeout ->
        $('.modal.in').parent().append($('.modal-backdrop'))
        $('input.cryptPass').focus()
      , 250
    , 50

  'click .toggleComplete': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()

    instance.state.set('showComplete',!instance.state.get('showComplete'))

  'click .toggleAlwaysShowComplete': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()

    Session.set('alwaysShowComplete',!Session.get('alwaysShowComplete'))

  'click .showContent': (event, instance) ->
    event.stopImmediatePropagation()
    setShowContent.call
      noteId: instance.data._id
      showContent: true

  'click .hideContent': (event, instance) ->
    event.stopImmediatePropagation()
    setShowContent.call
      noteId: instance.data._id
      showContent: false

  'mouseover .tagLink, mouseover .atLink': (event) ->
    if Session.get 'dragging'
      return
    notes = Notes.search event.target.innerHTML, null, 5
    $('#tagSearchPreview').html('')
    notes.forEach (note) ->
      # Only show the note in the preview box if it is not the current note being hovered.
      if note._id != $(event.target).closest('.note-item').data('id')
        $('#tagSearchPreview').append('<li><a class="previewTagLink">'+
        Template.bulletNotes.formatText(note.title,false)+'</a></li>')
          .css('top', event.pageY - Template.bulletNoteItem.previewYOffset + 'px')
          .css('left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px')
          .show()
    $('#tagSearchPreview').append('<li><a class="previewTagViewAll">Click to view all</a></li>')

  'mousemove .tagLink, mousemove .atLink': (event) ->
    $('#tagSearchPreview').css('top', event.pageY - Template.bulletNoteItem.previewYOffset + 'px')
      .css 'left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px'

  'mouseleave .tagLink, mouseleave .atLink': (event) ->
    $('#tagSearchPreview').hide()

  'mouseover .previewLink': (event) ->
    if Session.get 'dragging'
      return
    date = new Date
    url = event.currentTarget.href
    Template.bulletNoteItem.isValidImageUrl url, (url, valid) ->
      if valid
        if url.indexOf("?") > -1
          imageUrl = url + "&" + date.getTime()
        else
          imageUrl = url + "?" + date.getTime()
        $('body').append '<p id=\'preview\'><a href=\'' +
          url + '\' target=\'_blank\'><img src=\'' + imageUrl +
          '\' alt=\'Image preview\' /></p>'
        $('#preview').css('top', event.pageY - Template.bulletNoteItem.previewYOffset + 'px')
          .css('left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px')
          .fadeIn 'fast'
        # This needs to be here
        $('#preview img').mouseleave ->
          $('#preview').remove()

  'mousemove .previewLink': (event) ->
    $('#preview').css('top', event.pageY - Template.bulletNoteItem.previewYOffset + 'px')
      .css 'left', event.pageX + Template.bulletNoteItem.previewXOffset + 'px'

  'mouseleave .previewLink': (event) ->
    $('#preview').remove()

  'paste .title': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()

    lines = event.originalEvent.clipboardData.getData('text/plain').split(/\n/g)

    # Add the first line to the current note
    line = lines.shift()
    combinedTitle = event.target.innerHTML + line
    Meteor.call 'notes.updateTitle', {
      noteId: instance.data._id
      title: combinedTitle
      shareKey: FlowRouter.getParam('shareKey')
    }

    lines.forEach (line) ->
      if line
        Meteor.call 'notes.insert', {
          title: line
          rank: instance.data.rank + 1
          parent: instance.data.parent
          shareKey: FlowRouter.getParam('shareKey')
        }

 
  'keydown .body': (event, instance) ->
    note = this
    event.stopImmediatePropagation()
    switch event.keyCode
      # Escape
      when 27
        if $('.textcomplete-dropdown:visible').length
          # We're showing a dropdown, don't do anything.
          event.preventDefault()
          return false
        $(event.currentTarget).blur()
        window.getSelection().removeAllRanges()

  'blur .title': (event, instance) ->
    instance.state.set 'focused', false
    Session.set 'focused', false

  'click .expand': (event, instance) ->
    event.stopImmediatePropagation()
    event.preventDefault()
    $('.mdl-tooltip').fadeOut().remove()

    Template.bulletNoteItem.toggleChildren(instance)

  'click .dot': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()
    if !Session.get 'dragging'
      offset = $(instance.firstNode).find('.title').offset()
      $(".mdl-layout__content").animate({ scrollTop: 0 }, 500)
      headerOffset = $('.title-wrapper').offset()
      $('.title-wrapper').fadeOut()

      $('body').append($(instance.firstNode).find('.title').first().clone().addClass('zoomingTitle'))
      $('.zoomingTitle').offset(offset).animate({
        left: headerOffset.left
        top: headerOffset.top
        color: 'white'
        fontSize: '20px'
      }, ->
        $('.zoomingTitle').remove()
        FlowRouter.go '/note/'+instance.data._id+'/'+(FlowRouter.getParam('shareKey')||'')
      )

  'dragover .title, dragover .filesContainer': (event, instance) ->
    $(event.currentTarget).closest('.noteContainer').addClass 'dragging'

  'dragleave .title, dragleave .filesContainer': (event, instance) ->
    $(event.currentTarget).closest('.noteContainer').removeClass 'dragging'

  # 'drop .noteContainer': (event, instance) ->
  #   event.preventDefault()
  #   event.stopPropagation()
  #   if event.toElement
  #     console.log "Move file!"
  #   else if event.originalEvent.dataTransfer
  #     for file in event.originalEvent.dataTransfer.files
  #       Template.bulletNoteItem.upload file, instance

  'change .fileInput': (event, instance) ->
    event.preventDefault()
    event.stopImmediatePropagation()

    for file in event.currentTarget.files
      Template.bulletNoteItem.upload file, instance

Template.bulletNoteItem.toggleChildren = (instance) ->
  if Meteor.userId()
    Meteor.call 'notes.setShowChildren', {
      noteId: instance.data._id
      show: !instance.data.showChildren
      shareKey: FlowRouter.getParam('shareKey')
    }

  if !Session.get('expand_'+instance.data._id)
    $(instance.firstNode).find('.childWrap').first().hide()
    Session.set('expand_'+instance.data._id, true)
    # Hacky fun to let Meteor render the child notes first
    setTimeout ->
      $(instance.firstNode).find('ol').first().hide()
      $(instance.firstNode).find('.childWrap').first().show()
      $(instance.firstNode).find('ol').first().slideDown()
    , 1
  else
    $(instance.firstNode).find('ol').first().slideUp ->
      Session.set('expand_'+instance.data._id, false)

Template.bulletNoteItem.focus = (noteItem) ->
  view = Blaze.getView(noteItem)
  instance = view.templateInstance()
  $(noteItem).find('.title').first().focus()
  if instance.state
    instance.state.set 'focused', true
    Session.set 'focused', true

Template.bulletNoteItem.stripTags = (inputText) ->
  if !inputText
    return
  inputText = inputText.replace(/<\/?span[^>]*>/g, '')
  inputText = inputText.replace(/&nbsp;/g, ' ')
  inputText = inputText.replace(/<\/?a[^>]*>/g, '')
  if inputText
    inputText = inputText.trim()
  inputText

Template.bulletNoteItem.setCursorToEnd = (ele) ->
  range = document.createRange()
  sel = window.getSelection()
  range.setStart ele, 1
  range.collapse true
  sel.removeAllRanges()
  sel.addRange range
  ele.focus()

Template.bulletNoteItem.addAutoComplete = (target) ->
  $(target).textcomplete [ {
    match: /\B:([\-+\w]*)$/
    search: (term, callback) ->
      results = []
      results2 = []
      results3 = []
      $.each Template.App_body.emojiStrategy, (shortname, data) ->
        if shortname.indexOf(term) > -1
          results.push shortname
        else
          if data.aliases != null and data.aliases.indexOf(term) > -1
            results2.push shortname
          else if data.keywords != null and data.keywords.indexOf(term) > -1
            results3.push shortname
        return
      if term.length >= 3
        results.sort (a, b) ->
          a.length > b.length
        results2.sort (a, b) ->
          a.length > b.length
        results3.sort()
      newResults = results.concat(results2).concat(results3)
      callback newResults
      return
    template: (shortname) ->
      '<img class="emojione" src="//cdn.jsdelivr.net/emojione/assets/png/' +
      Template.App_body.emojiStrategy[shortname].unicode + '.png"> :' + shortname + ':'
    replace: (shortname) ->
      Template.App_body.insertingData = true
      return ':' + shortname + ': '
    index: 1
    maxCount: 10
  } ], footer:
    '<a href="http://www.emoji.codes" target="_blank">'+
    'Browse All<span class="arrow">»</span></a>'


Template.bulletNoteItem.upload = (file, template) ->
  if file
    try
      uploadInstance = Files.insert({
        file: file
        streams: 'dynamic'
        chunkSize: 'dynamic'
      }, false)
    catch e
      console.log e
    uploadInstance.on 'start', ->
      template.currentUpload.set this

    uploadInstance.on 'end', (error, fileObj) ->
      if error
        Template.App_body.showSnackbar
          message: 'Error during upload: ' + error.reason
      else
        Template.App_body.showSnackbar
          message: 'File "' + fileObj.name + '" successfully uploaded'
        Meteor.call 'files.setNote',
            noteId: template.data._id
            fileId: fileObj._id
          setShowContent.call
            noteId: template.data._id
            showContent: true

      template.currentUpload.set false

    uploadInstance.start()