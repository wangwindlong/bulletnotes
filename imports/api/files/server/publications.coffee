{ Meteor } = require 'meteor/meteor'
{ check } = require 'meteor/check'
{ Match } = require 'meteor/check'
{ Files } = require './files.collection.js'

Meteor.publish 'files.note', (noteId) ->
  check noteId, Match.Maybe(String)
  Files.find(
    noteId: noteId
    deleted: {$exists: false}
  ).cursor