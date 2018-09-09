/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Template } = require('meteor/templating');
const { Notes } = require('/imports/api/notes/notes.js');
const { Files } = require('/imports/api/files/files.js');
require('./calendar.jade');

Template.calendar.onCreated(function() {
  this.state = new ReactiveDict();

  return this.state.setDefault({
    eventSidebar: true});
});

Template.calendar.onRendered(function() {
  NProgress.done();

  Tracker.autorun(() => Template.calendar.renderEvents());

  this.calendar = $('#calendar').fullCalendar({
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month,basicWeek,basicDay'
    },
    editable: true,
    droppable: true,
    timezone: "UTC",
    eventDrop(event) {
      return Meteor.call('notes.setDueDate', {
        noteId: event.id,
        date: event.start.format('YYYY-MM-DD')
      }
      );
    },

    drop(date, allDay, event) {
      Meteor.call('notes.setDueDate', {
        noteId: event.helper[0].dataset.id,
        date: date.format('YYYY-MM-DD')
      }
      );
      const copiedEventObject = {
        title: event.helper[0].innerText
      };
      copiedEventObject.start = date;
      copiedEventObject.allDay = allDay;
      // the last `true` argument determines if the event "sticks"
      // (http://arshaw.com/fullcalendar/docs/event_rendering/renderEvent/)
      return $('#calendar').fullCalendar('renderEvent', copiedEventObject, true);
    },

    viewRender(view, element) {
      return Template.calendar.renderEvents();
    }
  });

  const that = this;
  $('#external-events .external-event').each(function() {
    // create an Event Object
    // (http://arshaw.com/fullcalendar/docs/event_data/Event_Object/)
    // it doesn't need to have a start or end
    const eventObject = {title: $.trim($(this).text())};
    // store the Event Object in the DOM element so we can get to it later
    $(this).data('eventObject', eventObject);
    // make the event draggable using jQuery UI
    return $(this).draggable({
      zIndex: 999,
      revert: true,
      revertDuration: 0
    });
  });

  return setTimeout(() => $('.fc-today-button').click()
  , 500);
});

Template.calendar.renderEvents = function() {
  const today = $('#calendar').fullCalendar('getDate');
  console.log(today);
  if (typeof today.toDate === 'function') { 
    let notes;
    let date = today.toDate();
    const firstDay = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1);
    const lastDay = new Date(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);

    if (FlowRouter.getParam('noteId')) {
      notes = Notes.find({ parent: FlowRouter.getParam('noteId'), date: {$exists: true} });
    } else {
      console.log(firstDay, lastDay);
      // notes = Notes.find { calDate: {$exists: true} }
      notes = Notes.find({ date: { $gte: firstDay, $lt: lastDay } });
      console.log(notes);
    }

    $('#calendar').fullCalendar('removeEvents');
    $('.imageWrap').remove();
    
    return notes.forEach(function(row) {
      Meteor.subscribe('files.note', row._id, {
        onReady() {
          console.log("Got the files!");
          const file = Files.findOne({ noteId: row._id });

          if (file) {
            console.log("Got file");
            date = moment.utc(row.date).format('YYYY-MM-DD');
            return $(`.fc-day[data-date="${date}"]`).append(`<div class="imageWrap"><img src="${file.link('preview')}" /></div>`);
          }
        }

      });
      
      const event = {
        id: row._id,
        title: row.title.substr(0,50),
        start: row.date,
        url: `/note/${row._id}`,
        allDay: true,
        borderColor: ""
      };
      return $('#calendar').fullCalendar('renderEvent', event, true);
    });
  }
};

Template.calendar.helpers({
  calendarTitle() {
    const note = Notes.findOne({ _id:FlowRouter.getParam('noteId') });
    if (note) {
      return note.title;
    }
  },

  calendarId() {
    return FlowRouter.getParam('noteId');
  },

  unscheduledNotes() {
    return Notes.find({
      parent: FlowRouter.getParam('noteId'),
      date: {$exists:false}
    }, {sort: {rank: 1}});
  },

  trimTitle(title) {
    if (title && (title.length > 50)) {
      return title.substr(0,50)+"...";
    } else {
      return title;
    }
  },

  photoModeClass() {
    if (Template.instance().state.get('photoMode')) {
      return 'mdl-button--colored';
    }
  },

  calendarClass() {
    if (Template.instance().state.get('photoMode')) {
      return 'photoMode';
    }
  },

  calendarCellClass() {
    if (Template.instance().state.get('eventSidebar')) {
      return 'mdl-cell--12-col';
    } else {
      return 'mdl-cell--8-col';
    }
  },

  externalEventsCellClass() {
    if (Template.instance().state.get('eventSidebar')) {
      return 'mdl-cell--12-col';
    } else {
      return 'mdl-cell--4-col';
    }
  },

  sidebarClass() {
    if (Template.instance().state.get('eventSidebar')) {
      return 'mdl-button--colored';
    }
  },

  sidebarIcon() {
    if (Template.instance().state.get('eventSidebar')) {
      return 'keyboard_arrow_left';
    } else {
      return 'keyboard_arrow_right';
    }
  }
});

Template.calendar.events({
  'click #togglePhotoMode'(event, instance) {
    event.preventDefault();
    return instance.state.set('photoMode',!instance.state.get('photoMode'));
  },

  'click #toggleSidebar'(event, instance) {
    event.preventDefault();
    instance.state.set('eventSidebar',!instance.state.get('eventSidebar'));
    return setTimeout(() => $('#calendar').fullCalendar('option', 'aspectRatio', 1.35)
    , 100);
  }
});
