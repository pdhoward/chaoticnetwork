
'use strict';


//////////////////////////////////////////////////////////////////////////
/////////////////////////////     Controller    /////////////////////////
////////////////////////////////////////////////////////////////////////

var debug =                 require('debug')('bot:controller');
var extend =                require('extend');
var Promise =               require('bluebird');
var conversation =          require('./api/conversation');
var weather =               require('./api/weather');
var send =                  require('./api/send');
var alchemyLanguage =       require('./api/alchemy-language');
var idea =                  require('./api/idea');
var format =                require('string-template');
var natural = 			        require('natural');
var pick =                  require('object.pick');
var colors =                require('colors');
var validator =             require('validator');

var sendMessageToConversation = Promise.promisify(conversation.message.bind(conversation));
var getUser = Promise.promisify(idea.get.bind(idea));
var saveUser = Promise.promisify(idea.put.bind(idea));
var extractCity = Promise.promisify(alchemyLanguage.extractCity.bind(alchemyLanguage));
var getGeoLocation = Promise.promisify(weather.geoLocation.bind(weather));
var getIdea = Promise.promisify(idea.fetch.bind(idea));
var sendContacts = Promise.promisify(send.mail.bind(send));



module.exports = {


  ////////////////////////////////////////////////////
  /////////////Process Text Messages ////////////////
  //////////////////////////////////////////////////

  processMessage: function(_message, callback) {
    var message = extend({ input: {text: _message.text} }, _message);
    var input = message.text ? { text: message.text } : message.input;
    var user = message.user || message.from;

    console.log("-------------------------------".green);
    console.log("ENTERED PROCESS MESSAGES".green);
    console.log({message: message});


    ////////////////////////////////////////////////////
    //////// Step 1 - Look Up User Mongo Record////////
    //////////////////////////////////////////////////

    getUser(user).then(function(dbUser) {
      var context = dbUser ? dbUser.context : {};
      message.context = context;

      console.log("-------------------------------".green);
      console.log("PROCESS MESSAGE Step 1 - DBUSER".green);
      console.log({message: message});
      console.log({input: input});
      console.log({dbUser: dbUser});


      ////////////////////////////////////////////////////
      ////////////Step 2 - Examine text for city ////////
      //////////////////////////////////////////////////

      return extractCity(input)

      .then(function(city) {

        console.log("-------------------------------".green);
        console.log("PROCESS MESSAGE Step 2 - extract City".green);
        console.log({city: city});

        if (city) {
          if (!context.city) {
            context.city = city
            }
          context.city.alternate_name = city.name;
          }

        })


        ////////////////////////////////////////////////////////////
        ////////  Step 3 - If State is Missing Look it Up  ////////
        ///////////////////////////////////////////////////////////

        .then(function() {

          console.log("-------------------------------".green);
          console.log("FINISHED STEP 2 - DISPLAY STATUSES".green);
          console.log({message: message});
          console.log({context: message.context});

          if (context.city && !context.state) {
            return getGeoLocation(context.city)


            ///////////////////////////////////////////////////////////////
            //////////Extract all the states associated with city ////////
            /////////////////////////////////////////////////////////////

          .then(function(geoLocatedCity) {

              console.log("-------------------------------".green);
              console.log("PROCESS Step 3 - geolocation".green);
              console.log({weatherlocale: geoLocatedCity});

              extend(context.city, geoLocatedCity);
              context.city.number_of_states = Object.keys(context.city.states).length;

              if (context.city.number_of_states === 1) {
                context.state = Object.keys(context.city.states)[0];
                }
              });
            } else {


          ///////////////////////////////////////////////////////
          ////////Note: - City is Unknown -- but no action//////
          /////////////////////////////////////////////////////

          console.log("-------------------------------".green);
          console.log("PROCESS Step 3 - geolocation".green);
          console.log("Skip geolocation because city is unknown");
        }
      })

      ////////////////////////////////////////////////////////////
      ////////  Step 4 - Send message to Watson CUI      ////////
      ///////////////////////////////////////////////////////////

      .then(function() {

        console.log("-------------------------------".green);
        console.log("FINISHED STEP 4 - Sending Context to Watson".green);
        console.log({message: message});
        console.log({context: message.context});

        if (message.context.summary == "Asking for email"){
          return message;
        }

        return sendMessageToConversation(message);

      })


      ////////////////////////////////////////////////////////////
      ////////      Step 5 - Process Watson Response     ////////
      ///////////////////////////////////////////////////////////

      .then(function(messageResponse) {
        var responseContext = messageResponse.context;
  //      var idx = messageResponse.intents.map(function(x) {return x.intent; }).indexOf('get_weather');
        var responseType = messageResponse.context.summary;

        console.log("-------------------------------".green);
        console.log("Process Message Step 5: Conversation Response".green);
        console.log({message: messageResponse});
        console.log({context: messageResponse.context})
        console.log({intents: messageResponse.intents})
        console.log("responseType = " + responseType);


        switch (responseType) {
            case "asking for location":
                console.log("Switch - asking for location".green)
                return messageResponse;
                break;

            case "Asking for email":

                console.log("Switch - asking for email".green);
                var userEmail = messageResponse.input.text;
                var validEmail = validator.isEmail(userEmail);

                console.log("email test = " + validEmail);

                if (!validEmail) {
                  console.log("email not valid");
                  var textOutputz = 'hmmmm -- your email does not appear valid. Please reenter it with a valid top level domain';
                  messageResponse.context.summary = 'Asking for email';
                  messageResponse = extend(messageResponse, {output: {text: textOutputz}});
                  return messageResponse;

                }

                var mailText = JSON.stringify(messageResponse.context.search[0].context.email) + ' is working on ' +
                                JSON.stringify(messageResponse.context.search[0].context.idea.name);

                var mailObject = {
                  from: '"ChaoticBots 👥" <chaoticbotshelp@gmail.com>',
                  to: userEmail,
                  subject: 'Yo Bot Delivers',
                  text: mailText
                }

                return sendContacts(mailObject)
                    .then(function() {
                      console.log("ready to send greeting");
                      var textOutputx = 'Thank you for your email address and for networking with entrepreneurs. Just say yo to keep networking';
                      messageResponse.context.summary = 'greeting';
                      messageResponse.context.email = userEmail;
                      messageResponse = extend(messageResponse, {output: {text: textOutputx}});
                      return messageResponse;

                    })

                break;


            case "trying to retrieve location":
                console.log("Switch - trying to retrieve location".green)
                return messageResponse;
                break;

            case "trying to retrieve date information":
                console.log("Switch - trying to retrieve date information".green)
                return messageResponse;
                break;

            case "greeting":
                console.log("Switch - greeting".green)
                return messageResponse;
                break;

            case "off topic handling":
                console.log("Switch - off topic handling".green)
                return messageResponse;
                break;

            case "trying to disambiguate the location":
                console.log("Switch - trying to disambiguate the location".green)
                return messageResponse;
                break;

            case "Asking for idea":
                console.log("Switch - Asking for idea".green)
                return messageResponse;
                break;

            case "Searching for Idea":
                console.log("Switch - Searching for Idea".green)


                      ////////////////////////////////////////////////////////////
                      /////// Tokenize and stem the idea submitted by user //////
                      ///////////////////////////////////////////////////////////


 	                      // establish string for NLP pattern matching
 	                      natural.PorterStemmer.attach();
 	                      var tokenIdea = messageResponse.context.idea.name.tokenizeAndStem();
 	                      messageResponse.context.idea.tokens = tokenIdea;
                        // establish gps location
                        var currentState = messageResponse.context.state;
                        var latitude = messageResponse.context.city.states[currentState].latitude;
                        var longitude = messageResponse.context.city.states[currentState].longitude;
                        messageResponse.context.latitude = latitude;
                        messageResponse.context.longitude = longitude;

                      ////////////////////////////////////////////////////////////
                      ////////  Step 7 Retrieve Ideas which match users  ////////
                      ///////////////////////////////////////////////////////////

                        console.log("-------------------------------".green);
                        console.log("Process Message Step 7: Retrieving Ideas that Match".green);
                        console.log({city: messageResponse.context.city.name});
                        console.log({state: messageResponse.context.state})
                        console.log({longitude: messageResponse.context.longitude})
                        console.log({latitude: messageResponse.context.latitude});
                        console.log({idea: messageResponse.context.idea.name});
                        console.log({token: messageResponse.context.idea.tokens})

                        return getIdea(messageResponse.context)

                            .then(function(result) {

                              console.log("-------------------------------".green);
                              console.log("Result of Search".green);
                              console.log({result: result});

                              var matchArray = [];
                              var cntr = 0;
                              var totalIdeasCount = result.length;
                              var userTokenCount = messageResponse.context.idea.tokens.length;
                              var fetchedIdea = '';
                              var userIdea = '';
                              var threshold = 0.80
                              var matchCounter = 0;
                              messageResponse.context.search = result;

                              for (var i = 0; i < totalIdeasCount; i++){

                                // retrieve a matched idea from mongodb query array

                                var fetchedTokenCount = result[i].context.idea.tokens.length;

                                for (var x=0; x < fetchedTokenCount; x++) {
                                    fetchedIdea = result[i].context.idea.tokens[x];
                                    for (var j = 0; j < userTokenCount; j++) {
                                        userIdea = messageResponse.context.idea.tokens[j];
                                        if (natural.JaroWinklerDistance(fetchedIdea, userIdea) > threshold) {
                                          matchCounter++;
                                          console.log("------------Got a Token Match----------")
                                          console.log("fetch token = " + fetchedIdea);
                                          console.log("user token = " + userIdea);
                                          console.log("score = " + natural.JaroWinklerDistance(fetchedIdea, userIdea));
                                        }
                                      }
                                    }

                                var matchLevel = matchCounter / userTokenCount;
                                if (matchLevel > .6) {
                                  console.log("------------Got a String Match----------")

                                  var matchObject = {};
                                  matchObject.email = result[i].context.email;
                                  matchObject.idea = result[i].context.idea.name;

                                  console.log({matchobject: matchObject});

                                  matchArray.push(matchObject);

                                  console.log({matcharray: matchArray[cntr]});
                                  cntr++;
                                  matchCounter = 0;
                                }
                                else {
                                  console.log("no match");
                                  console.log("fetched idea = " + result[i].context.idea.tokens);
                                  console.log({useridea: messageResponse.context.idea});
                                  matchCounter = 0;
                                }
                              }

                              matchCounter = matchArray.length;
                              console.log(" Total matches = " + matchCounter + " which should match this number " + cntr);

                              for (var t= 0; t < matchCounter; t++) {
                                console.log(matchArray[t]);
                              }

                              if (matchCounter > 0) {
                              var textOutput1 = 'I found ';
                              var textOutput2 = ' ideas from entrepreneurs in your locale that matches yours. '
                              var textOutput3 = ' Enter your email address and I will send you 1 contacts and idea from these market leaders'
                              var textOutput4 = ' I promise - no spam! All contacts are deleted within 48 hours'
                              var textOutputn = textOutput1 + matchCounter + textOutput2 + textOutput3 + textOutput4;
                              messageResponse.context.summary = 'Asking for email';
                              messageResponse = extend(messageResponse, {output: {text: textOutputn}});

                              return messageResponse;
                            }
                            else {
                              var textOutput1 = 'I did not find any ';
                              var textOutput2 = 'entrepreneurs in your locale working on ideas similar to yours. However, '
                              var textOutput3 = 'enter your email address and I will send you contacts in the future when others submit ideas like yours'
                              var textOutputn = textOutput1 + textOutput2 + textOutput3;
                              messageResponse.context.summary = 'Asking for email';
                              messageResponse = extend(messageResponse, {output: {text: textOutputn}});
                              return messageResponse;
                            }

                          })
                    break;

            default:
                console.log("Switch - default".green)
                console.log({summary: messageResponse.context.summary})
                console.log("responseType = " + responseType);
                return messageResponse;

                break;
        }

      })


      ////////////////////////////////////////////////////////////
      ////  Step 9 Save Context to MongoDB (like sessions)  //////
      ///////////////////////////////////////////////////////////


      .then(function(messageToUser) {

        console.log("-------------------------------".green);
        console.log("Process Message Step 9: Saving to Mongodb".green);
        console.log({messageToUser: messageToUser});

        if (!dbUser) {
          dbUser = {userID: user};
        }
        dbUser.context = messageToUser.context;
        console.log({dbUser: dbUser});

        return saveUser(dbUser)

        .then(function(data) {

          console.log("-------------------------------".green);
          console.log("MONGODB RECORD UPDATED - SENDING RESPONSE TO USER".green);
          console.log({dbupdate: data});

          messageToUser = extend(messageToUser, _message);

          console.log("-------------------------------".green);
          console.log("UPDATED OBJECT SENT TO USER".green);
          console.log({messageToUser: messageToUser});

          callback(null, messageToUser);
        });
      })
    })

    ////////////////////////////////////////////////////////////
    ////////            Finally - Catch Errors         ////////
    ///////////////////////////////////////////////////////////

    .catch(function (error) {

      console.log("-------------------------------".green);
      console.log("PROCESS MESSAGE CATCH ERROR".green);
      console.log({error: error});
      callback(error);
    });
  }
}