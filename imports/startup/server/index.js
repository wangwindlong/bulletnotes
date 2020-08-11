/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This file configures the Accounts package to define the UI of the reset password email.
require('./reset-password-email.js');

// Start Telegram Bot
require('./telegramBot.js');

// Set up some rate limiting and other important security settings.
require('./security.js');
require('./register-api.js');
require('./migrations.js');

Meteor.startup(function() {
  Migrations.migrateTo('latest');

  // 4:20 AM MST
  let cronTime = 'at 11:20 am';
  if (Meteor.settings.public.cronTime) {
    ({ cronTime } = Meteor.settings.public);
  }

  SyncedCron.add({
    name: 'Nightly dropbox export',
    schedule(parser) {
      return parser.text(cronTime);
    },
    job() {
      return Meteor.call('notes.dropboxNightly');
    }
  });

  SyncedCron.add({
    name: 'Nightly subscription cleanup',
    schedule(parser) {
      return parser.text('at 10:00 am');
    },
    job() {
      return Meteor.call('users.checkSubscriptions');
    }
  });

  Meteor.call('users.checkSubscriptions');
  return SyncedCron.start();
});

  // BrowserPolicy.framing.disallow()
  // #BrowserPolicy.content.disallowInlineScripts()
  // #BrowserPolicy.content.disallowEval()
  // BrowserPolicy.content.allowImageOrigin("blob:")
  // BrowserPolicy.content.allowInlineStyles()
  // BrowserPolicy.content.allowFontDataUrl()
  // BrowserPolicy.content.allowDataUrlForAll()
  // BrowserPolicy.content.allowImageOrigin('*')
  // trusted = [
  //   '*.cloudfront.net'
  //   'api.keen.io'
  //   '*.hotjar.com'
  //   '*.stripe.com'
  //   'cdn.headwayapp.co'
  //   'fonts.googleapis.com'
  //   'unpkg.com'
  // ]
  // _.each trusted, (origin) ->
  //   origin = 'https://' + origin
  //   BrowserPolicy.content.allowOriginForAll origin

  // BrowserPolicy.content.allowSameOriginForAll()
  // constructedCsp = BrowserPolicy.content._constructCsp()
  // BrowserPolicy.content.setPolicy(constructedCsp+"")