/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Random } from 'meteor/random';

import childCountDenormalizer from './childCountDenormalizer.js';
const sanitizeHtml = require('sanitize-html');

import { Notes } from './notes.js';

export var insert = new ValidatedMethod({
  name: 'notes.insert',
  validate: new SimpleSchema({
    title: Notes.simpleSchema().schema('title'),
    rank: Notes.simpleSchema().schema('rank'),
    parent: Notes.simpleSchema().schema('parent'),
    shareKey: Notes.simpleSchema().schema('shareKey'),
    complete: Notes.simpleSchema().schema('complete'),
    showChildren: Notes.simpleSchema().schema('showChildren'),
    ownerId: Notes.simpleSchema().schema('owner'),
    isImport: {
      type: Boolean,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    let noteId;
    let obj = args[0],
      { title,
      rank,
      parent } = obj,
      val = obj.shareKey,
      shareKey = val != null ? val : null,
      val1 = obj.isImport,
      isImport = val1 != null ? val1 : false,
      val2 = obj.complete,
      complete = val2 != null ? val2 : false,
      val3 = obj.showChildren,
      showChildren = val3 != null ? val3 : false,
      val4 = obj.ownerId,
      ownerId = val4 != null ? val4 : null;
    parent = Notes.findOne(parent);

    // if note.isPrivate() and note.userId isnt @userId
    //   throw new Meteor.Error 'notes.insert.accessDenied',
    // 'Cannot add notes to a private note that is not yours'

    if (!Meteor.isServer) {
      if (!Meteor.user()) {
        throw new Meteor.Error('not-authorized',
          'Please login');
      }

      if (parentId && !Notes.isEditable(parentId, shareKey)) {
        throw new Meteor.Error('not-authorized',
          'Cannot edit this note');
      }
    }

    if (this.userId) {
      ownerId = this.userId;
    }

    const noteCount = Notes.find({
      owner: ownerId,
      deleted: {$exists: false}})
    .count();

    let referralCount = 0;
    const owner = Meteor.users.findOne(ownerId);
    if (owner.referralCount > 0) {
      ({ referralCount } = owner);
    }

    if (!owner.isAdmin && !owner.isPro && (noteCount >= (Meteor.settings.public.noteLimit * (referralCount + 1)))) {
      throw new (Meteor.Error)('Maximum number of notes reached.');
    }

    var parentId = null;

    if (parent) {
      parentId = parent._id;
    }

    const sharedParent = Notes.getSharedParent(parentId, shareKey);
    if (sharedParent) {
      ownerId = sharedParent.owner;
    }

    const note = {
      owner: ownerId,
      parent: parentId,
      rank,
      createdAt: new Date(),
      complete,
      showChildren,
      createdBy: ownerId
    };

    // Only create a transaction if we are not importing.
    if (isImport) {
      noteId = Notes.insert(note);
    } else {
      noteId = Notes.insert(note, {tx: true});
    }

    childCountDenormalizer.afterInsertNote(parentId);

    if (title) {
      Meteor.call('notes.updateTitle', {
        noteId,
        title,
        createTransaction: false
      }
      );
    }

    Meteor.users.update(ownerId,
      {$inc:{"notesCreated":1}});

    if (Meteor.isClient) {
      Template.App_body.recordEvent('newNote', {owner: ownerId});
    }

    return note;
  }
});

export var share = new ValidatedMethod({
  name: 'notes.share',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    editable: {
      type: Boolean,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0], { noteId } = obj, val = obj.editable, editable = val != null ? val : false;
    if (!this.userId) {
      throw new (Meteor.Error)('not-authorized');
    }
    return Notes.update(noteId, { $set: {
      shared: true,
      shareKey: Random.id(),
      sharedEditable: editable,
      sharedAt: new Date
    }
  }
    );
  }
});

export var favorite = new ValidatedMethod({
  name: 'notes.favorite',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id')})
  .validator({
    clean: true,
    filter: false
  }),
  run({ noteId }) {
    if (!this.userId) {
      throw new (Meteor.Error)('not-authorized');
    }
    const note = Notes.findOne(noteId);
    return Notes.update(noteId, { $set: {
      favorite: !note.favorite,
      favoritedAt: new Date
    }
  }
    );
  }
});

export var updateBody = new ValidatedMethod({
  name: 'notes.updateBody',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    body: Notes.simpleSchema().schema('body'),
    createTransaction: {
      type: Boolean,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    let obj = args[0],
      { noteId,
      body } = obj,
      val = obj.createTransaction,
      createTransaction = val != null ? val : true;
    const note = Notes.findOne(noteId);
    let bodyHasContent = true;

    // This is all just to check if the body actually has content.
    // sanitizedBody is not saved
    let sanitizedBody = sanitizeHtml(body,
      {allowedTags: []});
    sanitizedBody = sanitizedBody.replace(/(\r\n|\n|\r|\s|\\n)/gm, '');

    if (sanitizedBody.length < 1) {
      bodyHasContent = false;
    }

    if (body && bodyHasContent) {
      body = Notes.filterBody(body);

      return Notes.update(noteId, {$set: {
        body,
        updatedAt: new Date
      },$inc: {
        updateCount: 1
      }}, {tx: createTransaction});
    } else {
      return Notes.update(noteId, {$unset: {
        body: 1
      }, $set: {
        showContent: false
      }}, {tx: createTransaction});
    }
  }
});

export var setDueDate = new ValidatedMethod({
  name: 'notes.setDueDate',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    date: {
      type: String
    },
    createTransaction: {
      type: Boolean,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0],
      { noteId,
      date } = obj,
      val = obj.createTransaction,
      createTransaction = val != null ? val : true;
    const note = Notes.findOne(noteId);
    if (note.owner !== this.userId) {
      return;
    }

    let title = note.title.replace(/#(date|due)-([0-9]+(-?))+/gim,'');
    title = title.trim();
    title = title+' #date-'+date;
    return Notes.update(noteId, { $set: {
      date,
      title,
      updatedAt: new Date
    }
  }
    );
  }
});

export var stopSharing = new ValidatedMethod({
  name: 'notes.stopSharing',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id')})
  .validator({
    clean: true,
    filter: false
  }),
  run({ noteId }) {
    if (!Notes.isOwner(noteId)) {
      throw new (Meteor.Error)('not-authorized');
    }

    return Notes.update(noteId, { $unset: {
      shared: 1,
      shareKey: 1
    }
  }
    );
  }
});

export var updateLocation = new ValidatedMethod({
  name: 'notes.updateLocation',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    lat: Notes.simpleSchema().schema('lat'),
    lon: Notes.simpleSchema().schema('lon'),
    shareKey: Notes.simpleSchema().schema('shareKey')}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0],
      { noteId,
      lat,
      lon } = obj,
      val = obj.shareKey,
      shareKey = val != null ? val : null;
    const note = Notes.findOne(noteId);

    if (!Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }

    return Notes.update(noteId, {$set: {
      lat,
      lon
    }}, {tx: true});
  }
});

export var setEncrypted = new ValidatedMethod({
  name: 'notes.setEncrypted',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    encrypted: Notes.simpleSchema().schema('encrypted'),
    encryptedRoot: Notes.simpleSchema().schema('encryptedRoot'),
    shareKey: Notes.simpleSchema().schema('shareKey')}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0],
      { noteId,
      encrypted } = obj,
      val = obj.encryptedRoot,
      encryptedRoot = val != null ? val : false,
      val1 = obj.shareKey,
      shareKey = val1 != null ? val1 : null;
    const note = Notes.findOne(noteId);

    if (!Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }

    return Notes.update(noteId, {$set: {
      encrypted,
      encryptedRoot
    }}, {tx: true});
  }
});


export var updateTitle = new ValidatedMethod({
  name: 'notes.updateTitle',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    title: Notes.simpleSchema().schema('title'),
    shareKey: Notes.simpleSchema().schema('shareKey'),
    lat: Notes.simpleSchema().schema('lat'),
    lon: Notes.simpleSchema().schema('lon'),
    createTransaction: {
      type: Boolean,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    let date, match;
    let obj = args[0],
      { noteId,
      title } = obj,
      val = obj.shareKey,
      shareKey = val != null ? val : null,
      val1 = obj.createTransaction,
      createTransaction = val1 != null ? val1 : true,
      val2 = obj.lat,
      lat = val2 != null ? val2 : null,
      val3 = obj.lon,
      lon = val3 != null ? val3 : null;
    const note = Notes.findOne(noteId);

    if (!Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }

    if (createTransaction) {
      tx.start('Update Note Title', { context:{ noteId } });
    }
    
    title = Notes.filterTitle(title);
    if (title) {
      match = title.match(/#date-([0-9]+(-?))+/gim);
    } else {
      title = '';
    }

    if (match) {
      date = match[0];
      Notes.update(noteId, {$set: {
        calDate: moment(date).format()
      },$inc: {
        updateCount: 1
      }});
    } else {
      Notes.update(noteId, {$unset: {
        date: 1
      },$inc: {
        updateCount: 1
      }});
    }

    let complete = false;
    if (title.match(Notes.donePattern)) {
      complete = true;
    }

    if (lat) {
      Notes.update(noteId, {$set: {
        lat,
        lon
      }});
    }

    Notes.update(noteId, {$set: {
      title,
      updatedAt: new Date,
      updatedBy: this.userId,
      complete
    }}, {tx: createTransaction});

    if (createTransaction) {
      tx.commit();
    }

    return Meteor.call('tags.updateNoteTags',
      {noteId: note._id});
  }
});

export var makeChild = new ValidatedMethod({
  name: 'notes.makeChild',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    parent: Notes.simpleSchema().schema('parent'),
    shareKey: Notes.simpleSchema().schema('shareKey'),
    upperSibling: Notes.simpleSchema().schema('_id'),
    rank: Notes.simpleSchema().schema('rank'),
    expandParent: {
      type: Boolean,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    let obj = args[0],
      { noteId } = obj,
      val = obj.parent,
      parent = val != null ? val : null,
      val1 = obj.shareKey,
      shareKey = val1 != null ? val1 : null,
      val2 = obj.upperSibling,
      upperSibling = val2 != null ? val2 : null,
      val3 = obj.rank,
      rank = val3 != null ? val3 : null,
      val4 = obj.expandParent,
      expandParent = val4 != null ? val4 : true;
    if (!Meteor.isServer && (!this.userId || !Notes.isEditable(noteId, shareKey))) {
      throw new (Meteor.Error)('not-authorized');
    }

    const note = Notes.findOne(noteId);
    if (!note) {
      throw new (Meteor.Error)('note-not-found');
    }
    const oldParent = Notes.findOne(note.parent);
    if (parent) {
      parent = Notes.findOne(parent);
    }

    if (rank < 1) {
      if (upperSibling) {
        upperSibling = Notes.findOne(upperSibling);
        rank = upperSibling.rank + 1;
      } else {
        if (parent) {
          rank = Notes.find({parent:parent._id}).count() * 2;
        }
      }
    }

    if (rank < 1) {
      rank = 1;
    }

    let makeTx = false
    if (Meteor.isClient) {
      tx.start('Move Note');
      makeTx = true
    }
    let parentId = null;
    const level = 0;
    if (parent) {
      parentId = parent._id;
    }

    if (expandParent) {
      Notes.update(parentId, {$set: {
        showChildren: true,
        childrenLastShown: new Date
      }
      }, {tx: makeTx });
    }
    Notes.update(noteId, {$set: {
      rank,
      parent: parentId
    }
    }, {tx: makeTx });
    if (Meteor.isClient) {
      tx.commit();
    }

    if (oldParent) {
      Meteor.call('notes.denormalizeChildCount',
        {noteId: oldParent._id});
    }
    if (parent) {
      Meteor.call('notes.denormalizeChildCount',
        {noteId: parent._id});
    }
  }
});


var removeRun = function(note) {
  Notes.remove({ _id: note._id }, { tx: true, softDelete: true });

  const children = Notes.find({
    parent: note._id});
  return children.forEach(child => removeRun(child));
};

export var remove = new ValidatedMethod({
  name: 'notes.remove',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    shareKey: Notes.simpleSchema().schema('shareKey')}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0], { noteId } = obj, val = obj.shareKey, shareKey = val != null ? val : null;
    const note = Notes.findOne(noteId);

    if (!this.userId || !Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }

    tx.start('delete note');
    removeRun(note);
    tx.commit();

    return childCountDenormalizer.afterInsertNote(note.parent);
  }
});

export var outdent = new ValidatedMethod({
  name: 'notes.outdent',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    shareKey: Notes.simpleSchema().schema('shareKey')}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0], { noteId } = obj, val = obj.shareKey, shareKey = val != null ? val : null;
    if (!this.userId || !Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }
    const note = Notes.findOne(noteId);
    const old_parent = Notes.findOne(note.parent);
    const new_parent = Notes.findOne(old_parent.parent);
    if (new_parent) {
      Meteor.call('notes.makeChild', {
        noteId: note._id,
        parent: new_parent._id,
        rank: old_parent.rank + 1,
        shareKey
      });
    } else {
      // No parent left to go out to, set things to top level.
      const children = Notes.find({parent: note._id});
      children.forEach(child => Notes.update(child._id, {$set: {level: 1}}));
      Notes.update(noteId, { $set: {
        parent: null,
        rank: old_parent.rank+1
      }
    }
      );
    }

    return childCountDenormalizer.afterInsertNote(old_parent._id);
  }
});

export var setShowContent = new ValidatedMethod({
  name: 'notes.setShowContent',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    showContent: { type: Boolean
  },
    shareKey: Notes.simpleSchema().schema('shareKey')}).validator({
    clean: true}),
  run(...args) {
    const obj = args[0],
      { noteId,
      showContent } = obj,
      val = obj.shareKey,
      shareKey = val != null ? val : null;
    if (!this.userId || !Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }

    return Notes.update(noteId, { $set: {
      showContent
    }
  }
    );
  }
});

export var setChildrenLastShown = new ValidatedMethod({
  name: 'notes.setChildrenLastShown',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id')})
  .validator({
    clean: true}),
  run({ noteId }) {
    if (!this.userId) {
      throw new (Meteor.Error)('not-authorized');
    }

    Notes.update(noteId, { $set: {
      childrenLastShown: new Date
    }
  }
    );

    return Notes.update(noteId, { $inc: {
      childrenShownCount: 1
    }
  }
    );
  }
});

export var setShowChildren = new ValidatedMethod({
  name: 'notes.setShowChildren',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    show: { type: Boolean
  }}).validator({
    clean: true}),
  run(...args) {
    const obj = args[0],
      { noteId } = obj,
      val = obj.show,
      show = val != null ? val : true,
      val1 = obj.shareKey,
      shareKey = val1 != null ? val1 : null;
    if (!this.userId || !Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }

    Notes.update(noteId, { $set: {
      showChildren: show,
      childrenLastShown: new Date
    }
  }
    );

    if (show) {
      return Notes.update(noteId, { 
        $set: {
          childrenLastShown: new Date
        },
        $inc: {
          childrenShownCount: 1
        }
      }
      );
    }
  }
});


export var duplicate = new ValidatedMethod({
  name: 'notes.duplicate',
  validate: new SimpleSchema({
    noteId: Notes.simpleSchema().schema('_id'),
    shareKey: Notes.simpleSchema().schema('shareKey')}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    const obj = args[0], { noteId } = obj, val = obj.shareKey, shareKey = val != null ? val : null;
    if (!this.userId || !Notes.isEditable(noteId, shareKey)) {
      throw new (Meteor.Error)('not-authorized');
    }
    return duplicateRun(this.userId, noteId);
  }
});

var duplicateRun = function(userId, id, parentId = null) {
  const note = Notes.findOne(id);
  if (!note) {
    return false;
  }
  if (!parentId) {
    parentId = note.parent;
  }
  const newNoteId = Notes.insert({
    title: note.title,
    createdAt: new Date,
    rank: note.rank+.5,
    owner: userId,
    parent: parentId,
    level: note.level,
    body: note.body,
    complete: false
  });

  Meteor.users.update({_id:this.userId},
    {$inc:{"notesCreated":1}});

  const children = Notes.find({
    parent: id,
    deleted: {$exists: false}});
  if (children) {
    Notes.update(newNoteId, {
      $set: { showChildren: true,
      children: children.count()
    }
    }
    );
    return children.forEach(child => duplicateRun(userId, child._id, newNoteId));
  }
};

const NOTES_METHODS = _.pluck([
  updateBody,
  remove,
  makeChild,
  outdent,
  updateLocation,
  setEncrypted,
  setShowChildren,
  setShowContent,
  favorite,
  duplicate
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(NOTES_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 1000);
}
