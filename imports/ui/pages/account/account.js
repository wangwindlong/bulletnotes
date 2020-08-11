/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');

require('./account.jade');

Template.App_account.updateSubscription = function(subscription) {
  if (subscription) {
    $('#proPlan').show();
    $('#freePlan').hide();
    $('#trialButton').fadeOut();
    if (subscription.canceled_at) {
      $('#AccountStatus').html( `Your subscription will end ${Template.App_account.fromNow(subscription.current_period_end)}` );
      return $('#stopSubscription').fadeOut();
    } else {
      if (subscription.status === "trial") {
        $('#AccountStatus').html( `Your trial will end and you will be billed $${Meteor.settings.public.proPrice} ${Template.App_account.fromNow(subscription.trial_end)}` );
      } else {
        $('#AccountStatus').html( `You will be billed $${Meteor.settings.public.proPrice} ${Template.App_account.fromNow(subscription.current_period_end)}` );
      }
      return $('#stopSubscription').fadeIn();
    }
  } else {
    $('#proPlan').hide();
    $('#freePlan').show();
    $('#trialButton').fadeIn();
    return $('#stopSubscription').fadeOut();
  }
};

Template.App_account.fromNow = function(time) {
  if (time) {
    return `on ${moment(parseInt(time+'000',10)).format('YYYY-MM-DD')}`;
  }
};

Template.App_account.onRendered(function() {
  NProgress.done();
  return Meteor.call('users.getSubscription', (err, res) => Template.App_account.updateSubscription(res));
});

Template.App_account.helpers({
  extraNotesEarned() {
    return (Meteor.user().referralCount || 0) * Meteor.settings.public.referralNoteBonus;
  },
  
  url() {
    return Meteor.absoluteUrl();
  },
  
  referralCount() {
  	return Meteor.user().referralCount || 0;
},

  referralNoteBonus() {
    return Meteor.settings.public.referralNoteBonus;
  },

  proPrice() {
    return Meteor.settings.public.proPrice;
  }
});

Template.App_account.events({
  'click #trialButton'(event, instance) {
    $('#trialButton').fadeOut();
    $('#payment-form').fadeIn();
    const stripe = Stripe(Meteor.settings.public.stripePublicKey);
    const elements = stripe.elements();
    const card = elements.create('card');
    card.mount('#card-element');
    const form = document.getElementById('payment-form');
    return form.addEventListener('submit', function(event) {
      event.preventDefault();
      $(event.target).fadeOut();
      return stripe.createToken(card).then(function(result) {
        if (result.error) {
          // Inform the user if there was an error
          const errorElement = document.getElementById('card-errors');
          return errorElement.textContent = result.error.message;
        } else {
          return Meteor.call('users.startTrial',
            {stripeToken: result.token.id}
          , (err, res) => Template.App_account.updateSubscription(res));
        }
      });
    });
  },

  'click #stopSubscription'(event, instance) {
    $('#stopSubscription').fadeOut();
    return Meteor.call('users.stopSubscription',
      (err, res) => Template.App_account.updateSubscription(res));
  }
});