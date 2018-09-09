/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Template } from 'meteor/templating';

import { Notes, NoteLogs } from '/imports/api/notes/notes.js';

require('./noteDetailCard.jade');

Template.noteDetailCard.helpers({
	transactions() {
		const instance = Template.instance();
		return NoteLogs.find({
			"context.noteId": instance.data._id
		});
	}});
