/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import './intro.jade';

Template.App_intro.onRendered(function() {
  NProgress.done();
  $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
  return Session.set('introLoaded', true);
});