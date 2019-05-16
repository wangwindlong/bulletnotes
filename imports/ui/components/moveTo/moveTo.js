/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { Notes } = require('/imports/api/notes/notes.js');

require('./moveTo.jade');

Template.moveTo.helpers({ 
    settings() {
        return {
            position: 'bottom',
            limit: 10,
            rules: [
                {
                    collection: Notes,
                    field: 'title',
                    template: Template.notePill,
                    matchAll: true,
                    sort: 'title'
                }
            ]
        };
    }});

Template.moveTo.events({
    'autocompleteselect input'(event, instance, selected) {
        Meteor.call('notes.makeChild', {
            noteId: instance.data._id,
            parent: selected._id,
            shareKey: FlowRouter.getParam('shareKey'),
            expandParent: false
        });
        return Template.App_body.showSnackbar({
            message: `Note moved to ${selected.title} successfully.`,
            actionHandler() {
                FlowRouter.go(`/note/${selected._id}`);
                return $(".mdl-layout__content").animate({ scrollTop: 0 }, 200);
            },
            actionText: 'View',
            timeout: 5000
        });
    }
});

Template.notePill.maxTitleLength = 30;

Template.notePill.helpers({
    shortTitle() {
        let { title } = this;
        if (title.length > Template.notePill.maxTitleLength) {
            title = title.substr(0,Template.notePill.maxTitleLength) + '...';
        }
        return title;
    },

    parentTitle() {
        let parentTitle = '';
        if (this.parent) {
            parentTitle = Notes.findOne(this.parent).title;
            if (parentTitle.length > Template.notePill.maxTitleLength) {
                parentTitle = parentTitle.substr(0,Template.notePill.maxTitleLength) + '...';
            }
        } else {
            parentTitle = 'Home';
        }
        return parentTitle;
    }
});