/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { Files } = require('/imports/api/files/files.js');
const bodyParser = Npm.require( 'body-parser' );

Picker.middleware( bodyParser.json() );
Picker.middleware( bodyParser.urlencoded( { extended: false } ) );

Picker.route('/file/download/:fileId', function( params, request, response, next ) {
  if (params['fileId']) {
    const file = Files.findOne(params['fileId']);
    response.setHeader( 'Content-Type', 'application/octet-stream' );
    response.statusCode = 200;
    return response.end( file.data );
  } else {
    return response.statusCode = 500;
  }
});
