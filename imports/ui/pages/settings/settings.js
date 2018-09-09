/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const Dropbox = require('dropbox');

require('./settings.jade');

Template.App_settings.onRendered(function() {
  NProgress.done();
  return analytics.page('Settings');
});

Template.App_settings.events({
  'click #deauthLink'(event) {
    event.preventDefault();
    return Meteor.call('users.clearDropboxOauth');
  },

  'click #exportLink'(event) {
    event.preventDefault();
    $('#exportSpinner').fadeIn();
    return Meteor.call('notes.export', {}, function(err, res) {
      $('#exportSpinner').fadeOut();
      return $('#exportResult').val(res).fadeIn();
    });
  },
  
  'click #generateApiKey'(event) {
    event.preventDefault();
    return Meteor.call('users.generateApiKey');
  },

  'click #copyApiKey'(event) {
    event.preventDefault();
    const copyText = document.getElementById("apiKey");
    copyText.select();
    document.execCommand("Copy");

    return Template.App_body.showSnackbar({
      message: "API Copied to Clipboard"});
  },

  'click #dropboxExportLink'(event) {
    return Meteor.call('notes.dropboxExport', {});
  },

  'click #themes .themeSelect'(event, instance) {
    return Meteor.call('users.setTheme', {theme:event.target.dataset.name}, (err, res) =>
      Template.App_body.showSnackbar({
        message: "Theme Saved"})
    );
  },

  'click #languages .languageSelect'(event, instance) {
    return Meteor.call('users.setLanguage', {language:event.target.dataset.name}, function(err, res) {
      Template.App_body.showSnackbar({
        message: "Language Saved"});
      T9n.setLanguage(Meteor.user().language);
      return TAPi18n.setLanguage(Meteor.user().language);
    });
  },

  'click #enableLocation'(event, instance) {
    if (!Meteor.user().storeLocation) {
      return navigator.geolocation.getCurrentPosition(location =>
        Meteor.call('users.setStoreLocation',
          {storeLocation: !Meteor.user().storeLocation})
      );
    }
  }
});

Template.App_settings.helpers({
  storeLocation() {
    return Meteor.user().storeLocation;
  },
  dropbox_token() {
    setTimeout(function() {
      const dbx = new Dropbox({clientId: Meteor.settings.public.dropbox_client_id});
      const authUrl = dbx.getAuthenticationUrl(Meteor.absoluteUrl() + 'dropboxAuth');
      const authLink = document.getElementById('authlink');
      if (authLink) {
        return authLink.href = authUrl;
      }
    }
    , 100);
    if (Meteor.user() && Meteor.user().profile) {
      return Meteor.user().profile.dropbox_token;
    }
  },

  themeChecked(theme) {
    if (Meteor.user() && (theme === Meteor.user().theme)) {
      return 'checked';
    }
  },

  languageChecked(language) {
    if (Meteor.user() && (language === Meteor.user().language)) {
      return 'checked';
    }
  },

  toLower(theme) {
    return theme.toLowerCase();
  },
 
  themes() {
    return [
      {theme:'Mountain'},
      {theme:'City'},
      {theme:'Abstract'},
      {theme:'Snow'},
      {theme:'Field'},
      {theme:'Beach'},
      {theme:'Space'},
      {theme:'Terminal'},
      {theme:'White'},
      {theme:'Light'}
    ];
  },

  languages() {
    return [
      {language:'English', key:'en'},
      {language:'Français', key:'fr'},
      {language:'日本語', key:'ja'}
    ];
  }});