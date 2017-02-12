import { Meteor } from 'meteor/meteor'
import { _ } from 'meteor/underscore'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import SimpleSchema from 'simpl-schema'
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter'
import { Random } from 'meteor/random'

import childCountDenormalizer from './childCountDenormalizer.coffee'
import rankDenormalizer from './rankDenormalizer.coffee'

import { Notes } from './notes.coffee'

export insert = new ValidatedMethod
  name: 'notes.insert'
  validate: new SimpleSchema
    title: Notes.simpleSchema().schema('title')
    rank: Notes.simpleSchema().schema('rank')
    parent: Notes.simpleSchema().schema('parent')
    shareKey: Notes.simpleSchema().schema('shareKey')
  .validator
    clean: yes
    filter: no
  run: ({ title, rank, parent, shareKey = null }) ->
    parent = Notes.findOne parent

    # if note.isPrivate() and note.userId isnt @userId
    #   throw new Meteor.Error 'notes.insert.accessDenied',
    # 'Cannot add notes to a private note that is not yours'

    parentId = null
    level = 0

    if parent
      parentId = parent._id
      level = parent.level+1

    note =
      owner: @userId
      title: title
      parent: parentId
      rank: rank
      level: level
      createdAt: new Date()

    note = Notes.insert note, {tx: tx, softDelete: true}

    childCountDenormalizer.afterInsertNote parentId
    rankDenormalizer.updateSiblings parentId

    note

export share = new ValidatedMethod
  name: 'notes.share'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    editable:
      type: Boolean
      optional: true
  .validator
    clean: yes
    filter: no
  run: ({ noteId, editable = true }) ->
    if !@userId
      throw new (Meteor.Error)('not-authorized')
    Notes.update noteId, $set:
      shared: true
      shareKey: Random.id()
      sharedEditable: editable
      sharedAt: new Date
      updatedAt: new Date

export favorite = new ValidatedMethod
  name: 'notes.favorite'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
  .validator
    clean: yes
    filter: no
  run: ({ noteId }) ->
    if !@userId
      throw new (Meteor.Error)('not-authorized')
    note = Notes.findOne(noteId)
    Notes.update noteId, $set:
      favorite: !note.favorite
      favoritedAt: new Date
      updatedAt: new Date

export updateBody = new ValidatedMethod
  name: 'notes.updateBody'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    body: Notes.simpleSchema().schema('body')
  .validator
    clean: yes
    filter: no
  run: ({ noteId, body }) ->
    note = Notes.findOne noteId

    Notes.update noteId, {$set: {
      body: body
      updatedAt: new Date
    }}, tx: true

export stopSharing = new ValidatedMethod
  name: 'notes.stopSharing'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
  .validator
    clean: yes
    filter: no
  run: ({ noteId }) ->
    if !Notes.isOwner noteId
      throw new (Meteor.Error)('not-authorized')

    Notes.update noteId, $unset:
      shared: 1
      shareKey: 1

export updateTitle = new ValidatedMethod
  name: 'notes.updateTitle'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    title: Notes.simpleSchema().schema('title')
    shareKey: Notes.simpleSchema().schema('shareKey')
  .validator
    clean: yes
    filter: no
  run: ({ noteId, title, shareKey = null }) ->
    note = Notes.findOne noteId

    if !Notes.isEditable noteId, shareKey
      throw new (Meteor.Error)('not-authorized')

    title = Notes.filterTitle title
    if title
      match = title.match(/#due-([0-9]+(-?))+/gim)
    else
      title = ''
    if match
      date = match[0]
      Notes.update noteId, {$set: {
        due: moment(date).format()
      }}, tx: true
    match = title.match Notes.donePattern
    if match && !note.done
      # Move to bottom of the current list. This is a 'safe'
      # move that doesn't need denormalized after. It does create
      # a gap in the order, but this is harmless.
      siblingCount = Notes.find(parent: note.parent).count()
      Notes.update noteId, {$set: {
        done: true
        rank: (siblingCount*2)+2
      }}, tx: true
    else if !match && note.done
      Notes.update noteId, {$unset: {
        done: true
      }}, tx: true
    Notes.update noteId, {$set: {
      title: title
      updatedAt: new Date
    }}, tx: true

    pattern = /#pct-([0-9]+)/gim
    match = pattern.exec note.title
    if match
      Notes.update noteId, {$set: {
        progress: match[1]
        updatedAt: new Date
      }}, tx: true
    else
      # If there is not a defined percent tag (e.g., #pct-20)
      # then calculate the #done rate of notes
      notes = Notes.find({ parent: note.parent })
      total = 0
      done = 0
      notes.forEach (note) ->
        total++
        if note.title
          match = note.title.match Notes.donePattern
          if match
            done++
      Notes.update note.parent, {$set: {
        progress: Math.round((done/total)*100)
        updatedAt: new Date
      }}, tx: true



makeChildRun = (id, parent, shareKey = null) ->
  note = Notes.findOne(id)
  parent = Notes.findOne(parent)
  if !note or !parent or id == parent._id
    return false
  Notes.update parent._id, {
    $set: showChildren: true
  }, tx: true
  Notes.update id, { $set:
    parent: parent._id
    level: parent.level + 1
    focusNext: true
  }, tx: true
  children = Notes.find(parent: id)
  children.forEach (child) ->
    makeChildRun child._id, id, shareKey
  childCountDenormalizer.afterInsertNote parent._id

export makeChild = new ValidatedMethod
  name: 'notes.makeChild'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    parent: Notes.simpleSchema().schema('parent')
    shareKey: Notes.simpleSchema().schema('shareKey')
    upperSibling: Notes.simpleSchema().schema('_id')
    rank: Notes.simpleSchema().schema('rank')
  .validator
    clean: yes
    filter: no
  run: ({ noteId, parent = null, shareKey = null, upperSibling = null, rank = null }) ->
    if !@userId || !Notes.isEditable noteId, shareKey
      throw new (Meteor.Error)('not-authorized')

    note = Notes.findOne(noteId)
    if !note
      throw new (Meteor.Error)('note-not-found')
    oldParent = Notes.findOne(note.parent)
    parent = Notes.findOne(parent)
    if upperSibling
      upperSibling = Notes.findOne(upperSibling)
      rank = upperSibling.rank + 1

    if !rank
      rank = 1

    tx.start 'note makeChild'
    parentId = null
    level = 0
    if parent
      Notes.update parent._id, {
        $set: {showChildren: true}
      }, tx: true
      parentId = parent._id
      level = parent.level + 1
    Notes.update noteId, {$set:
      rank: rank
      parent: parentId
      level: level
      focusNext: true
    }, {tx: true, instant: true}

    children = Notes.find(parent: noteId)
    children.forEach (child) ->
      makeChildRun child._id, noteId, shareKey

    rankDenormalizer.updateSiblings parentId

    tx.commit()
    if oldParent
      childCountDenormalizer.afterInsertNote oldParent._id
    if parent
      childCountDenormalizer.afterInsertNote parent._id

removeRun = (id) ->
  children = Notes.find
    parent: id
  children.forEach (child) ->
    removeRun child._id
  note = Notes.findOne(id)
  childCountDenormalizer.afterInsertNote note.parent
  Notes.remove { _id: id }, {tx: true, softDelete: true, instant: true}

export remove = new ValidatedMethod
  name: 'notes.remove'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    shareKey: Notes.simpleSchema().schema('shareKey')
  .validator
    clean: yes
    filter: no
  run: ({ noteId, shareKey = null }) ->
    note = Notes.findOne noteId

    if !@userId || !Notes.isEditable noteId, shareKey
      throw new (Meteor.Error)('not-authorized')

    if Notes.find({owner:@userId}).count() == 1
      throw new (Meteor.Error)('Can\'t delete last note')

    tx.start 'delete note'
    removeRun noteId
    tx.commit()

export outdent = new ValidatedMethod
  name: 'notes.outdent'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    shareKey: Notes.simpleSchema().schema('shareKey')
  .validator
    clean: yes
    filter: no
  run: ({ noteId, shareKey = null }) ->
    if !@userId || !Notes.isEditable noteId, shareKey
      throw new (Meteor.Error)('not-authorized')
    note = Notes.findOne(noteId)
    old_parent = Notes.findOne(note.parent)
    new_parent = Notes.findOne(old_parent.parent)
    if new_parent
      Meteor.call 'notes.makeChild', {
        noteId: note._id
        parent: new_parent._id
        rank: old_parent.rank + 1
        shareKey
      }
    else
      # No parent left to go out to, set things to top level.
      children = Notes.find(parent: note._id)
      children.forEach (child) ->
        Notes.update child._id, $set: level: 1
      Notes.update noteId, $set:
        focusNext: true
        parent: null
        rank: old_parent.rank+1
    childCountDenormalizer.afterInsertNote old_parent._id

export setShowChildren = new ValidatedMethod
  name: 'notes.setShowChildren'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
    show: type: Boolean
  .validator
    clean: yes
  run: ({ noteId, show = true }) ->
    # if !@userId || !Notes.isEditable id, shareKey
    #   throw new (Meteor.Error)('not-authorized')
    children = Notes.find(parent: noteId).count()
    Notes.update noteId, $set:
      showChildren: show
      children: children

    childCountDenormalizer.afterInsertNote noteId

export focus = new ValidatedMethod
  name: 'notes.focus'
  validate: new SimpleSchema
    noteId: Notes.simpleSchema().schema('_id')
  .validator
    clean: yes
  run: ({noteId}) ->
    if !@userId
      throw new (Meteor.Error)('not-authorized')
    Notes.update {_id: noteId}, {$unset:{focusNext: 1}}

Meteor.methods

  'notes.duplicate': (id, parentId = null) ->
    tx.start 'duplicate note'
    Meteor.call 'notes.duplicateRun', id
    tx.commit()

  'notes.duplicateRun': (id, parentId = null) ->
    note = Notes.findOne(id)
    if !note
      return false
    if !parentId
      parentId = note.parent
    newNoteId = Notes.insert
      title: note.title
      createdAt: new Date
      updatedAt: new Date
      rank: note.rank+.5
      owner: @userId
      parent: parentId
      level: note.level
    ,
      tx: true
      instant: true
    children = Notes.find parent: id
    if children
      Notes.update newNoteId,
        $set: showChildren: true,
        children: children.count()
      children.forEach (child) ->
        Meteor.call 'notes.duplicateRun', child._id, newNoteId

# Get note of all method names on Notes
NOTES_METHODS = _.pluck([
  # insert
  updateTitle
  updateBody
  remove
  makeChild
  outdent
  setShowChildren
  favorite
], 'name')

if Meteor.isServer
  # Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule {
    name: (name) ->
      _.contains NOTES_METHODS, name

    # Rate limit per connection ID
    connectionId: ->
      yes

  }, 5, 1000