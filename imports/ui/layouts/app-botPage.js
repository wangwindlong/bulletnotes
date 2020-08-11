/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import './app-botPage.jade';

import '/imports/ui/components/botWidget/botWidget.js';

Template.App_botPage.onRendered(function() {
	NProgress.done();
	Session.set('showBotWidget', false);
	return $('input').focus();
});