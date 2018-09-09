/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const bodyParser = Npm.require( 'body-parser' );

Picker.middleware( bodyParser.json() );
Picker.middleware( bodyParser.urlencoded( { extended: false } ) );

Picker.route('/bot/chat', function( params, request, response, next ) {
  if (request.body.chat && request.body.apiKey) {
    return Meteor.call('bot.chat', {
      chat: request.body.chat,
      apiKey: request.body.apiKey
    }
    , function(err, res) {
      if (err) {
        response.statusCode = 301;
      } else {
        response.statusCode = 200;
      }
      return response.end( res );
    });
  } else {
    response.statusCode = 500;
    return response.end();
  }
});