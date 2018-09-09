/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./privacy.jade');

Template.App_privacy.onRendered(function() {
  NProgress.done();
  return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
});
