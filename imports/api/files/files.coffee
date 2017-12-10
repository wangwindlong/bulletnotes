import { Meteor }          from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

import { Mongo } from 'meteor/mongo'
import { Factory } from 'meteor/dburles:factory'
import SimpleSchema from 'simpl-schema'
import faker from 'faker'

export Files = new FilesCollection(
  debug: true
  collectionName: 'files'
  allowClientCode: false
  onBeforeUpload: (file) ->
    # Allow upload files under 10MB, and only in png/jpg/jpeg formats
    if file.size <= 1024 * 1024 * 10 and /png|jpe?g/i.test(file.extension)
      return true
    'Please upload image, with size equal or less than 10MB'
)

# Files.schema = new SimpleSchema
#   _id:
#     type: String
#     regEx: SimpleSchema.RegEx.Id
#     optional: yes
#   noteId:
#     type: String
#     regEx: SimpleSchema.RegEx.Id
#     index: 1
#   data:
#     type: String
#   file:
#     type: String
#   name:
#     type: String
#   uploadedAt:
#     type: Date
#   owner:
#     type: String
#     regEx: SimpleSchema.RegEx.Id
#     index: 1

# Files.attachSchema Files.schema

# Files.publicFields =
#   noteId: 1
#   data: 1
#   file: 1