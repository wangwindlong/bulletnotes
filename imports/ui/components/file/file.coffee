{ Template } = require 'meteor/templating'
{ ReactiveDict } = require 'meteor/reactive-dict'
{ Notes } = require '/imports/api/notes/notes.coffee'
{ Files } = require '/imports/api/files/files.coffee'

require './file.jade'

Template.file.isImage = true

Template.file.onCreated ->
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

Template.file.onRendered ->
  `var promise`
  @warning.set false
  @fetchedText.set false

  that = this
  if @data.isText or @data.isJSON
    if @data.size < 1024 * 64
      HTTP.call 'GET', @data.link(), (error, resp) ->
        @showPreview.set true
        if error
          console.error error
        else
          if ! ~[
              500
              404
              400
            ].indexOf(resp.statusCode)
            if resp.content.length < 1024 * 64
              @fetchedText.set resp.content
            else
              @warning.set true
        return
    else
      @warning.set true
  else if @data.isImage
    img = new Image
    if /png|jpe?g/i.test(@data.type)
      console.log "Got image! ",@data
      handle = undefined

      img.onload = ->
        that.showPreview.set true
        return

      img.onerror = ->
        that.showError.set true
        return

      if @data.versions != null and @data.versions.preview != null and @data.versions.preview.extension
        img.src = @data.link('preview')
      else
        handle = Collections.files.find(@data._id).observeChanges(changed: (_id, fields) ->
          if fields != null and fields.versions != null and fields.versions.preview != null and fields.versions.preview.extension
            img.src = @data.link('preview')
            handle.stop()
          return
        )
    else

      img.onload = ->
        @showOriginal.set true
        return

      img.onerror = ->
        @showError.set true
        return

      img.src = @data.link()
  # else if @data.isVideo
  #   video = document.getElementById(@data._id)
  #   if !video.canPlayType(@data.type)
  #     @showError.set true
  #   else
  #     promise = video.play()
  #     if Object::toString.call(promise) == '[object Promise]' or Object::toString.call(promise) == '[object Object]' and promise.then and Object::toString.call(promise.then) == '[object Function]'
  #       promise.then(_app.NOOP).catch _app.NOOP
  # else if @data.isAudio
  #   audio = document.getElementById(@data._id)
  #   if !audio.canPlayType(@data.type)
  #     @showError.set true
  #   else
  #     promise = audio.play()
  #     if Object::toString.call(promise) == '[object Promise]' or Object::toString.call(promise) == '[object Object]' and promise.then and Object::toString.call(promise.then) == '[object Function]'
  #       promise.then(_app.NOOP).catch _app.NOOP
  window.IS_RENDERED = true
  return
Template.file.helpers
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

Template.file.events

  'click [data-show-info]': (e, template) ->
    e.preventDefault()
    template.showInfo.set !template.showInfo.get()
    false
  'touchmove .file-overlay': (e) ->
    e.preventDefault()
    false
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
  "click .fileImage": (event, template) ->
    template.showModal.set true
    setTimeout ->
      template.$('.modalTrigger').trigger('click')
      $('#__blaze-root').append($(event.currentTarget).siblings('.modal'))
    , 20

  "click .delete": (event, template) ->
    event.preventDefault()
    event.stopPropagation()
    if confirm "Are you sure you want to delete this file?"
      Meteor.call 'files.remove',
        id: event.target.dataset.id

