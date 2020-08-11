/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LocalStorage;
const pjson = require('/package.json');

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

import { Notes } from '/imports/api/notes/notes.js';
import childCountDenormalizer from '/imports/api/notes/childCountDenormalizer.js';

if (typeof localStorage === 'undefined' || localStorage === null) {
  ({LocalStorage} = require('node-localstorage'));
}

const Bot = {};

Bot.maxTitleLength = 100;
Bot.maxMobileTitleLength = 80;
Bot.maxNoteReturn = 100;
Bot.defaultLimit = 9;

Bot.formatNote = function(note, mobileFormat) {
  let title;
  if (note.title) {
    title = note.title.replace(/(<([^>]+)>|:|_)/ig, " ");
  }
  if (mobileFormat) {
    if (title) {
      if (title.length > Bot.maxTitleLength) {
        title = title.substr(0,Bot.maxMobileTitleLength) + '...';
      }
      return title;
    } else {
      return '_( Empty Note )_';
    }
  } else {
    if (title) {
      if (title.length > Bot.maxTitleLength) {
        title = title.substr(0,Bot.maxTitleLength) + '...';
      }
      return title + ' - ' + Meteor.settings.public.url + '/note/' + note._id;
    } else {
      return `_( Empty Note )_ - ${Meteor.settings.public.url}/note/${note._id}`;
    }
  }
};

Bot.formatNotes = function(notes, limitMultiplier, mobileFormat) {
  let msg;
  if (notes.count()) {
    let ii = 1;
    const noteIds = [];
    notes = notes.fetch();

    let showNextPage = false;

    if (notes.length > (Bot.defaultLimit * limitMultiplier)) {
      // There are more notes to scroll to, show the next page option
      showNextPage = true;
      notes.pop();
    }

    notes = notes.slice(Bot.defaultLimit * -1);
    msg = '';
    if (limitMultiplier > 1) {
      msg = msg + '`-1` - _( Previous Notes )_\n';
    }

    for (let note of Array.from(notes)) {
      const childCount = note.children || 0;
      msg = msg + '`' + ii + '` - ' + '_[' + childCount + ']_ - ' + Bot.formatNote(note, mobileFormat) + '\n';
      ii++;
    }
    if (showNextPage) {
      msg = msg + '`0` - _( More Notes )_\n';
    }

  } else {
    msg = '_( No Notes )_\n';
  }

  return msg;
};

Bot.generateNoteIds = function(notes, limitMultiplier) {
  const noteIds = [];
  notes = notes.fetch();
  if (notes.length > (Bot.defaultLimit * limitMultiplier)) {
    notes.pop();
  }
  notes = notes.slice(Bot.defaultLimit * -1);
  for (let note of Array.from(notes)) {
    noteIds.push(note._id);
  }
  return noteIds;
};

Bot.getNoteRange = conversation => ((Bot.defaultLimit * (conversation.limitMultiplier-1)) + 1)+'-'+(Bot.defaultLimit * (conversation.limitMultiplier));

Bot.getRecent = function(limit,user) {
  if (limit) {
    limit = Math.min(Bot.maxNoteReturn, limit);
  } else {
    limit = Bot.defaultLimit;
  }

  const notes = Notes.find({owner:user._id,deleted:{$exists: false}},{sort:{createdAt:-1},limit});

  let msg = `Here are your most recent ${limit} notes:\n\n`;
  let ii = 1;
  notes.forEach(function(note) {
    msg = msg + '*' + ii + '* - ' + Bot.formatNote(note,user.telegramBotMobileFormat) + '\n';
    return ii++;
  });
  return msg;
};

Bot.isYes = function(command) {
  if (command) {
    if ((command.toLowerCase() === 'y') || (command.toLowerCase() === 'yes')) {
      return true;
    }
  }
};

Bot.deleteNote = function(noteId) {
  let msg;
  const note = Notes.findOne(noteId);
  Notes.update(note._id, { $set: {
      deleted: new Date()
    }
}
  );

  if (note) {
    Meteor.defer(() => childCountDenormalizer.afterInsertNote(note.parent));
  }

  return msg = `\`Note deleted successfully!\` - ${Bot.formatNote(note,false)}\n\n`;
};

Bot.editNoteTitle = function(noteId, title) {
  let msg;
  Meteor.call('notes.updateTitle', {
    noteId,
    title
  }
  );

  return msg = `\`Note edited successfully.\` - ${Bot.formatNote({_id:noteId,title},false)}\n\n`;
};

// Actual chat method

export var chat = new ValidatedMethod({
  name: 'bot.chat',
  validate: new SimpleSchema({
    chat: {
      type: String
    },
    userId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
      optional: true
    },
    apiKey: {
      type: String,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run(...args) {
    let apiKey, conversationCommand, msg, note, noteIds, noteSelected, obj, user, userId, val, val1;
    let chat;
    obj = args[0],
      { chat } = obj,
      val = obj.userId,
      userId = val != null ? val : null,
      val1 = obj.apiKey,
      apiKey = val1 != null ? val1 : null;
    let command = chat.split(' ');
    if (!command[0]) {
      false;
    }

    if (userId) {
      user = Meteor.users.findOne(userId);
    } else if (apiKey) {
      user = Meteor.users.findOne({apiKey});
      if (!user) {
        throw new (Meteor.Error)('Bad API Key');
      }
    } else {
      user = Meteor.user();
    }

    if (!user) {
      return `Please login. You can register at ${Meteor.settings.public.url} or chat me on Telegram at @BulletNotesBot`;
    }

    Meteor.users.update(user._id, { $inc: {
      chatBotUseCount:1
    }
  }
    );

    const conversation = new LocalStorage(`./conversations${user._id}`);
    let limitMultiplier = 1;

    // Check for an active conversation
    if (conversationCommand = conversation.getItem('command')) {
      let didPaginate;
      limitMultiplier = conversation.getItem('limitMultiplier') || 1;
      limitMultiplier = Number.parseInt(limitMultiplier, 10);

      // Check for pagination first
      if (command[0] === "0") {
        // Advance pagination
        if (limitMultiplier < 10) {
          limitMultiplier = limitMultiplier + 1;
          conversation.setItem('limitMultiplier', limitMultiplier);
          command[0] = "/edit";
        } else {
          msg = 'Sorry that is all the notes I can show you. Try searching with `/find stuff` or browsing with `/browse`.\n\n';
        }
        didPaginate = true;
      } else if (command[0] === "-1") {
        // Retreat pagination
        if (limitMultiplier > 1) {
          limitMultiplier = limitMultiplier - 1;
          conversation.setItem('limitMultiplier', limitMultiplier);
        } else {
          msg = 'Already at the first notes!.\n\n';
        }
        didPaginate = true;
      }

      switch (conversationCommand) {
        case 'delete':
          command[0] = "/delete";

          if (!didPaginate) {
            let deleteId = conversation.getItem('deleteId');
            noteIds = conversation.getItem('noteIds');

            if (noteIds) {
              noteIds = noteIds.split(',');
            }
            
            // If we have a '# y', delete it right away
            if ((deleteId && Bot.isYes(chat)) || ((command.length === 2) && Bot.isYes(command[1]))) {
              deleteId = deleteId || noteIds[command[0]-1];
              msg = Bot.deleteNote(deleteId);
              msg = msg + Bot.getRecent(Bot.defaultLimit, user);
              conversation.clear();

            // Otherwise get confirmation
            } else if (!deleteId) {
              if (noteSelected = parseInt(chat, 10)) {
                note = Notes.findOne(noteIds[noteSelected-1]);
                conversation.setItem('deleteId', note._id);

                msg = `Selected note: ${Bot.formatNote(note,user.telegramBotMobileFormat)} - *Really delete it?* \`(Y)es\`/\`(N)o\``;
              } else {
                msg = '`Delete note cancelled`.\n\n';
                msg = msg + Bot.getRecent(Bot.defaultLimit, user);
                conversation.clear();
              }
            } else {
              msg = '`Delete note cancelled.`\n\n';
              msg = msg + Bot.getRecent(Bot.defaultLimit, user);
              conversation.clear();
            }
          }
          break;

        case 'edit':
          command[0] = "/edit";

          // If we didn't change pagination, then try and do stuff
          if (!didPaginate) {
            let editId = conversation.getItem('editId');
            noteIds = conversation.getItem('noteIds');

            if (noteIds) {
              noteIds = noteIds.split(',');
            }
            
            // Editing a note, save what came in
            if (editId) {
              msg = Bot.editNoteTitle(editId, chat);
              msg = msg + Bot.getRecent(Bot.defaultLimit, user);
              conversation.clear();

            // If we have a '# edited message', edit it right away
            } else if (command.length > 1) {

              editId = noteIds[command[0]-1];
              command.shift();
              msg = Bot.editNoteTitle(editId, command.join(' '));
              msg = msg + Bot.getRecent(Bot.defaultLimit, user);
              conversation.clear();

            // Otherwise get confirmation
            } else if (!editId) {
              if (noteSelected = parseInt(chat, 10)) {
                note = Notes.findOne(noteIds[noteSelected-1]);
                conversation.setItem('editId', note._id);

                msg = `Current note text: ${note.title}\n\n\`Reply\` with the updated text you would like.`;
              } else {
                msg = '`Edit note cancelled`.\n\n';
                msg = msg + Bot.getRecent(Bot.defaultLimit, user);
                conversation.clear();
              }
            } else {
              msg = '`Edit note cancelled.`\n\n';
              msg = msg + Bot.getRecent(Bot.defaultLimit, user);
              conversation.clear();
            }
          }
          break;
      }
    }


    // We don't have a conversation going, move on to the commands
    if (!msg) {
      let mobileStatus, notes, regex, searchTerm;
      switch (command[0]) {
        case '/help': case '/h':
          if (command.length < 2) {
            msg = 'Hi, I\'m *BulletNotesBot*! :thumbup:\n\n';
            msg = msg + 'I have the following commands available:\n\n';
            
            msg = msg + '`/delete` `/del` `/d` - Delete a note.\n';
            msg = msg + '`/edit` `/e` - Edit a note.\n';
            msg = msg + '`/find (term)` `/f` - Search your notes.\n';
            msg = msg + '`/mobile` - Toggle mobile formatting of results.\n';
            msg = msg + '`/recent` `/r` - Show your newest notes.\n';
            msg = msg + '`/stats` `/s` - Get stats on your BulletNotes usage.\n';
            msg = msg + '`/support` - Detailed support information.\n';

            msg = msg + '\nType `/help command` to get more information about it.';
          } else {
            switch (command[1]) {
              case 'delete': case '/delete': case '/del': case '/d': case 'd':
                msg = '`Delete Note`\n\n';
                msg = msg + 'This command can be used several ways to delete a specific note.\n\n';
                msg = msg + '`/delete` - Returns your 9 most recent notes for you to choose which one to delete.\n';
                msg = msg + '`/delete 2` - Ask to delete your second most recent note. This is a shortcut if you already know the recent number of the note you want to delete.\n';
                msg = msg + '`/delete 2 y` - If you are really sure you know which note is the second to last note, adding a `y` to the end will skip the confirmation.\n';
                msg = msg + '`/delete search` - Returns 9 most recent notes containing the search query for you to choose which one to delete.\n';

                msg = msg + '\n`/delete` `/del` or `/d` may be used interchangeably.';
                break;

              case 'edit': case '/edit': case '/e': case 'e':
                msg = '`Edit Note`\n\n';
                msg = msg + 'This command can be used several ways to edit a specific note.';
                msg = msg + '`/edit` - Returns your 9 most recent notes for you to choose which one to edit.\n';
                msg = msg + '`/edit 2` - Ask to edit your second most recent note. This is a shortcut if you already know the recent number of the note you want to edit.\n';
                msg = msg + '`/edit 2 New Text` - Adding the edit text after the note number will update the note without needing a confirmation.\n';
                msg = msg + '`/edit search` - Returns 9 most recent notes containing the search query for you to choose which one to edit.\n';

                msg = msg + '\n`/edit` or `/e` may be used interchangeably.';
                break;

              case 'find': case '/find': case '/f': case '/search': case 'f': case 'search':
                msg = '`Find Notes`\n\n';
                msg = msg + 'This command is used to find notes.\n\n';
                msg = msg + '`/find search query` - Returns your 9 most recent notes containing the search query.\n';

                msg = msg + '\n`/find` `/f` or `/search` may be used interchangeably.';
                break;

              case 'mobile': case '/mobile':
                msg = '`Mobile Mode`\n\n';
                msg = msg + 'Toggles whether to receive note summaries for mobile, or more detailed results for desktop use.';
                break;

              case 'recent': case '/recent': case '/r': case 'r':
                msg = '`Recent Notes`\n\n';
                msg = msg + 'This command is used to view recent notes.\n\n';
                msg = msg + '`/recent 25` - Returns your 25 most recent notes.\n';

                msg = msg + '\n`/recent` or `/r` may be used interchangeably.';
                break;

              case 'stats': case '/stats': case '/s': case 's':
                msg = '`Statistics`\n\n';
                msg = msg + 'Mostly for fun. ;)';

                msg = msg + '\n`/stats` or `/s` may be used interchangeably.';
                break;

              case 'support': case '/suuport':
                msg = '`Support`\n\n';
                msg = msg + 'How to get help from BulletNotes community and staff.';
                break;
            }
          }
          break;

        case '/support':
            msg = `BulletNotes Version: ${pjson.version}\n`;
            msg = msg + 'Build Date: ' + pjson.releaseDate + '\n\n';
            msg = msg + 'https://bulletnotes.io\n\nSupport: `http://bulletnotes.helpy.io/admin/topics`\nTweet at us: `https://twitter.com/BulletNotes_io`';
          break;

        case '/stats': case '/s':
          var today = new Date;
          var date_to_reply = new Date(user.createdAt);
          var millis = date_to_reply.getTime() - today.getTime();
          var days = Math.ceil(millis / (1000 * 60 * 60 * 24)) * -1;
          var noteCount = user.notesCreated || 0;
          var notesDay = ((Math.round((noteCount / days) * 100) * .01) || 0);

          if (user.telegramBotMobileFormat) {
            mobileStatus = 'You are viewing `mobile` formatted results. (`/mobile` to toggle)';
          } else {
            mobileStatus = 'You are viewing `detailed` results. (`/mobile` to toggle)';
          }

          msg = mobileStatus + '\n' +
          'Your account was created `' + moment(user.createdAt).fromNow() + '. 📆`\n'+
          'Since then you have created `' + noteCount + '` notes. 😎\n'+
          'That is `' + notesDay + '` notes a day! 👍\n'+
          'We have talked `' + user.chatBotUseCount + '` times so far. ❤️\n'+
          'If I have bugs, please report them. I was born ' + moment('2017-11-27').fromNow()+' :cake:\n';
          'Keep up the great work, and thanks for using BulletNotes! 😄';
          break;

        case '/mobile':
          if (!user.telegramBotMobileFormat) {
            Meteor.users.update(user._id, { $set: {
              telegramBotMobileFormat:true
            }
          }
            );
            msg = 'Now showing shorter (mobile-friendly) results. Type `/mobile` again to toggle back.';
          } else {
            Meteor.users.update(user._id, { $set: {
              telegramBotMobileFormat:false
            }
          }
            );
            msg = 'Now showing more detailed results. Type `/mobile` again to toggle back.';
          }
          break;

        case '/find': case '/f': case '/search':
          // If a limit is not provided as the first param, use 10
          if (command.length < 2) {
            msg = 'You must provide a search term. Example: `/find #work`';
          } else {
            // Drop the /find from the command
            command.shift();
            searchTerm = command.join(' ');
            notes = Notes.search(searchTerm, user._id, Bot.defaultLimit);

            msg = 'Here are your search results:\n\n';
            let ii = 1;
            notes.forEach(function(note) {
              let title = Bot.formatNote(note);

              // Highlight search terms
              const regex = new RegExp(searchTerm, 'gi');
              title = title.replace(regex, '`$&`');

              msg = msg + '*' + ii + '* - ' + title + '\n';
              return ii++;
            });
          }
          break;

        case '/recent': case '/r':

          // If a limit is not provided as the first param, use the default
          msg = Bot.getRecent(command[1], user);
          break;

        case '/delete': case '/del': case '/d':
          // We add one to the default limit to enable pagining
          notes = Notes.find({owner:user._id,deleted:{$exists: false}},{sort:{createdAt: -1},limit:(Bot.defaultLimit * limitMultiplier) + 1});
          noteIds = Bot.generateNoteIds(notes, limitMultiplier);
          if (command.length < 2) {
            // We don't have a search param, grab the most recent notes

            msg = Bot.formatNotes(notes, limitMultiplier, user.telegramBotMobileFormat);

            msg = msg + '\n`Reply` with the number of the note you want to delete, or reply with `(N)o` to cancel.';
            noteIds = Bot.generateNoteIds(notes, limitMultiplier);
            conversation.setItem('command', 'delete');
            conversation.setItem('noteIds', noteIds);

          } else {

            // We have params, if the first is a number, select that note.
            noteSelected = parseInt(command[1], 10);
            if (noteSelected && (note = Notes.findOne(noteIds[noteSelected-1]))) {
              // We have a note, if there is a second param of yes, just delete it now
              if (Bot.isYes(command[2])) {
                msg = Bot.deleteNote(note._id);
                msg = msg + Bot.getRecent(Bot.defaultLimit, user);

              // No yes, confirm deletion
              } else {
                conversation.setItem('command', 'delete');
                conversation.setItem('deleteId', note._id);
                msg = `Selected note: ${Bot.formatNote(note,user.telegramBotMobileFormat)} - *Really delete it?* \`(Y)es\`/\`(N)o\``;
              }

            } else {
              // We do have a search, find recent notes matching the search
              command.shift();
              searchTerm = command.join(' ');
              notes = Notes.search(searchTerm, user._id, Bot.defaultLimit);
              msg = `Here are your most recent ${Bot.defaultLimit} notes containing \`${searchTerm}\`:\n\n`;

              noteIds = Bot.generateNoteIds(notes, limitMultiplier);
              msg = msg + Bot.formatNotes(notes, limitMultiplier, user.telegramBotMobileFormat);

              msg = msg + '\n`Reply` with the number of the note you want to delete, or reply with `(N)o` to cancel.';

              if (searchTerm) {
                regex = new RegExp(searchTerm, 'gi');
                msg = msg.replace(regex, '*$&*');
              }

              conversation.setItem('searchTerm', searchTerm);
              conversation.setItem('command', 'delete');
              conversation.setItem('noteIds', noteIds);
            }
          }
          break;

        case '/edit': case '/e':
          // We add one to the default limit to enable pagining
          notes = Notes.find({owner:user._id,deleted:{$exists: false}},{sort:{createdAt: -1},limit:(Bot.defaultLimit * limitMultiplier) + 1});
          noteIds = Bot.generateNoteIds(notes, limitMultiplier);
          if (command.length < 2) {
            // We don't have a search param, grab the most recent notes

            msg = Bot.formatNotes(notes, limitMultiplier, user.telegramBotMobileFormat);

            msg = msg + '\n`Reply` with the number of the note you want to edit, or reply with `(N)o` to cancel.';
            noteIds = Bot.generateNoteIds(notes, limitMultiplier);
            conversation.setItem('command', 'edit');
            conversation.setItem('noteIds', noteIds);

          } else {

            // We have params, if the first is a number, select that note.
            noteSelected = parseInt(command[1], 10);
            if (noteSelected && (note = Notes.findOne(noteIds[noteSelected-1]))) {
              // We have a note, if there is more, just edit it now
              command = command.slice(2);
              msg = Bot.editNoteTitle(note._id, command.join(' '));
              msg = msg + Bot.getRecent(Bot.defaultLimit, user);

            } else {
              // We do have a search, find recent notes matching the search
              command.shift();
              searchTerm = command.join(' ');
              // Again add one to the limit to enable pagination
              notes = Notes.search(searchTerm, user._id, Bot.defaultLimit + 1);
              msg = `Here are your most recent ${Bot.defaultLimit} notes containing \`${searchTerm}\`:\n\n`;

              noteIds = Bot.generateNoteIds(notes, limitMultiplier);
              msg = msg + Bot.formatNotes(notes, limitMultiplier, user.telegramBotMobileFormat);

              msg = msg + '\n`Reply` with the number of the note you want to edit, or reply with `(N)o` to cancel.';

              if (searchTerm) {
                regex = new RegExp(searchTerm, 'gi');
                msg = msg.replace(regex, '*$&*');
              }

              conversation.setItem('searchTerm', searchTerm);
              conversation.setItem('command', 'edit');
              conversation.setItem('noteIds', noteIds);
            }
          }
          break;

        // Extras

        case '/random':
          msg = Math.round(Math.random()*100);
          break;

        case '/rot13':
          command.shift();
          msg = command.join(' ').replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
          break;
      }
    }


        // End Switch

    // If we got a chat from a function above, send that.
    if (msg) {
      msg;
    // Otherwise add the chat as a note to the Inbox
    } else {
      const noteId = Meteor.call('notes.inbox', {
        title: chat,
        userId: user._id
      }
      );

      msg = `\`Note Saved!\` ${Bot.formatNote({_id:noteId,title:chat}, false)}`;

      msg;
    }









    // Bot.addListener '/browse', (command, username, data) ->
    //   user = Bot.getUser data
    //   if !user
    //     return false

    //   notes = Notes.find({owner:user._id,deleted:{$exists: false},parent:null},{sort:{rank:1},limit:Bot.defaultLimit + 1})

    //   msg = 'Reply with the number `#` of the note you want to zoom into, `(N)ew` to create a new note, `(E)dit #` to edit a note, `(D)elete #` to delete a note, or `E(x)it` to exit browse mode.\n\n'

    //   msg = msg + 'Here are your top level notes: \n\n'

    //   noteIds = Bot.generateNoteIds notes, 1

    //   msg = msg + Bot.formatNotes notes, 1, user.telegramBotMobileFormat


    //   # Start the conversation
    //   Bot.startConversation username, data.chat.id, ((username, chat, chat_id) ->
    //     conversation = _.find(Bot.conversations[chat_id], (conversation) ->
    //       conversation.username == username
    //     )

    //     conversation.noteIds = Bot.generateNoteIds notes, conversation.limitMultiplier
    //     msg = ''
    //     command = chat.split ' '

    //     # Handle note creation
    //     if conversation.creatingNote
    //       conversation.creatingNote = false
    //       noteId = Meteor.call 'notes.insert',
    //         title: chat
    //         parent: conversation.lastNoteId
    //         ownerId: user._id
    //         rank: 0
    //       Bot.send 'Note Saved! ' + Bot.formatNote({_id:noteId,title:chat},user.telegramBotMobileFormat), data.chat.id, true
    //       createdNote = true

    //     # Handle note deletion
    //     if conversation.deleteId
    //       if chat.toLowerCase() == 'y' || chat.toLowerCase() == 'yes'
    //         Notes.update conversation.deleteId, $set:
    //             deleted: new Date()
    //         msg = 'Note deleted successfully.\n\n'
    //       else
    //         msg = 'Delete note cancelled.\n\n'

    //       conversation.deleteId = null
    //       deletedNote = true

    //     # Handle note editing
    //     if conversation.editId
    //       Notes.update conversation.editId, $set:
    //         title: chat
    //       note = Notes.findOne conversation.editId
    //       Bot.send 'Note edited successfully! ' + Bot.formatNote(note,user.telegramBotMobileFormat), chat_id

    //       conversation.editId = null
    //       editedNote = true

    //     msg = msg + '\n`Reply` with the number `#` of the note you want to zoom into, `(U)p` to go up a level, `(N)ew` to create a new note, `(E)dit #` to edit a note, `(D)elete #` to delete a note, or `E(x)it` to exit browse mode.\n\n'

    //     noteSelected = parseInt chat, 10
    //     # Load the parent note based on various conditions
    //     if noteSelected > 0
    //       note = Notes.findOne conversation.noteIds[noteSelected-1]
    //       conversation.currentNoteId = note._id
    //     else if chat == "-1"
    //       if conversation.limitMultiplier > 0
    //         conversation.limitMultiplier = conversation.limitMultiplier - 1
    //       else
    //         msg = 'Already at the first note.\n\n'
    //       note = Notes.findOne conversation.lastNoteId
    //     else if chat == "0"
    //       if conversation.limitMultiplier < 10
    //         conversation.limitMultiplier = conversation.limitMultiplier + 1
    //       else
    //         msg = 'Sorry that is all the notes I can show you.. Try searching with `/find stuff` or browsing with `/browse`.\n\n'
    //       note = Notes.findOne conversation.lastNoteId
    //     else if chat.toLowerCase() == 'u' || chat.toLowerCase() == 'up'
    //       conversation.limitMultiplier = 1
    //       lastNote = Notes.findOne conversation.lastNoteId
    //       if lastNote
    //         note = Notes.findOne lastNote.parent
    //       else
    //         # Just show the same note set again
    //         note = Notes.findOne conversation.lastNoteId
    //         msg = 'Already at the top level!\n\n'
    //     # We have to make sure we didn't try and delete a note here, because if we picked No, n, it would trigger this.
    //     else if !deletedNote && (command[0].toLowerCase() == 'n' || command[0].toLowerCase() == 'new')
    //       if command.length < 2
    //         conversation.creatingNote = true
    //         Bot.send 'Send your new note!', chat_id
    //         return false
    //       else
    //         command.shift()
    //         noteId = Meteor.call 'notes.insert',
    //           title: command.join ' '
    //           parent: conversation.lastNoteId
    //           ownerId: user._id
    //           rank: 0
    //         Bot.send 'Note Saved! ' + Bot.formatNote({_id:noteId,title:chat},user.telegramBotMobileFormat), data.chat.id, true

    //         # Just show the same note set again
    //         note = Notes.findOne conversation.lastNoteId
    //     else if command[0].toLowerCase() == 'd' || command[0].toLowerCase() == 'delete'
    //       if command.length > 1 && noteSelected = parseInt command[1], 10
    //         # If we have a third param, and that is 'y', delete without confirmation
    //         if command.length == 3 && command[2] == "y"
    //           note = Notes.findOne conversation.noteIds[noteSelected-1]
    //           Notes.update note._id, $set:
    //               deleted: new Date()

    //           if note
    //             childCountDenormalizer.afterInsertNote note.parent

    //           msg = 'Note deleted successfully.\n\n'
    //           # Just show the same note set again
    //           note = Notes.findOne conversation.lastNoteId
    //         # Otherwise get confirmation
    //         else
    //           note = Notes.findOne conversation.noteIds[noteSelected-1]
    //           conversation.deleteId = note._id
    //           msg = 'Selected note: ' + Bot.formatNote(note,user.telegramBotMobileFormat) + ' - *Really delete it?* `(Y)es`/`(N)o`'
    //           Bot.send msg, chat_id, true
    //           return false
    //       else
    //         msg = 'You must specify a note number. Example: `d 5`\n\n'
    //     else if command[0].toLowerCase() == 'e' || command[0].toLowerCase() == 'edit'
    //       if command.length > 1 && noteSelected = parseInt command[1], 10
    //         # We have params after the number, save that as the note
    //         if command.length > 2
    //           command = command.slice 2
    //           editId = conversation.noteIds[noteSelected-1]
    //           title = command.join ' '
    //           Notes.update editId, $set:
    //             title: title
    //           note = Notes.findOne conversation.editId
    //           Bot.send 'Note edited successfully! ' + Bot.formatNote({_id:editId,title:title},user.telegramBotMobileFormat), chat_id
    //           # Just show the same note set again
    //           note = Notes.findOne conversation.lastNoteId
    //         else
    //           note = Notes.findOne conversation.noteIds[noteSelected-1]
    //           conversation.editId = note._id
    //           msg = 'Current note text: `' + note.title + '`\n\n`Reply` with the updated text you would like.'
    //           Bot.send msg, chat_id, true
    //           return false
    //       else
    //         msg = 'You must specify a note number. Example: `e 5`\n\n'
    //     else if createdNote || deletedNote || editedNote
    //       # Just show the same note set again
    //       note = Notes.findOne conversation.lastNoteId
    //     else
    //       Bot.send 'Exited browse mode.', chat_id
    //       Bot.endConversation username, chat_id
    //       return false

    //     if note
    //       conversation.lastNoteId = note._id
    //       msg = msg + 'Here are the child notes of ' + Bot.formatNote(note,user.telegramBotMobileFormat) + ': \n\n'
    //     else
    //       conversation.lastNoteId = null
    //       msg = msg + 'Here are your top level notes: \n\n'

    //     # We add + 1 to this for pagination purposes. So formatNotes can detect if there are more notes to be shown.
    //     notes = Notes.find({owner:user._id,deleted:{$exists: false},parent:conversation.lastNoteId},{sort:{rank:1},limit:Bot.defaultLimit * conversation.limitMultiplier + 1})

    //     msg = msg + Bot.formatNotes notes, conversation.limitMultiplier, user.telegramBotMobileFormat

    //     conversation.noteIds = noteIds
    //     Bot.send msg, chat_id, true 
    //   ),
    //     noteIds: noteIds
    //     lastNoteId: null
    //     limitMultiplier: 1

    //   # The return in this listener will be the first prompt
    //   msg












    return msg;
  }
});

const NOTES_METHODS = _.pluck([
  chat
], 'name');

if (Meteor.isServer) {
  // Only allow 5 bot operations per connection per 10 seconds
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(NOTES_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 10000);
}
