import { Template } from 'meteor/templating'

import { Notes, NoteLogs } from '/imports/api/notes/notes.coffee'

require './noteDetailCard.jade'

Template.noteDetailCard.helpers
	transactions: ->
		instance = Template.instance()
		NoteLogs.find {
			"context.noteId": instance.data._id
		}
