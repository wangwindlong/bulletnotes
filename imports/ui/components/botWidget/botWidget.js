/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./botWidget.jade');

Template.botWidget.onRendered(() => $('.botChat').linkify());

Template.botWidget.events({
  'click #closeBotWidget'(event, instance) {
    return Session.set('showBotWidget', false);
  },

  'keypress #chatInput'(event, instance) {
    if (event.keyCode === 13) {
      const message = $(event.currentTarget).val();
      Meteor.call('bot.chat',
        {chat: message}
      , function(err, res) {
        const converter = new Showdown.converter();
        let formattedRes = res.replace(/(?:\r\n|\r|\n)/g, '<br />');
        formattedRes = converter.makeHtml(formattedRes);

        $('.botPending').last().html(formattedRes).removeClass('botPending');
        return $("#chatArea").animate({ scrollTop: $("#chatArea")[0].scrollHeight }, 200);
      });

      $('#chatArea').append(`<div class="chat userChat">${message}</div>`);
      $('#chatArea').append('<div class="chat botChat botPending">...</div>');
      $(event.currentTarget).val('');
      return $("#chatArea").animate({ scrollTop: $("#chatArea")[0].scrollHeight }, 200);
    }
  }
});
