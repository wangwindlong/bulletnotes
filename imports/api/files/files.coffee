import { FilesCollection }   from 'meteor/ostrio:files';

export Files = new FilesCollection(
  collectionName: 'files'
  allowClientCode: true
  onBeforeUpload: ->
    # Allow upload files under 100MB for now
    if @file.size > 1024 * 1024 * 100
      'Please upload file with size equal or less than 100MB'
    else if @file.size + Meteor.user().uploadedFilesSize > Meteor.settings.public.maxFreeUploadBits
      'This upload would put you over your quota'
    else
      true
)