/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./kanbanListItem.jade');

require('/imports/ui/components/noteMenu/noteMenu.js');
require('/imports/ui/components/noteTitle/noteTitle.js');
require('/imports/ui/components/noteBody/noteBody.js');

Template.kanbanListItem.helpers({
	className() {
    let className = "";
    if (this.children > 0) {
      return className = className + ' hasChildren';
    }
  },
  
  titleArgs(note) {
    const instance = Template.instance();
    return {
      note,
      showBody: instance.state.get('showBody'),
      setShowBody(showBody) {
        instance.state.set('showBody', showBody);
        return setShowContent.call({
          noteId: instance.data._id,
          showContent: true
        }
        , (err, res) => $(event.target).siblings('.body').fadeIn().focus());
      }
    };
  },

  bodyArgs(note) {
    return {
      note
    };
  },

  fileArgs(file) {
    return {
      file,
      note: Notes.findOne(file.noteId)
    };
  }});