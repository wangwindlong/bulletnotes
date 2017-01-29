{ Template } = require 'meteor/templating'
{ Notes } = require '/imports/api/notes/notes.js'

import {
  insert,
} from '/imports/api/notes/methods.coffee'

require './import.jade'

Template.Notes_import.events
  'submit .importForm': (event, instance) ->
    event.preventDefault()
    data = {}
    textarea = $(event.currentTarget).find('textarea').get(0)
    data.importLines = textarea.value.split('\n')
    textarea.value = ''
    data.prevLevel = 0
    data.prevParents = []
    data.levelRanks = []
    Template.Notes_import.import data

Template.Notes_import.import = (data, row = 0, lastNote = null) ->
  ii = row
  while ii < data.importLines.length
    line = data.importLines[ii]
    if line.trim().substr(0, 1) != '-'
      # Invalid line
      ii++
      continue
    leadingSpaceCount = line.match(/^(\s*)/)[1].length
    level = leadingSpaceCount / 2
    parent = null
    if level > 0
      # Calculate parent
      if level > data.prevLevel
        # This is a new depth, look at the last added note
        parent = lastNote
        data.prevParents[level] = parent
      else
        #  We have moved back out to a higher level
        parent = data.prevParents[level]
    data.prevLevel = level
    if data.levelRanks[level]
      data.levelRanks[level]++
    else
      data.levelRanks[level] = 1
    title = line.substr(2 + level * 2)
    # Replace Workflowy [COMPLETE] tag with a #done tag.
    title = title.replace(/(\[COMPLETE\])/,'#done')
    # Check if the next line is a body
    nextLine = data.importLines[ii + 1]
    body = null
    if nextLine and nextLine.trim().substr(0, 1) == '"'
      body = nextLine.trim().substr(1)
      body = body.substr(0, body.length)

    insert.call {
      title: title
      rank: data.levelRanks[level]
      level: level
      parent: parent
    }, (err, res) ->
      if !level
        FlowRouter.go('/note/'+res)

      # if body
      #   Meteor.call 'notes.updateBody', res, body
      Template.Notes_import.import data, ii + 1, res
    # This break is needed for the while loop above to work on invalid lines
    break
