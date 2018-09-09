/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const bodyParser = Npm.require( 'body-parser' );

Picker.middleware( bodyParser.json() );
Picker.middleware( bodyParser.urlencoded( { extended: false } ) );

Picker.route('/note/inbox', function( params, request, response, next ) {
  if (request.body.title && request.body.apiKey) {
    const user = Meteor.users.findOne({apiKey:request.body.apiKey});
    if (!user) {
      return response.statusCode = 500;
    } else {
      const noteId = Meteor.call('notes.inbox', {
        userId: user._id,
        title: request.body.title,
        body: request.body.body,
        parentId: request.body.parentId
      }
      );
      response.setHeader( 'Content-Type', 'application/json' );
      response.statusCode = 200;
      return response.end( noteId );
    }
  } else {
    return response.statusCode = 500;
  }
});
