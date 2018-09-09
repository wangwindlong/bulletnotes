/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./terms.jade');

Template.App_terms.onRendered(function() {
  NProgress.done();
  return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
});
