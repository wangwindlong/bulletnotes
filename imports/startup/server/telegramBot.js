/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Accounts } from 'meteor/accounts-base';

let request = require('request');
const https = require('https');
const fs = require('fs');

if (Meteor.isServer && Meteor.settings.telegramKey) {
  Meteor.startup(function() {
    return;
    TelegramBot.token = Meteor.settings.telegramKey;
    TelegramBot.start();

    TelegramBot.getUser = function(data) {
      const user = Meteor.users.findOne({telegramId:data.chat.id.toString()});
      if (!user) {
        const msg = 'Hello, I am BulletNotesBot! 😄 \n\nI can help you manage your notes for free.\n\n' +
        'To get started just type `/register`.\n\n'+
        'Or to link your existing BulletNotes account, click here: ' + 
        Meteor.settings.public.url + '/telegramAuth/' + data.chat.id;

        TelegramBot.send(msg, data.chat.id, true);

        return false;
      } else {

        return user;
      }
    };

    // Listeners

    TelegramBot.setCatchAllText(true, function(_, message) {
      const user = TelegramBot.getUser(message);

      if (!user) {
        return false;
      }

      return Meteor.call('bot.chat', {
        chat: message.text,
        userId: user._id
      }
      , (err, res) => TelegramBot.send(res, message.chat.id, true));
    });


    TelegramBot.addListener('incoming_contact', ((command, username, data) => console.log("Got contact:",data)), 'contact');

    TelegramBot.addListener('/start', function(command, username, data) {
      const user = TelegramBot.getUser(data);
      if (user) {
        return 'Your account is linked. Simply send me any note like `Walk the dog` to get started. Type `/help` for more commands.\n'+
        'The `/browse` and `/recent` commands are worth exploring.';
      }
    });


    TelegramBot.addListener('/register', function(command, username, data) {
      const user = Meteor.users.findOne({telegramId:data.chat.id.toString()});
      if (!user) {
        Meteor.users.insert({
          telegramId: data.chat.id.toString(),
          telegramSignUp: true,
          createdAt: new Date()
        });

        return 'You are good to go! Just send me any note you want to rememeber or get done, like `Fix flat tire`.\n\n'+
        'The `/help` command is always there for you if you need it.\n\n'+
        'Welcome to BulletNotes.io! 👍 😎\n\n'+
        '(To link your email later so you can login to the website run `/email`.)';
      }
    });

    return TelegramBot.addListener('/email', function(command, username, data) {
      const user = TelegramBot.getUser(data);
      if (!user) {
        false;
      }

      const email = command[1];

      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      // ` 'Fix' for dumb Sublimetext syntax highlihting

      if (emailRegex.test(email)) {
        Accounts.addEmail(user._id, email);

        return `Alright, you can now request a password for the website here: ${Meteor.settings.public.url}/forgot-password`;
      } else {
        return 'Please provide a valid email.';
      }
    });
  });
}
