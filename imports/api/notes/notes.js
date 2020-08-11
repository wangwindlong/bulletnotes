/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import SimpleSchema from 'simpl-schema';

const sanitizeHtml = require('sanitize-html');

export var Notes = new Mongo.Collection('notes');
export var NoteLogs = new Mongo.Collection('tx.Transactions');

Notes.donePattern = /(#done|#complete|#finished)/gim;

Notes.hashtagPattern = /(((^|\s)#)([a-z\d-]+))/gim;

Notes.namePattern = /(((^|\s)@)([a-z\d-]+))/gim;

Notes.isEditable = function (id, shareKey) {
  if (!Meteor.user()) {
    return false;
  }

  if (Notes.isOwner(id)) {
    return true;
  } else if (!shareKey) {
    return false;
  }

  const sharedNote = Notes.getSharedParent(id, shareKey);
  if (sharedNote && sharedNote.sharedEditable) {
    return true;
  }
};

Notes.getSharedParent = function (id, shareKey) {
  let note = Notes.findOne(id);
  while (note && ((note.shareKey !== shareKey) || (note.shared === false))) {
    note = Notes.findOne(note.parent);
  }
  if (note && (note.shareKey === shareKey) && (note.shared === true)) {
    return note;
  }
};

Notes.isOwner = function (id) {
  const note = Notes.findOne(id);
  return note && (Meteor.userId() === note.owner);
};

Notes.filterBody = function (body) {
  if (!body) {
    return false;
  }
  body = emojione.toShort(body);

  return sanitizeHtml(body, {
    allowedTags: [
      'b',
      'br',
      'i',
      'em',
      'strong'
    ]
  });
};

Notes.filterTitle = function (title) {
  if (!title) {
    return false;
  }
  title = title.replace(/(\r\n|\n|\r)/gm, '');
  title = emojione.toShort(title);

  return sanitizeHtml(title, {
    allowedTags: [
      'b',
      'i',
      'em',
      'strong'
    ]
  });
};

Notes.search = function (search, userId = null, limit) {
  let match, myRegexp;
  if (limit == null) { limit = 100; }
  check(search, Match.Maybe(String));
  let query = {};
  const projection = {
    limit,
    sort: {
      childrenLastShown: 1,
      createdAt: -1
    }
  };
  if (!userId) {
    userId = Meteor.userId();
  }
  if (search.indexOf('last-changed:') === 0) {
    myRegexp = /last-changed:([0-9]+)([a-z]+)/gim;
    match = myRegexp.exec(search);
    query = {
      updatedAt: { $gte: moment().subtract(match[1], match[2]).toDate() },
      owner: userId
    };
  } else if (search.indexOf('not-changed:') === 0) {
    myRegexp = /not-changed:([0-9]+)([a-z]+)/gim;
    match = myRegexp.exec(search);
    query = {
      updatedAt: { $lte: moment().subtract(match[1], match[2]).toDate() },
      owner: userId
    };
  } else if (search.indexOf('not-viewed:') === 0) {
    myRegexp = /not-viewed:([0-9]+)([a-z]+)/gim;
    match = myRegexp.exec(search);
    query = {
      childrenLastShown: { $lte: moment().subtract(match[1], match[2]).toDate() },
      children: {
        $gte: 1
      },
      owner: userId
    };
  } else {
    const regex = new RegExp(search, 'i');
    query = {
      title: regex,
      owner: userId
    };
  }
  query.deleted = { $exists: false };
  return Notes.find(query, projection);
};

// Deny all client-side updates since we will
// be using methods to manage this collection
Notes.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; }
});


Notes.schema = new SimpleSchema({
  _id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true
  },
  parent: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true,
    index: 1
  },
  title: {
    type: String,
    optional: true
  },
  createdAt: {
    type: Date,
    denyUpdate: true
  },
  updatedAt: {
    type: Date,
    optional: true
  },
  deleted: {
    type: Date,
    optional: true,
    index: 1
  },
  owner: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true,
    index: 1
  },
  createdBy: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true
  },
  updatedBy: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true
  },
  level: {
    type: Number,
    optional: true
  },
  children: {
    type: Number,
    optional: true
  },
  rank: {
    type: Number,
    optional: true,
    index: 1
  },
  date: {
    type: Date,
    optional: true,
    index: 1
  },
  calDate: {
    type: Date,
    optional: true,
    index: 1
  },
  showChildren: {
    type: Boolean,
    optional: true
  },
  favorite: {
    type: Boolean,
    optional: true,
    index: 1
  },
  favoritedAt: {
    type: Date,
    optional: true
  },
  body: {
    type: String,
    optional: true
  },
  shared: {
    type: Boolean,
    optional: true
  },
  shareKey: {
    type: String,
    optional: true
  },
  sharedEditable: {
    type: Boolean,
    optional: true
  },
  sharedAt: {
    type: Date,
    optional: true
  },
  progress: {
    type: Number,
    optional: true
  },
  complete: {
    type: Boolean,
    optional: true,
    index: 1
  },
  inbox: {
    type: Boolean,
    optional: true,
    index: 1
  },
  showContent: {
    type: Boolean,
    optional: true
  },
  childrenLastShown: {
    type: Date,
    optional: true
  },
  updateCount: {
    type: Number,
    optional: true
  },
  childrenShownCount: {
    type: Number,
    optional: true
  },
  encrypted: {
    type: Boolean,
    optional: true
  },
  // True if this note is the note that the encryption was ran on.
  encryptedRoot: {
    type: Boolean,
    optional: true
  },
  transaction_id: {
    type: SimpleSchema.RegEx.Id,
    optional: true
  },
  lat: {
    type: Number,
    optional: true
  },
  lon: {
    type: Number,
    optional: true
  }
});

Notes.attachSchema(Notes.schema);

// This represents the keys from Notes objects that should be published
// to the client. If we add secret properties to Note objects, don't note
// them here to keep them private to the server.
Notes.publicFields = {
  parent: 1,
  title: 1,
  createdAt: 1,
  createdBy: 1,
  updatedAt: 1,
  updatedBy: 1,
  updateCount: 1,
  level: 1,
  rank: 1,
  date: 1,
  showChildren: 1,
  favorite: 1,
  body: 1,
  progress: 1
};

Notes.helpers({
  note() {
    return Notes.findOne(this.noteId);
  },

  editableBy(userId) {
    return this.note().editableBy(userId);
  }
});
