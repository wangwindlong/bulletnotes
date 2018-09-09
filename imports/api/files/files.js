/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { FilesCollection }   from 'meteor/ostrio:files';

export var Files = new FilesCollection({
  collectionName: 'files',
  allowClientCode: true,
  onBeforeUpload() {
    // Allow upload files under 100MB for now
    let userBitsAllowed;
    if (Meteor.user().isPro) {
      userBitsAllowed = Meteor.settings.public.maxProUploadBits;
    } else {
      userBitsAllowed = Meteor.settings.public.maxFreeUploadBits;
    }
    if (this.file.size > (1024 * 1024 * 100)) {
      return 'Please upload file with size equal or less than 100MB';
    } else if ((this.file.size + Meteor.user().uploadedFilesSize) > userBitsAllowed) {
      return 'This upload would put you over your quota';
    } else {
      return true;
    }
  }
});
