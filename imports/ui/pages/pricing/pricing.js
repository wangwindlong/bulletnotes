/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import './pricing.jade';

Template.App_pricing.onRendered(function() {
  NProgress.done();
  return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
});

Template.App_pricing.helpers({
  noteLimit() {
    return Meteor.settings.public.noteLimit;
  },
    
  proPrice() {
    return Meteor.settings.public.proPrice;
  }
});