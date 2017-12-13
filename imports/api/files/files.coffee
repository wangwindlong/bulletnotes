import { FilesCollection }   from 'meteor/ostrio:files';

export Files = new FilesCollection(
  collectionName: 'files'
  allowClientCode: true
  onBeforeUpload: ->
    # Allow upload files under 100MB for now
    if Meteor.user().isPro
      userBitsAllowed = Meteor.settings.public.maxProUploadBits
    else
      userBitsAllowed = Meteor.settings.public.maxFreeUploadBits
    if @file.size > 1024 * 1024 * 100
      'Please upload file with size equal or less than 100MB'
    else if @file.size + Meteor.user().uploadedFilesSize > userBitsAllowed
      'This upload would put you over your quota'
    else
      true
)
