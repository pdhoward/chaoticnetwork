
'use strict';


//////////////////////////////////////////////////////////////////////////
///////////////////////////// Mongodb Functions /////////////////////////
////////////////////////////////////////////////////////////////////////

var extend =          require('extend');
var mongoose =        require('mongoose');

var messageSchema = mongoose.Schema({
    userID: String,
    context: Object

});

var botdb = mongoose.model('Text', messageSchema);

module.exports = {

  get: function(params, callback) {

    console.log("-------------------------------".green);
    console.log("ENTERED Mongodb GET".green);
    console.log({params: params});


   botdb.findOne({userID: params}, function(err, response) {
      if (err) {
        if (err.error !== 'not_found') {
          return callback(err);
        } else {
          console.log("-------------------------------".green);
          console.log("Mongodb GET RESULT Record Not Found".green);
          console.log({response: response});
          return callback(null);
        }};

        console.log("-------------------------------".green);
        console.log("Mongodb GET RESULT Record Found".green);
        console.log({response: response});
        return callback(null, response);

    });
  },

  put: function(params, callback) {

    console.log("-------------------------------".green);
    console.log("Mongodb PUT RECORD ENTERED".green);
    console.log({params: params});
    console.log({userid: params.userID});


        botdb.findOneAndUpdate({userID: params.userID}, params, {new: true, upsert: true}, function(err, doc) {
          if (err) {
              return callback(err);
              console.log("-------------------------------".green);
              console.log("Mongodb RESULT NOT SAVED - ERROR".green);
          }
          else {
              console.log("-------------------------------".green);
              console.log("Mongodb RESULT SAVED".green);
              console.log({doc: doc});
              return callback(err, doc);
          }
        })

  },


    fetch: function(params, callback) {

      console.log("-------------------------------".green);
      console.log("Fetching Ideas using these params".green);
      console.log({longitude: params.longitude});
      console.log({latitude: params.latitude});
      console.log({token: params.idea.tokens});

      botdb.find({'context.longitude': params.longitude, 'context.latitude': params.latitude}, function(err, results) {
        console.log('search results')
        console.log({result: results})
        return callback(err, results);
      });


    }
};
