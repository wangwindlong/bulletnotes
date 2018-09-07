import { Accounts } from 'meteor/accounts-base'
{ Files } = require '/imports/api/files/server/files.coffee'

request = require('request')
https = require('https')
fs = require('fs')

if Meteor.isServer && Meteor.settings.telegramKey
  Meteor.startup ->
    TelegramBot.token = Meteor.settings.telegramKey
    TelegramBot.start()

    TelegramBot.uploadFile = (data, uploadItem, noteId) ->
      console.log "Got data:", data
      user = TelegramBot.getUser data
      if !user
        false
      TelegramBot.send 'File received! Processing..', data.chat.id

      fileName = TelegramBot.method('getFile', file_id: uploadItem.file_id).result.file_path
      file = fs.createWriteStream(uploadItem.file_id)
      request = Meteor.wrapAsync https.get('https://api.telegram.org/file/bot' + TelegramBot.token + '/' + fileName, (response) ->
        response.pipe file
        file.on 'finish', ->
          file.close ->
            Files.addFile uploadItem.file_id,
              {
                fileName: uploadItem.file_name
                userId: user._id
                name: uploadItem.file_name
                type: uploadItem.mime_type
              },
              (err, fileRef) ->
                console.log "Error: ",err
                console.log "FileRef: ",fileRef
                Files.update fileRef._id, $set:
                  noteId: noteId
                TelegramBot.send 'File processed! View at ' + Meteor.settings.public.url + '/note/' +noteId, data.chat.id
              , true
      ).on('error', (err) ->
        console.log "Got an error!"
        # Handle errors
        fs.unlink dest
        # Delete the file async. (But we don't check the result)
        if cb
          cb err.message
      )

    TelegramBot.getUser = (data) ->
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      if !user
        msg = 'Hello, I am BulletNotesBot! 😄 \n\nI can help you manage your notes for free.\n\n' +
        'To get started just type `/register`.\n\n'+
        'Or to link your existing BulletNotes account, click here: ' + 
        Meteor.settings.public.url + '/telegramAuth/' + data.chat.id

        TelegramBot.send msg, data.chat.id, true

        false
      else

        user

    # Listeners

    TelegramBot.setCatchAllText true, (_, message) ->
      user = TelegramBot.getUser message

      if !user
        return false

      Meteor.call 'bot.chat',
        chat: message.text
        userId: user._id
      , (err, res) ->
        TelegramBot.send res, message.chat.id, true

    TelegramBot.addListener 'incoming_photo', ((command, username, data) ->
      console.log data
      TelegramBot.uploadFile data
    ), 'photo'

    TelegramBot.addListener 'incoming_voice', ((command, username, data) ->
      console.log data
      TelegramBot.uploadFile data, data.voice, "wRvx8kXDSqLLZyqjh"
    ), 'voice'

    TelegramBot.addListener 'incoming_caption', ((command, username, data) ->
      console.log data
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      # Use either the document, or a video if available
      docs = data.document || data.video || data.photo
      console.log "Docs: ", docs
      if Array.isArray docs
        doc = docs[docs.length-1]
        doc.file_path = docs[0].file_path
      else
        doc = docs
      
      console.log "Got doc: ", doc

      noteId = Meteor.call 'notes.inbox',
        title: data.caption
        userId: user._id
      TelegramBot.uploadFile data, doc, noteId
    ), 'caption'

    TelegramBot.addListener 'incoming_caption', ((command, username, data) ->
      console.log data
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      # Use either the document, or a video if available
      docs = data.document || data.video || data.photo
      console.log "Docs: ", docs
      if Array.isArray docs
        doc = docs[docs.length-1]
        doc.file_path = docs[0].file_path
      else
        doc = docs
      
      console.log "Got doc: ", doc

      noteId = Meteor.call 'notes.inbox',
        title: data.caption
        userId: user._id
      TelegramBot.uploadFile data, doc, noteId
    ), 'caption_entities'

    TelegramBot.addListener 'incoming_contact', ((command, username, data) ->
      console.log "Got contact:",data
    ), 'contact'

    TelegramBot.addListener 'incoming_location', ((command, username, data) ->
      TelegramBot.uploadFile data
    ), 'location'

    TelegramBot.addListener 'incoming_document', ((command, username, data) ->
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      noteId = Meteor.call 'notes.inbox',
        title: "Telegram File Upload"
        userId: user._id
      TelegramBot.uploadFile data, data.document, noteId
    ), 'document'

    TelegramBot.addListener 'incoming_video', ((command, username, data) ->
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      noteId = Meteor.call 'notes.inbox',
        title: "Telegram Video Upload"
        userId: user._id
      TelegramBot.uploadFile data, data.video, noteId
    ), 'video'

    TelegramBot.addListener 'incoming_audio', ((command, username, data) ->
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      noteId = Meteor.call 'notes.inbox',
        title: "Telegram Audio Upload"
        userId: user._id
      TelegramBot.uploadFile data, data.audio, noteId
    ), 'audio'

    TelegramBot.addListener '/start', (command, username, data) ->
      user = TelegramBot.getUser data
      if user
        'Your account is linked. Simply send me any note like `Walk the dog` to get started. Type `/help` for more commands.\n'+
        'The `/browse` and `/recent` commands are worth exploring.'


    TelegramBot.addListener '/register', (command, username, data) ->
      user = Meteor.users.findOne({telegramId:data.chat.id.toString()})
      if !user
        Meteor.users.insert
          telegramId: data.chat.id.toString()
          telegramSignUp: true
          createdAt: new Date()

        'You are good to go! Just send me any note you want to rememeber or get done, like `Fix flat tire`.\n\n'+
        'The `/help` command is always there for you if you need it.\n\n'+
        'Welcome to BulletNotes.io! 👍 😎\n\n'+
        '(To link your email later so you can login to the website run `/email`.)'

    TelegramBot.addListener '/email', (command, username, data) ->
      user = TelegramBot.getUser data
      if !user
        false

      email = command[1]

      emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

      # ` 'Fix' for dumb Sublimetext syntax highlihting

      if emailRegex.test email
        Accounts.addEmail user._id, email

        'Alright, you can now request a password for the website here: ' + Meteor.settings.public.url + '/forgot-password'
      else
        'Please provide a valid email.'
