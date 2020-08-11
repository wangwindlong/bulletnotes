/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { FlowRouter } = require('meteor/kadira:flow-router');
const { BlazeLayout } = require('meteor/kadira:blaze-layout');

import { Notes } from '/imports/api/notes/notes.js';

require('/imports/ui/layouts/app-body.js');

require('/imports/ui/layouts/app-botPage.js');

require('/imports/ui/pages/404/app-not-found.js');
require('/imports/ui/pages/account/account.js');
require('/imports/ui/pages/admin/admin.js');
require('/imports/ui/pages/import/import.js');
require('/imports/ui/pages/notes/notes-show-page.js');
require('/imports/ui/pages/root-redirector.js');
require('/imports/ui/pages/pricing/pricing.js');
require('/imports/ui/pages/intro/intro.js');
require('/imports/ui/pages/privacy/privacy.js');
require('/imports/ui/pages/settings/settings.js');
require('/imports/ui/pages/terms/terms.js');
require('/imports/ui/pages/zoom/zoom.js');

// Import to override accounts templates
require('/imports/ui/accounts/accounts-templates.js');

FlowRouter.route('/', {
  name: 'App.home',
  action() {
    NProgress.start();
    Session.set('searchTerm', null);
    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/note/:noteId', {
  name: 'Notes.show',
  action() {
    NProgress.start();

    // Check if the note is a Kanban or Calendar note
    // If so, set the view mode to that
    Meteor.subscribe('notes.view',
      FlowRouter.getParam('noteId'),
      FlowRouter.getParam('shareKey'));
    const note = Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        title: true
      }
    }
    )
    );

    if (note) {
      if (note.title.includes("#kanban")) {
        Session.set('viewMode', "kanban");
      } else if (note.title.includes("#calendar")) {
        Session.set('viewMode', "calendar");
      } else if (note.title.includes("#notes")) {
        Session.set('viewMode', "notes");
      }
    }

    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/note/:noteId/:shareKey', {
  name: 'Notes.showShared',
  action() {
    NProgress.start();

    Meteor.subscribe('notes.view',
      FlowRouter.getParam('noteId'),
      FlowRouter.getParam('shareKey'));
    const note = Notes.findOne(FlowRouter.getParam('noteId', {
      fields: {
        title: true
      }
    }
    )
    );


    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/search/:searchTerm', {
  name: 'Notes.search',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/calendar', {
  name: 'Notes.calendar',
  action() {
    NProgress.start();
    Session.set('viewMode',"calendar");
    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/calendar/:noteId', {
  name: 'Notes.calendar',
  action() {
    NProgress.start();
    Session.set('viewMode',"calendar");
    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/kanban', {
  name: 'Notes.kanban',
  action() {
    NProgress.start();
    Session.set('viewMode',"kanban");
    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/kanban/:noteId', {
  name: 'Notes.kanban',
  action() {
    NProgress.start();
    Session.set('viewMode',"kanban");
    return BlazeLayout.render('App_body', {main: 'Notes_show_page'});
  }
}
);

FlowRouter.route('/import', {
  name: 'Notes.import',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'Notes_import'});
  }
}
);

FlowRouter.route('/account', {
  name: 'App.account',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_account'});
  }
}
);

FlowRouter.route('/settings', {
  name: 'App.settings',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_settings'});
  }
}
);

FlowRouter.route('/zoom', {
  name: 'App.zoom',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_zoom'});
  }
}
);

FlowRouter.route('/admin', {
  name: 'App.admin',
  action() {
    NProgress.start();

    return BlazeLayout.render('App_body', {main: 'App_admin'});
  }
}
);

FlowRouter.route('/telegramAuth/:telegramId', {
  name: 'App.telegramAuth',
  action() {
    Meteor.call('users.setTelegramId', {
      id: FlowRouter.getParam('telegramId')
    }, function(error, result) {
      if (!error) {
        return Template.App_body.showSnackbar({
          message: "Telegram account linked successfully!"});
      } else {
        return Template.App_body.showSnackbar({
          message: "Error occured while linking Telegram account."});
      }
    });
    return FlowRouter.redirect('/');
  }
}
);

FlowRouter.route('/dropboxAuth', {
  name: 'App.dropboxAuth',
  action() {
    const parseQueryString = function(str) {
      const ret = Object.create(null);
      if (typeof str !== 'string') {
        return ret;
      }
      str = str.trim().replace(/^(\?|#|&)/, '');
      if (!str) {
        return ret;
      }
      str.split('&').forEach(function(param) {
        const parts = param.replace(/\+/g, ' ').split('=');
        // Firefox (pre 40) decodes `%3D` to `=`
        // https://github.com/sindresorhus/query-string/pull/37
        let key = parts.shift();
        let val = parts.length > 0 ? parts.join('=') : undefined;
        key = decodeURIComponent(key);
        // missing `=` should be `null`:
        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
        val = val === undefined ? null : decodeURIComponent(val);
        if (ret[key] === undefined) {
          ret[key] = val;
        } else if (Array.isArray(ret[key])) {
          ret[key].push(val);
        } else {
          ret[key] = [
            ret[key],
            val
          ];
        }
      });
      return ret;
    };

    Meteor.call('users.setDropboxOauth', {
      access_token: parseQueryString(window.location.hash)['access_token']
    }, function(error, result) {
      if (!error) {
        return Template.App_body.showSnackbar({
          message: "Dropbox account linked successfully!"});
      } else {
        return Template.App_body.showSnackbar({
          message: "Error occured while linking Dropbox account."});
      }
    });
    return FlowRouter.redirect('/');
  }
}
);

FlowRouter.route('/bot', {
  name: 'App.botPage',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_botPage');
  }
}
);

FlowRouter.route('/pricing', {
  name: 'App.pricing',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_pricing'});
  }
}
);

FlowRouter.route('/terms', {
  name: 'App.terms',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_terms'});
  }
}
);

FlowRouter.route('/privacy', {
  name: 'App.privacy',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_privacy'});
  }
}
);

FlowRouter.route('/intro', {
  name: 'App.intro',
  action() {
    NProgress.start();
    return BlazeLayout.render('App_body', {main: 'App_intro'});
  }
}
);

FlowRouter.notFound = {
  action() {
    return BlazeLayout.render('App_body', { main: 'App_notFound' });
  }
};
