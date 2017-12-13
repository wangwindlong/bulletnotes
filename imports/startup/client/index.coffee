import './routes.coffee'

Meteor.startup ->
    Accounts.onLogin ->
        console.log "Login!"
        setTimeout ->
            FlowRouter.go '/'
        , 250
    $(document).on 'keyup', (event) ->
        if !Session.get 'focused'
            switch event.keyCode
                # Down
                when 40
                    Template.noteTitle.focus $('.note-item').first()[0]
                # Up
                when 38
                    Template.noteTitle.focus $('.note-item').last()[0]
