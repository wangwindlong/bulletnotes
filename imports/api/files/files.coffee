import { _ }                 from 'meteor/underscore';
import { check }             from 'meteor/check';
import { Meteor }            from 'meteor/meteor';
import { Random }            from 'meteor/random';
import { FilesCollection }   from 'meteor/ostrio:files';

import SimpleSchema from 'simpl-schema'

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
if Meteor.isServer
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
# fileSchema = _.extend(FilesCollection.schema, noteId: type: String)
export Files = new FilesCollection(
  storagePath: 'assets/app/uploads/uploadedFiles'
  collectionName: 'files'
  allowClientCode: true
  # schema: fileSchema
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
# Files.collection.attachSchema new SimpleSchema(fileSchema)
