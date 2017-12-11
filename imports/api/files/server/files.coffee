
import { _ }                 from 'meteor/underscore';
import { check }             from 'meteor/check';
import { Meteor }            from 'meteor/meteor';
import { Random }            from 'meteor/random';
import { FilesCollection }   from 'meteor/ostrio:files';

import { createThumbnails } from './image-processing.js'

Files.denyClient()
Files.on 'afterUpload', (fileRef) ->
  console.log "After upload!!",fileRef
  if useDropBox

    makeUrl = (stat, fileRef, version, triesUrl = 0) ->
      client.makeUrl stat.path, {
        long: true
        downloadHack: true
      }, (error, xml) ->
        bound ->
          # Store downloadable link in file's meta object
          if error
            if triesUrl < 10
              Meteor.setTimeout (->
                makeUrl stat, fileRef, version, ++triesUrl
                return
              ), 2048
            else
              console.error error, triesUrl: triesUrl
          else if xml
            upd = $set: {}
            upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url
            upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path
            @collection.update { _id: fileRef._id }, upd, (updError) ->
              if updError
                console.error updError
              else
                # Unlink original files from FS
                # after successful upload to DropBox
                @unlink @collection.findOne(fileRef._id), version
              return
          else
            if triesUrl < 10
              Meteor.setTimeout (->
                # Generate downloadable link
                makeUrl stat, fileRef, version, ++triesUrl
                return
              ), 2048
            else
              console.error 'client.makeUrl doesn\'t returns xml', triesUrl: triesUrl
          return
        return
      return

    writeToDB = (fileRef, version, data, triesSend = 0) ->
      # DropBox already uses random URLs
      # No need to use random file names
      console.log "Writing db", data
      client.writeFile fileRef._id + '-' + version + '.' + fileRef.extension, data, (error, stat) ->
        bound ->
          if error
            if triesSend < 10
              Meteor.setTimeout (->
                # Write file to DropBox
                writeToDB fileRef, version, data, ++triesSend
                return
              ), 2048
            else
              console.error error, triesSend: triesSend
          else
            makeUrl stat, fileRef, version
          return
        return
      return

    readFile = (fileRef, vRef, version, triesRead = 0) ->
      fs.readFile vRef.path, (error, data) ->
        bound ->
          if error
            if triesRead < 10
              readFile fileRef, vRef, version, ++triesRead
            else
              console.error error
          else
            writeToDB fileRef, version, data
          return
        return
      return

    sendToStorage = (fileRef) ->
      _.each fileRef.versions, (vRef, version) ->
        readFile fileRef, vRef, version
        return
      return

  else if useS3

    sendToStorage = (fileRef) ->
      _.each fileRef.versions, (vRef, version) ->
        # We use Random.id() instead of real file's _id
        # to secure files from reverse engineering
        # As after viewing this code it will be easy
        # to get access to unlisted and protected files
        filePath = 'files/' + Random.id() + '-' + version + '.' + fileRef.extension
        client.putObject {
          ServerSideEncryption: 'AES256'
          StorageClass: 'STANDARD_IA'
          Bucket: s3Conf.bucket
          Key: filePath
          Body: fs.createReadStream(vRef.path)
          ContentType: vRef.type
        }, (error) ->
          bound ->
            if error
              console.error error
            else
              upd = $set: {}
              upd['$set']['versions.' + version + '.meta.pipePath'] = filePath
              @collection.update { _id: fileRef._id }, upd, (error) ->
                if error
                  console.error error
                else
                  # Unlink original file from FS
                  # after successful upload to AWS:S3
                  @unlink @collection.findOne(fileRef._id), version
                return
            return
          return
        return
      return
  createThumbnails = 
  if /png|jpe?g/i.test(fileRef.extension or '')
    createThumbnails this, fileRef, (error, fileRef) ->
      if error
        console.error error
      if useDropBox or useS3
        sendToStorage @collection.findOne(fileRef._id)
      return
  else
    if useDropBox or useS3
      sendToStorage fileRef
  return
# This line now commented due to Heroku usage
# Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}
# Intercept FileCollection's remove method
# to remove file from DropBox or AWS S3
if useDropBox or useS3
  _origRemove = Files.remove

  Files.remove = (search) ->
    cursor = @collection.find(search)
    cursor.forEach (fileRef) ->
      _.each fileRef.versions, (vRef) ->
        if vRef and vRef.meta and vRef.meta.pipePath != null
          if useDropBox
            # DropBox usage:
            client.remove vRef.meta.pipePath, (error) ->
              bound ->
                if error
                  console.error error
                return
              return
          else
            # AWS:S3 usage:
            client.deleteObject {
              Bucket: s3Conf.bucket
              Key: vRef.meta.pipePath
            }, (error) ->
              bound ->
                if error
                  console.error error
                return
              return
        return
      return
    # Call original method
    _origRemove.call this, search
    return

Meteor.methods
  filesLenght: (userOnly = false) ->
    check userOnly, Boolean
    selector = undefined
    if userOnly and @userId
      selector = userId: @userId
    else
      selector = $or: [
        {
          'meta.unlisted': false
          'meta.secured': false
          'meta.blamed': $lt: 3
        }
        { userId: @userId }
      ]
    Files.find(selector).count()
  unblame: (_id) ->
    check _id, String
    Yiles.update { _id: _id }, { $inc: 'meta.blamed': -1 }, false
    true
  blame: (_id) ->
    check _id, String
    Yiles.update { _id: _id }, { $inc: 'meta.blamed': 1 }, false
    true
  changeAccess: (_id) ->
    check _id, String
    if Meteor.userId()
      file = Files.findOne(
        _id: _id
        userId: Meteor.userId())
      if file
        Files.update _id, { $set: 'meta.unlisted': if file.meta.unlisted then false else true }, false
        return true
    throw new (Meteor.Error)(401, 'Access denied!')
    return
  changePrivacy: (_id) ->
    check _id, String
    if Meteor.userId()
      file = Files.findOne(
        _id: _id
        userId: Meteor.userId())
      if file
        Files.update _id, { $set:
          'meta.unlisted': true
          'meta.secured': if file.meta.secured then false else true }, false
        return true
    throw new (Meteor.Error)(401, 'Access denied!')

