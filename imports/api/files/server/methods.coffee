import { Meteor } from 'meteor/meteor'
import { _ } from 'meteor/underscore'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import SimpleSchema from 'simpl-schema'
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter'

import { Notes } from '/imports/api/notes/notes.coffee'
import { Files } from './files.coffee'

export remove = new ValidatedMethod
  name: 'files.remove'
  validate: new SimpleSchema
    id: Notes.simpleSchema().schema('_id')
  .validator
    clean: yes
    filter: no
  run: ({ id }) ->
    file = Files.findOne id
    if @userId != file.userId
      throw new (Meteor.Error)('not-authorized')
    Meteor.users.update @userId,
      $inc:
        uploadedFilesSize: file.size * -1
    Files.remove { _id: id }

export setNote = new ValidatedMethod
  name: 'files.setNote'
  validate: new SimpleSchema
    fileId:
      type: String
      regEx: SimpleSchema.RegEx.Id
    noteId:
      type: String
      regEx: SimpleSchema.RegEx.Id
  .validator
    clean: yes
    filter: no
  run: ({ fileId, noteId }) ->
    file = Files.findOne fileId
    if file.userId != Meteor.userId()
      throw new (Meteor.Error)('not-authorized')

    Files.update fileId, $set:
      noteId: noteId

# Get note of all method names on Notes
FILES_METHODS = _.pluck([
  remove
  setNote
], 'name')

if Meteor.isServer
  # Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule {
    name: (name) ->
      _.contains FILES_METHODS, name

    # Rate limit per connection ID
    connectionId: ->
      yes

  }, 5, 1000
