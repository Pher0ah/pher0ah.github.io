

//Google Calendar Information:
//  Calendar ID: 16jp7ihhbljmp26qbo2633fapo@group.calendar.google.com
//  Calendar URL: https://calendar.google.com/calendar/embed?src=16jp7ihhbljmp26qbo2633fapo%40group.calendar.google.com
//  API Key: AIzaSyCs_go1IAAoE6YTWj6a6bs5kCBZuS5eKks

const username = "Hany";
document.addEventListener('DOMContentLoaded', function() {
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {

    //Setup Calendar
    themeSystem: 'standard',
    initialView: 'timeGridWeek',
    headerToolbar: {
      left  : 'prev,next today',
      center: 'title',
      right : 'timeGridWeek,timeGridDay,listWeek'
    },
    height: 'auto',
    lazyFetching: false,
    weekends: true,
    navLinks: true, // can click day/week names to navigate views
    slotMinTime: "08:00:00",
    eventConstraint: {
      stratTime: '09:00',
      endTime: '23:00'
    },
    editable: false,
    selectable: true,
    selectMirror: true,
    select: function(arg) {
      var title = prompt('Session Name:');
      if (title) {
        newEvent = calendar.addEvent({
          title: title,
          start: arg.start,
          end: arg.end,
          allDay: false,
          attendees: []
        })
        newEvent.setProp('backgroundColor','red');
      }
      calendar.unselect()
    },

    //Access Google APIs
    googleCalendarApiKey: 'AIzaSyCs_go1IAAoE6YTWj6a6bs5kCBZuS5eKks',

    //Handle Loading Events
    loading: function(bool) {
      document.getElementById('loading').style.display =
        bool ? 'block' : 'none';
    },

    //Actual Events (to be replaced)
    nowIndicator: true,
    defaultTimedEventDuration: '02:00',
    initialDate: '2022-01-02',


    // Event Calendar & Handling
    eventSources: [
      {
        googleCalendarId: '16jp7ihhbljmp26qbo2633fapo@group.calendar.google.com'
      }
    ],

    eventSourceSuccess: function(loadedEvents, xhr) {
      for(const event of loadedEvents){
        console.log(event);
        event.url = "";
        event.extendedProps = {attendees:[]};

        // if(!event.extendedProps.attendees){
        //   event.setExtendedProp('attendees', []);
        // }
        // console.log(event);
        // const attendees = event.extendedProps.attendees;
        // console.log(attendees.length);
        // if(attendees.includes(username)){
        //   event.setProp('backgroundColor' , (attendees.length < 2) ? 'yellow':'green');
        // }else{
        //   event.setProp('backgroundColor' , (attendees.length < 2) ? 'red':'blue');
        // };
      };
      return loadedEvents.eventArray;
    },

    eventClick: function(info) {
      const attendees = info.event.extendedProps.attendees;
      console.log(info.event.extendedProps);
      if(attendees.includes(username)){
        attendees.splice(attendees.indexOf(username),1);
        info.event.setProp('backgroundColor' , (attendees.length < 2) ? 'red':'blue');
        info.event.setExtendedProp('attendees', attendees);
      }else{
        attendees.push(username);
        info.event.setProp('backgroundColor' , (attendees.length < 2) ? 'yellow':'green');
        info.event.setExtendedProp('attendees', attendees);
      };

      //window.open(info.event.url, 'google-calendar-event', 'width=700,height=600');
    },

    eventMouseEnter: function(mouseEnterInfo){
      mouseEnterInfo.el.style.borderColor = 'red';
    },

    eventMouseLeave: function(mouseLeaveInfo){
      mouseLeaveInfo.el.style.borderColor = 'black';
    },
  });

  calendar.render();
});

