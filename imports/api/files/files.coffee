import { Meteor }          from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';
import { _ }                 from 'meteor/underscore';

import { Mongo } from 'meteor/mongo'
import { Factory } from 'meteor/dburles:factory'
import SimpleSchema from 'simpl-schema'
import faker from 'faker'

fileSchema = _.extend(FilesCollection.schema,
  noteId:
    type: String
)
console.log FilesCollection.schema
console.log fileSchema
export Files = new FilesCollection(
  schema: fileSchema
  debug: true
  collectionName: 'files'
  allowClientCode: false
  onBeforeUpload: (file) ->
    # Allow upload files under 10MB, and only in png/jpg/jpeg formats
    if file.size <= 1024 * 1024 * 10 and /png|jpe?g/i.test(file.extension)
      return true
    'Please upload image, with size equal or less than 10MB'
)
Files.collection.attachSchema fileSchema
