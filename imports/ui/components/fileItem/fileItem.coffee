{ Template } = require 'meteor/templating'
{ ReactiveDict } = require 'meteor/reactive-dict'
{ Notes } = require '/imports/api/notes/notes.coffee'
{ Files } = require '/imports/api/files/files.coffee'

require './fileItem.jade'

Template.fileItem.isImage = true

Template.fileItem.onCreated ->
  @showOriginal = new ReactiveVar(false)
  @fetchedText = new ReactiveVar(false)
  @showPreview = new ReactiveVar(false)
  @showError = new ReactiveVar(false)
  @showInfo = new ReactiveVar(false)
  @warning = new ReactiveVar(false)
  @showModal = new ReactiveVar(false)

  # $(this.find('.fileModal .delete')).click (event) ->
  #   if confirm "Are you sure you want to delete this file?"
  #     Meteor.call 'files.remove',
  #       id: event.target.dataset.id
  #     , (err, res) ->
  #       $('.modal-backdrop').fadeOut().remove()

Template.fileItem.onRendered ->
  @warning.set false
  @fetchedText.set false

  that = this
  if @data.file.isText or @data.file.isJSON
    if @data.file.size < 1024 * 64
      HTTP.call 'GET', @data.file.link(), (error, resp) ->
        that.showPreview.set true
        if error
          console.error error
        else
          if ! ~[
              500
              404
              400
            ].indexOf(resp.statusCode)
            if resp.content.length < 1024 * 64
              that.fetchedText.set resp.content
            else
              that.warning.set true
        return
    else
      @warning.set true
  else if @data.file.isImage
    img = new Image
    if /png|jpe?g/i.test(@data.file.type)
      handle = undefined

      img.onload = ->
        that.showPreview.set true
        return

      img.onerror = ->
        that.showError.set true
        return

      if @data.file.versions and typeof @data.file.versions.preview != 'undefined' and @data.file.versions.preview.extension
        img.src = @data.file.link('preview')
      else
        handle = Files.find(@data.file._id).observeChanges(changed: (_id, fields) ->
          if fields != null and fields.versions != null and fields.versions.preview != null and fields.versions.preview.extension
            img.src = that.data.file.link('preview')
            handle.stop()
          return
        )
    else

      img.onload = ->
        that.showOriginal.set true
        return

      img.onerror = ->
        that.showError.set true
        return

      img.src = @data.file.link()

Template.fileItem.helpers
  warning: ->
    Template.instance().warning.get()
  getCode: ->
    if @type and ! ! ~@type.indexOf('/')
      return @type.split('/')[1]
    ''
  isBlamed: ->
    ! ! ~_app.blamed.get().indexOf(@_id)
  showInfo: ->
    Template.instance().showInfo.get()
  showError: ->
    Template.instance().showError.get()
  fetchedText: ->
    Template.instance().fetchedText.get()
  showPreview: ->
    Template.instance().showPreview.get()
  showOriginal: ->
    Template.instance().showOriginal.get()
  showModal: ->
    Template.instance().showModal.get()

Template.fileItem.events
  'click [data-show-info]': (e, template) ->
    e.preventDefault()
    template.showInfo.set !template.showInfo.get()
    false

  'touchmove .file-overlay': (e) ->
    e.preventDefault()

  'touchmove .file': (e, template) ->
    if template.$(e.currentTarget).height() < template.$('.file-table').height()
      template.$('a.show-info').hide()
      template.$('h1.file-title').hide()
      template.$('a.download-file').hide()
      if timer
        Meteor.clearTimeout timer
      timer = Meteor.setTimeout((->
        template.$('a.show-info').show()
        template.$('h1.file-title').show()
        template.$('a.download-file').show()
        return
      ), 768)

  'click .fileImage': (event, template) ->
    template.showModal.set true
    setTimeout ->
      template.$('.modalTrigger').trigger('click')
      $('#__blaze-root').append($(event.currentTarget).siblings('.modal'))
    , 20

  'click .delete': (event, template) ->
    event.preventDefault()
    event.stopPropagation()
    if confirm "Are you sure you want to delete this file?"
      Meteor.call 'files.remove',
        id: event.target.dataset.id

