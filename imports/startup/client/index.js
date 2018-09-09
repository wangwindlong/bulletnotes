/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import './routes.js';

Meteor.startup(() =>
    $(document).on('keyup', function(event) {
        if (!Session.get('focused')) {
            switch (event.keyCode) {
                // Down
                case 40:
                    return Template.noteTitle.focus($('.note-item').first()[0]);
                // Up
                case 38:
                    return Template.noteTitle.focus($('.note-item').last()[0]);
            }
        }
}));
