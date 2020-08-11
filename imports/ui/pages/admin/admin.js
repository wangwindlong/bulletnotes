/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');

require('./admin.jade');

Template.App_admin.onCreated(function() {
  if (!Meteor.user() || !Meteor.user().isAdmin) {
    return FlowRouter.go('/');
  }
});

Template.App_admin.onRendered(function() {
  NProgress.done();
  Meteor.subscribe('users.count.total');
  return Meteor.subscribe('notes.count.recent');
});