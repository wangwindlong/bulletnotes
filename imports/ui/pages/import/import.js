/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { Notes } = require('/imports/api/notes/notes.js');

import {
  insert,
  updateBody
} from '/imports/api/notes/methods.js';

require('./import.jade');

Template.Notes_import.onRendered(function() {
  NProgress.done();
  return $(".mdl-layout__content").animate({ scrollTop: 0 }, 500);
});

Template.Notes_import.events({
  'submit .importForm'(event, instance) {
    NProgress.configure({ trickle: false });
    NProgress.start();
    event.preventDefault();
    const data = {};
    const textarea = $(event.currentTarget).find('textarea').get(0);
    $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
    data.importLines = textarea.value.split('\n');
    textarea.value = '';
    data.prevLevel = 0;
    data.prevParents = [];
    data.levelRanks = [];
    return Template.Notes_import.import(data);
  }
});

Template.Notes_import.import = function(data, ii, lastNote = null) {
  if (ii == null) { ii = 0; }
  const line = data.importLines[ii];
  if ((ii > 0) && (ii < data.importLines.length)) {
    NProgress.set(ii/data.importLines.length);
  }
  if ((data.importLines.length - 1) === ii) {
    NProgress.done();
  }
  if (!line || (line.trim().substr(0, 1) !== '-')) {
    // Invalid line, skip it move to the next.
    Template.Notes_import.import(data, ii + 1, lastNote);
    return;
  }
  const leadingSpaceCount = line.match(/^(\s*)/)[1].length;
  const level = leadingSpaceCount / 4;
  let parent = null;

  if (level > 0) {
    // Calculate parent
    if (level > data.prevLevel) {
      // This is a new depth, look at the last added note
      parent = lastNote;
      data.prevParents[level] = parent;
    } else {
      //  We have moved back out to a higher level
      parent = data.prevParents[level];
    }
  }
  data.prevLevel = level;
  if (data.levelRanks[level]) {
    data.levelRanks[level]++;
  } else {
    data.levelRanks[level] = 1;
  }
  let title = line.substr(2 + (level * 4));
  // Replace Workflowy [COMPLETE] tag with a #done tag.
  title = title.replace(/(\[COMPLETE\])/,'#done');
  // Check if the next line is a body
  const nextLine = data.importLines[ii + 1];
  let body = null;
  if (nextLine && (nextLine.trim().substr(0, 1) === '"')) {
    body = nextLine.trim().substr(1);
    body = body.substr(0, body.length-1);
  }

  let parentId = null;
  if (parent) {
    parentId = parent._id;
  }

  return insert.call({
    title,
    rank: data.levelRanks[level],
    parent: parentId,
    isImport: true
  }, function(err, res) {

    if (!level) {
      FlowRouter.go('/');
    }

    if (body) {
      updateBody.call({
        noteId: res._id,
        body,
        createTransaction: false
      });
    }

    // Wrapping the loop in this short Timeout prevents browser lockup
    return setTimeout(() => Template.Notes_import.import(data, ii + 1, res)
    , 1);
  });
};
