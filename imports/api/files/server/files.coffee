
import { _ }                 from 'meteor/underscore';
import { check }             from 'meteor/check';
import { Meteor }            from 'meteor/meteor';
import { Random }            from 'meteor/random';
import { FilesCollection }   from 'meteor/ostrio:files';

import { createThumbnails } from './image-processing.js'

export Files = new FilesCollection(
  storagePath: 'assets/app/uploads/uploadedFiles'
  collectionName: 'files'
  allowClientCode: true
  protected: (fileObj) ->
    if fileObj
      if !(fileObj.meta and fileObj.meta.secured)
        return true
      else if fileObj.meta and fileObj.meta.secured == true and @userId == fileObj.userId
        return true
    false
  onBeforeRemove: (cursor) ->
    res = cursor.map((file) ->
      if file and file.userId and _.isString(file.userId)
        return file.userId == @userId
      false
    )
    ! ~res.indexOf(false)
  onBeforeUpload: ->
    if @file.size <= 1024 * 1024 * 128
      return true
    'Max. file size is 128MB you\'ve tried to upload ' + filesize(@file.size)
  downloadCallback: (fileObj) ->
    if @params and @params.query and @params.query.download == 'true'
      Files.collection.update fileObj._id, { $inc: 'meta.downloads': 1 }, false
    true
  interceptDownload: (http, fileRef, version) ->
    path = undefined
    if useDropBox
      path = if fileRef and fileRef.versions and fileRef.versions[version] and fileRef.versions[version].meta and fileRef.versions[version].meta.pipeFrom then fileRef.versions[version].meta.pipeFrom else undefined
      if path
        # If file is successfully moved to Storage
        # We will pipe request to Storage
        # So, original link will stay always secure
        # To force ?play and ?download parameters
        # and to keep original file name, content-type,
        # content-disposition and cache-control
        # we're using low-level .serve() method
        @serve http, fileRef, fileRef.versions[version], version, request(
          url: path
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection'))
        return true
      # While file is not yet uploaded to Storage
      # We will serve file from FS
      return false
    else if useS3
      path = if fileRef and fileRef.versions and fileRef.versions[version] and fileRef.versions[version].meta and fileRef.versions[version].meta.pipePath then fileRef.versions[version].meta.pipePath else undefined
      if path
        # If file is successfully moved to Storage
        # We will pipe request to Storage
        # So, original link will stay always secure
        # To force ?play and ?download parameters
        # and to keep original file name, content-type,
        # content-disposition and cache-control
        # we're using low-level .serve() method
        @serve http, fileRef, fileRef.versions[version], version, client.getObject(
          Bucket: s3Conf.bucket
          Key: path).createReadStream()
        return true
      # While file is not yet uploaded to Storage
      # We will serve file from FS
      return false
    false
)

# DropBox usage:
# Read: https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration
# env.var example: DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'
useDropBox = false
# AWS:S3 usage:
# Read: https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration
# env.var example: S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx""}}'
useS3 = false
request = undefined
bound = undefined
fs = undefined
client = undefined
sendToStorage = undefined
s3Conf = undefined
dbConf = undefined
fs = require('fs-extra')
if process.env.DROPBOX
  Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox
else if process.env.S3
  Meteor.settings.s3 = JSON.parse(process.env.S3).s3
s3Conf = Meteor.settings.s3 or {}
dbConf = Meteor.settings.dropbox or {}
if dbConf and dbConf.key and dbConf.secret and dbConf.token
  useDropBox = true
  Dropbox = require('dropbox')
  client = new (Dropbox.Client)(
    key: dbConf.key
    secret: dbConf.secret
    token: dbConf.token)
else if s3Conf and s3Conf.key and s3Conf.secret and s3Conf.bucket and s3Conf.region
  useS3 = true
  S3 = require('aws-sdk/clients/s3')
  client = new S3(
    secretAccessKey: s3Conf.secret
    accessKeyId: s3Conf.key
    region: s3Conf.region
    sslEnabled: true)
if useS3 or useDropBox
  request = require('request')
  bound = Meteor.bindEnvironment((callback) ->
    callback()
  )

Files.denyClient()
Files.on 'afterUpload', (fileRef) ->
  that = this
  
  Meteor.users.update fileRef.userId,
    $inc:
      uploadedFilesSize: fileRef.size 

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
            that.collection.update { _id: fileRef._id }, upd, (updError) ->
              if updError
                console.error updError
              else
                # Unlink original files from FS
                # after successful upload to DropBox
                that.unlink that.collection.findOne(fileRef._id), version
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
              that.collection.update { _id: fileRef._id }, upd, (error) ->
                if error
                  console.error error
                else
                  # Unlink original file from FS
                  # after successful upload to AWS:S3
                  that.unlink that.collection.findOne(fileRef._id), version
                return
            return
          return
        return
      return
      
  if /png|jpe?g/i.test(fileRef.extension or '')
    createThumbnails this, fileRef, (error, fileRef) ->
      if error
        console.error error
      if useDropBox or useS3
        sendToStorage that.collection.findOne(fileRef._id)
      return
  else
    if useDropBox or useS3
      sendToStorage fileRef
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
