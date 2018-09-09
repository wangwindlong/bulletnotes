/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let rankDenormalizer;
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

import { Notes } from './notes.js';



export default rankDenormalizer = {
  updateChildren(noteId) {
    const bulk = Notes.rawCollection().initializeUnorderedBulkOp();
    const siblings = Notes.find({ parent: noteId, deleted: {$exists: false} }, {sort: {rank: 1}});
    let count = 0;
    siblings.forEach(function(bro) {
      count = count + 2;
      return bulk.find({_id:bro._id}).update({$set: {
        rank: count
      }
      });});

    return Meteor.wrapAsync(bulk.execute, bulk)();
  }
};

