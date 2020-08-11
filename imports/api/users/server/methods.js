/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Random } from 'meteor/random';

export var referral = new ValidatedMethod({
  name: 'users.referral',
  validate: null,
  run({ referral }) {
    Meteor.users.update({_id:referral}, {$inc:{referralCount:1}});
    return Meteor.users.update({_id:this.userId}, {$set:{referredBy:this.userId}});
  }});

export var generateApiKey = new ValidatedMethod({
  name: 'users.generateApiKey',
  validate: null,
  run() {
    return Meteor.users.update({_id:this.userId}, {$set:{apiKey:Random.hexString( 32 )}});
  }});

export var startTrial = new ValidatedMethod({
  name: 'users.startTrial',
  validate: new SimpleSchema({
    stripeToken: {
      type: String,
      optional: true
    }}).validator({
    clean: true,
    filter: false
  }),
  run({ stripeToken }) {
    const Stripe = require('stripe')(Meteor.settings.stripeSecretKey);
    const { userId } = this;
    const user = Meteor.user();
    const email = user && user.emails && user.emails[0].address;
    const stripeCustomersCreateSync = Meteor.wrapAsync(Stripe.customers.create, Stripe.customers);
    const customer = stripeCustomersCreateSync({ source: stripeToken, email, metadata: {userId:user._id} });

    const customerId = customer.id;

    const stripeSubscriptionsCreateSync = Meteor.wrapAsync(Stripe.subscriptions.create, Stripe.subscriptions);
    const subscription = stripeSubscriptionsCreateSync({ 
      customer: customerId,
      trial_period_days: 31,
      // End one minute from now, for testing
      // trial_end: moment().unix()+60
      items: [
        {
          plan: "pro",
        },
      ],
    });

    Meteor.users.update({_id:userId}, {$set:{stripeId:customer.id,stripeSubscriptionId:subscription.id,isPro:true}});

    return subscription;
  }
});

export var getSubscription = new ValidatedMethod({
  name: 'users.getSubscription',
  validate: null,
  run(...args) {
    const obj = args[0];
    if (!Meteor.user() || !Meteor.user().stripeSubscriptionId) {
      return false;
    }

    const Stripe = require('stripe')(Meteor.settings.stripeSecretKey);
    const subscription = Stripe.subscriptions.retrieve(Meteor.user().stripeSubscriptionId);

    return subscription;
  }
});

export var stopSubscription = new ValidatedMethod({
  name: 'users.stopSubscription',
  validate: null,
  run() {
    if (!Meteor.user() || !Meteor.user().stripeSubscriptionId) {
      return false;
    }

    const Stripe = require('stripe')(Meteor.settings.stripeSecretKey);
    const stripeSubscriptionsDelSync = Meteor.wrapAsync(Stripe.subscriptions.del, Stripe.subscriptions);
    const subscription = stripeSubscriptionsDelSync(Meteor.user().stripeSubscriptionId, {at_period_end: true});
    return subscription;
  }
});

export var checkSubscriptions = new ValidatedMethod({
  name: 'users.checkSubscriptions',
  validate: null,
  run() {
    const Stripe = require('stripe')(Meteor.settings.stripeSecretKey);
    const users = Meteor.users.find({stripeSubscriptionId: {$exists: true}});
    return users.forEach(function(user) {
      const stripeSubscriptionsRetrieveSync = Meteor.wrapAsync(Stripe.subscriptions.retrieve, Stripe.subscriptions);
      const subscription = stripeSubscriptionsRetrieveSync(user.stripeSubscriptionId);
      if (subscription.ended_at) {
        // Subscription is exired, cancel it
        return Meteor.users.update({_id:user._id}, {$unset:{stripeSubscriptionId:1,isPro:1}});
      }});
  }});


// Get note of all method names on Notes
const USERS_METHODS = _.pluck([
  referral,
  startTrial,
  getSubscription
], 'name');

if (Meteor.isServer) {
  // Only allow 5 notes operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(USERS_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() {
      return true;
    }

  }, 5, 1000);
}
