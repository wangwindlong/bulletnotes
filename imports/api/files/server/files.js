/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import { _ }                 from 'meteor/underscore';
import { check }             from 'meteor/check';
import { Meteor }            from 'meteor/meteor';
import { Random }            from 'meteor/random';
import { FilesCollection }   from 'meteor/ostrio:files';

import { createThumbnails } from './image-processing.js';

export var Files = new FilesCollection({
  storagePath: 'assets/app/uploads/uploadedFiles',
  collectionName: 'files',
  allowClientCode: true,
  protected(fileObj) {
    if (fileObj) {
      if (!(fileObj.meta && fileObj.meta.secured)) {
        return true;
      } else if (fileObj.meta && (fileObj.meta.secured === true) && (this.userId === fileObj.userId)) {
        return true;
      }
    }
    return false;
  },
  onBeforeRemove(cursor) {
    const res = cursor.map(function(file) {
      if (file && file.userId && _.isString(file.userId)) {
        return file.userId === this.userId;
      }
      return false;
    });
    return !~res.indexOf(false);
  },
  onBeforeUpload() {
    if (this.file.size <= (1024 * 1024 * 128)) {
      return true;
    }
    return `Max. file size is 128MB you've tried to upload ${filesize(this.file.size)}`;
  },
  downloadCallback(fileObj) {
    if (this.params && this.params.query && (this.params.query.download === 'true')) {
      Files.collection.update(fileObj._id, { $inc: {'meta.downloads': 1} }, false);
    }
    return true;
  },
  interceptDownload(http, fileRef, version) {
    let path = undefined;
    if (useDropBox) {
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom ? fileRef.versions[version].meta.pipeFrom : undefined;
      if (path) {
        // If file is successfully moved to Storage
        // We will pipe request to Storage
        // So, original link will stay always secure
        // To force ?play and ?download parameters
        // and to keep original file name, content-type,
        // content-disposition and cache-control
        // we're using low-level .serve() method
        this.serve(http, fileRef, fileRef.versions[version], version, request({
          url: path,
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')})
        );
        return true;
      }
      // While file is not yet uploaded to Storage
      // We will serve file from FS
      return false;
    } else if (useS3) {
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath ? fileRef.versions[version].meta.pipePath : undefined;
      if (path) {
        // If file is successfully moved to Storage
        // We will pipe request to Storage
        // So, original link will stay always secure
        // To force ?play and ?download parameters
        // and to keep original file name, content-type,
        // content-disposition and cache-control
        // we're using low-level .serve() method
        this.serve(http, fileRef, fileRef.versions[version], version, client.getObject({
          Bucket: s3Conf.bucket,
          Key: path}).createReadStream()
        );
        return true;
      }
      // While file is not yet uploaded to Storage
      // We will serve file from FS
      return false;
    }
    return false;
  }
});

// DropBox usage:
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration
// env.var example: DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'
var useDropBox = false;
// AWS:S3 usage:
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration
// env.var example: S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx""}}'
var useS3 = false;
var request = undefined;
let bound = undefined;
let fs = undefined;
var client = undefined;
let sendToStorage = undefined;
var s3Conf = undefined;
let dbConf = undefined;
fs = require('fs-extra');
if (process.env.DROPBOX) {
  Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox;
} else if (process.env.S3) {
  Meteor.settings.s3 = JSON.parse(process.env.S3).s3;
}
s3Conf = Meteor.settings.s3 || {};
dbConf = Meteor.settings.dropbox || {};
if (dbConf && dbConf.key && dbConf.secret && dbConf.token) {
  useDropBox = true;
  const Dropbox = require('dropbox');
  client = new (Dropbox.Client)({
    key: dbConf.key,
    secret: dbConf.secret,
    token: dbConf.token});
} else if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {
  useS3 = true;
  const S3 = require('aws-sdk/clients/s3');
  client = new S3({
    secretAccessKey: s3Conf.secret,
    accessKeyId: s3Conf.key,
    region: s3Conf.region,
    sslEnabled: true});
}
if (useS3 || useDropBox) {
  request = require('request');
  bound = Meteor.bindEnvironment(callback => callback());
}

Files.denyClient();
Files.on('afterUpload', function(fileRef) {
  console.log("Files on after upload!!!!");
  const that = this;
  
  Meteor.users.update(fileRef.userId, {
    $inc: {
      uploadedFilesSize: fileRef.size
    }
  }
  ); 

  if (useDropBox) {
    var makeUrl = function(stat, fileRef, version, triesUrl) {
      if (triesUrl == null) { triesUrl = 0; }
      return client.makeUrl(stat.path, {
        long: true,
        downloadHack: true
      }, (error, xml) =>
        bound(function() {
          // Store downloadable link in file's meta object
          if (error) {
            if (triesUrl < 10) {
              return Meteor.setTimeout((function() {
                makeUrl(stat, fileRef, version, ++triesUrl);
              }), 2048);
            } else {
              return console.error(error, {triesUrl});
            }
          } else if (xml) {
            const upd = {$set: {}};
            upd['$set'][`versions.${version}.meta.pipeFrom`] = xml.url;
            upd['$set'][`versions.${version}.meta.pipePath`] = stat.path;
            return that.collection.update({ _id: fileRef._id }, upd, function(updError) {
              if (updError) {
                console.error(updError);
              } else {
                // Unlink original files from FS
                // after successful upload to DropBox
                that.unlink(that.collection.findOne(fileRef._id), version);
              }
            });
          } else {
            if (triesUrl < 10) {
              return Meteor.setTimeout((function() {
                // Generate downloadable link
                makeUrl(stat, fileRef, version, ++triesUrl);
              }), 2048);
            } else {
              return console.error('client.makeUrl doesn\'t returns xml', {triesUrl});
            }
          }
        })
      );
    };

    var writeToDB = function(fileRef, version, data, triesSend) {
      // DropBox already uses random URLs
      // No need to use random file names
      if (triesSend == null) { triesSend = 0; }
      return client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, (error, stat) =>
        bound(function() {
          if (error) {
            if (triesSend < 10) {
              return Meteor.setTimeout((() =>
                // Write file to DropBox
                writeToDB(fileRef, version, data, ++triesSend)
              ), 2048);
            } else {
              return console.error(error, {triesSend});
            }
          } else {
            return makeUrl(stat, fileRef, version);
          }
        })
      );
    };

    var readFile = function(fileRef, vRef, version, triesRead) {
      if (triesRead == null) { triesRead = 0; }
      return fs.readFile(vRef.path, (error, data) =>
        bound(function() {
          if (error) {
            if (triesRead < 10) {
              return readFile(fileRef, vRef, version, ++triesRead);
            } else {
              return console.error(error);
            }
          } else {
            return writeToDB(fileRef, version, data);
          }
        })
      );
    };

    sendToStorage = fileRef =>
      _.each(fileRef.versions, (vRef, version) => readFile(fileRef, vRef, version))
    ;

  } else if (useS3) {
    sendToStorage = fileRef =>
      _.each(fileRef.versions, function(vRef, version) {
        // We use Random.id() instead of real file's _id
        // to secure files from reverse engineering
        // As after viewing this code it will be easy
        // to get access to unlisted and protected files
        const filePath = `files/${Random.id()}-${version}.${fileRef.extension}`;
        return client.putObject({
          ServerSideEncryption: 'AES256',
          StorageClass: 'STANDARD_IA',
          Bucket: s3Conf.bucket,
          Key: filePath,
          Body: fs.createReadStream(vRef.path),
          ContentType: vRef.type
        }, error =>
          bound(function() {
            if (error) {
              return console.error(error);
            } else {
              const upd = {$set: {}};
              upd['$set'][`versions.${version}.meta.pipePath`] = filePath;
              return that.collection.update({ _id: fileRef._id }, upd, function(error) {
                if (error) {
                  return console.error(error);
                } else {
                  // Unlink original file from FS
                  // after successful upload to AWS:S3
                  return that.unlink(that.collection.findOne(fileRef._id), version);
                }
              });
            }
          })
        );
      })
    ;
  }

  if (fileRef.type === "image/jpeg") {
    fileRef.extension = "jpg";
    fileRef.name = fileRef.name + ".jpg";
  }

  if (/png|jpe?g/i.test(fileRef.extension || '')) {
    console.log("Make thumbnails");
    return createThumbnails(this, fileRef, function(error, fileRef) {
      if (error) {
        console.error(error);
      }
      if (useDropBox || useS3) {
        return sendToStorage(that.collection.findOne(fileRef._id));
      }
    });
  } else {
    console.log("Do not make thumbs");
    if (useDropBox || useS3) {
      return sendToStorage(fileRef);
    }
  }
});

// This line now commented due to Heroku usage
// Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}
// Intercept FileCollection's remove method
// to remove file from DropBox or AWS S3
if (useDropBox || useS3) {
  const _origRemove = Files.remove;

  Files.remove = function(search) {
    const cursor = this.collection.find(search);
    cursor.forEach(fileRef =>
      _.each(fileRef.versions, function(vRef) {
        if (vRef && vRef.meta && (vRef.meta.pipePath !== null)) {
          if (useDropBox) {
            // DropBox usage:
            return client.remove(vRef.meta.pipePath, error =>
              bound(function() {
                if (error) {
                  return console.error(error);
                }
              })
            );
          } else {
            // AWS:S3 usage:
            return client.deleteObject({
              Bucket: s3Conf.bucket,
              Key: vRef.meta.pipePath
            }, error =>
              bound(function() {
                if (error) {
                  return console.error(error);
                }
              })
            );
          }
        }
      })
    );
    // Call original method
    return _origRemove.call(this, search);
  };
}
