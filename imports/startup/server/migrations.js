/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Notes } from '/imports/api/notes/notes.js';

Migrations.add({
  version: 1,
  up() {
    const notes = Notes.find({
      children: {$gte: 1}});
    return notes.forEach(note =>
      Notes.update(note._id, {
        $set: {
          childrenLastShown: new Date
        }
      }
      )
    );
  },
  down() {
    return true;
  }
});

Migrations.add({
  version: 2,
  up() {
    const users = Meteor.users.find({});
    return users.forEach(user =>
      Meteor.users.update(user._id, {
        $set: {
          referralCount: 0
        }
      }
      )
    );
  },
  down() {
    return true;
  }
});

Migrations.add({
  version: 3,
  up() {
    const notes = Notes.find();
    return notes.forEach(function(note) {
      let complete = false;
      if (note.title && note.title.match(Notes.donePattern)) {
        complete = true;
      }
      return Notes.update(note._id, {
        $set: {
          complete
        }
      }
      );
    });
  },
  down() {
    return true;
  }
});

Migrations.add({
  version: 4,
  up() {
    const users = Meteor.users.find({});
    return users.forEach(user =>
      Meteor.users.update(user._id, {
        $set: {
          isPro: true
        }
      }
      )
    );
  },
  down() {
    return true;
  }
});
