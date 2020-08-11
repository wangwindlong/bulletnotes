require('./tagList.jade');

import { Notes } from '/imports/api/notes/notes.js';

Template.tagList.helpers({
  tags() {
    let taggedNotes = Notes.search('#')
    let tags = []
    taggedNotes.forEach(function(note) {
      const noteTags = note.title.match(/#\w+/g);
      tags = tags.concat(noteTags)
    })
    var tagObjs = {};
    for(var ii in tags) {
      var tag = tags[ii].toLowerCase();
      var tagObj = tagObjs[tag];
      if (!tagObj) {
          tagObj = {'count':1};
      } else {
          tagObj.count++;
      }
      tagObjs[tag] = tagObj;
    }
    var tagObjsArray = [];
    for (var tag in tagObjs) {
        var tagObj = tagObjs[tag];
        tagObj.tag = Template.bulletNotes.formatText(tag)
        tagObjsArray.push(tagObj);
    }
    let tagCounts = tagObjsArray.sort(function (a, b) {
        return b.count - a.count;
    });
    return tagCounts
  },
})