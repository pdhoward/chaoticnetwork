
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
var badwords =              require('badwords/array')

var sendMessageToConversation = Promise.promisify(conversation.message.bind(conversation));
var getUser = Promise.promisify(idea.get.bind(idea));
var saveUser = Promise.promisify(idea.put.bind(idea));
var extractCity = Promise.promisify(alchemyLanguage.extractCity.bind(alchemyLanguage));
var getGeoLocation = Promise.promisify(weather.geoLocation.bind(weather));
var getIdea = Promise.promisify(idea.fetch.bind(idea));
var sendContacts = Promise.promisify(send.mail.bind(send));


var activeComments = ['Perfect. Lets keep rolling. Refine your ideas and I will search again',
                      'Great! Lets keep networking. Remember to use key words which describes your venture',
                      'Awesome! Enter your idea, using keywords and phrases that best describes your venture',
                      'OK. Ready when you are! Remember to use key words which describes your venture',
                    ];


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
    console.log({input: input});

    //////////////////////////////////////////////////////////////////
    //////// Step 0 - Custom Code for Watson DevCo            ///////
    /////// Bot Competition - If Yo Fill in City             ///////
    /////// Plus language filter - promote acceptable use   ///////
    //////////////////////////////////////////////////////////////

    var yoArray = ['yo', 'Yo', 'YO', "yo!", 'Yo!', 'YO!'];
    var chkYo = -1;
    chkYo = yoArray.indexOf(input.text);

    if (chkYo > -1 && !message.context.have_email) {
      input.text = "San Francisco";
      message.text = "San Francisco;"};

        console.log("-------------------------------".green);
        console.log("STEP 0 RESULTS".green);
        console.log({usermessage: message});
        console.log({input: input});

    // use google blacklist to promote acceptable use and language
    // return text to user if profanity is found

    var tokenCheck = new natural.WordTokenizer();
    var returnText = {};
    var returnMessage = "Sorry. I am a business networking bot. Please adhere to my acceptable use policy and avoid profanity. I am still listening! "
    var tokenText = tokenCheck.tokenize(input.text);
    var tokenCnt = tokenText.length;
    var tokenWord = '';
    var chkDigit = -1;   // false word not found

    for (var nn = 0; nn < tokenCnt; nn++) {
      tokenWord = tokenText[nn];
      chkDigit = badwords.indexOf(tokenWord);
      if (chkDigit > -1) {
        returnMessage = extend(message, {output:{text: returnMessage}});
        return callback(null, returnMessage);

      }
    }


    ////////////////////////////////////////////////////
    //////// Step 1 - Look Up User Mongo Record////////
    //////////////////////////////////////////////////

    getUser(user).then(function(dbUser) {
      var context = dbUser ? dbUser.context : {};
      message.context = context;

      console.log("-------------------------------".green);
      console.log("PROCESS MESSAGE Step 1 - DBUSER".green);
      console.log({message: message});


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
        console.log({context: message.context});

        // Note exceptions to workflow at this stage. This code block permits highly customized routes
        // where workflow is diverted. The intent of the user is already understood so the workflow skips Conversation
        // and moves to case processing

        if (message.context.summary == "Asking for email"){
          return message;
        }

        if (message.context.summary == "Active" && message.context.have_email){
          return message;
        }

        if (message.context.summary == "Searching for Idea" && message.context.have_email){
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
        console.log({context: messageResponse.context})
        console.log("responseType = " + responseType);


        switch (responseType) {
            case "asking for location":
                console.log("Switch - asking for location".green)
                return messageResponse;
                break;

            case "Active":
                console.log("Switch - Active".green)

	              // get random comment
                var a = activeComments.length;
                var b = Math.floor(Math.random() * (a));

                console.log("random number = " + b);
                console.log("number of active comments = " + a);

                textOutputz = activeComments[b];
                messageResponse.context.summary = 'Searching for Idea';
                messageResponse = extend(messageResponse, {output: {text: textOutputz}});
                return messageResponse;
                break;

            case "Asking for email":

                console.log("Switch - asking for email".green);
                var userEmail = messageResponse.input.text;
                var validEmail = validator.isEmail(userEmail);
                var mailText1 = '';
                var mailText2 = '';

                console.log("email test = " + validEmail);

                if (!validEmail) {
                  console.log("email not valid");
                  var textOutputz = 'hmmmm -- your email does not appear valid. Please try again';
                  messageResponse.context.summary = 'Asking for email';
                  messageResponse = extend(messageResponse, {output: {text: textOutputz}});
                  return messageResponse;

                }

                if (messageResponse.context.get_idea) {
                      var mailArray = [];
                      var mailCounter = messageResponse.context.match.length;
                      for (var ma= 0; ma < mailCounter; ma++) {

                        mailText1 = JSON.stringify(messageResponse.context.match[ma].email) + ' is working on ' +
                                        JSON.stringify(messageResponse.context.match[ma].idea) + "\r\n";
                        mailArray.push(mailText1);
                        console.log(mailArray[ma]);
                      }
                      mailText2 = mailArray.join('');

                      }
                  else {
                      mailText2 = 'Thank you for networking with The Entrepreneur Alliance. Your idea and contact information will be kept on file for 48 hours'
                  }

                var mailObject = {
                  from: '"The Entrepreneur Alliance 👥" <chaoticbotshelp@gmail.com>',
                  to: userEmail,
                  subject: 'Delivering For You',
                  text: mailText2
                }

                return sendContacts(mailObject)
                    .then(function() {
                      console.log("ready to send greeting");
                      var textOutputx = 'Great! I recorded your idea. Thank you for networking through the Entrepreneur Alliance. Just say Yo to keep networking';
                      messageResponse.context.summary = 'Active';
                      messageResponse.context.have_email = true;

                      delete messageResponse.context.get_idea;
                      delete messageResponse.context.search;

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

                        // tokenize the new idea that was submitted by user (input text)
                        // the value of messageResponse.context.idea.name is set by Watson Conversation in 'asking for idea'
                        // but if user is already Active in networking them watson conversation (have_email = true) is no longer being called

                        if (messageResponse.context.have_email){
                          messageResponse.context.idea.name = message.input.text;
                          }

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

                        return getIdea(messageResponse)

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

                                  console.log({matchObject: matchObject});

                                  matchArray.push(matchObject);

                                  console.log({matchArray: matchArray[cntr]});
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

                              // save all matches from search array to context
                              if (matchCounter > 0) {
                                messageResponse.context.match = matchArray;
                                messageResponse.context.matchCounter = matchCounter
                              }
                              else{
                                messageResponse.context.match = [];
                                messageResponse.context.matchCounter = 0
                              }

                              var textOutput1 = '';
                              var textOutput2 = '';
                              var textOutput3 = '';
                              var textOutput4 = '';
                              var textOutputn = '';
                              var newMailText1 = '';
                              var newMailText2 = '';

                              if (matchCounter == 1) {
                                textOutput2 = ' idea from an entrepreneur in your locale that matches yours. '
                              } else {
                                textOutput2 = ' ideas from entrepreneurs in your locale that matches yours. '
                              }

                              if (matchCounter > 0) {
                              textOutput1 = 'I found ';
                              textOutput3 = ' Enter your email address and I will send you contact info for market leaders with ideas similar to yours'
                              textOutput4 = ' No spam! All your information is deleted after 48 hours to keep the network fresh!'
                              messageResponse.context.get_idea = true;
                              messageResponse.context.summary = 'Asking for email';
                            }
                            else {
                              textOutput1 = 'I found no matches with other ';
                              textOutput2 = 'entrepreneurs in your locale. '
                              textOutput3 = 'However, enter your email address and I will notify you if I find matches in the next few days.'
                              textOutput4 = ' No spam! All your information is deleted after 48 hours to keep the network fresh!'
                              messageResponse.context.get_idea = false;
                              messageResponse.context.summary = 'Asking for email';
                            }

                            //  at this point we test to see if we already have the users email and can send the match


                            if (messageResponse.context.matchCounter > 0 && messageResponse.context.have_email) {
                                  var newMailArray = [];
                                  var newMailCounter = messageResponse.context.match.length;

                                  for (var nma= 0; nma < newMailCounter; nma++) {
                                        newMailText1 = JSON.stringify(messageResponse.context.match[nma].email) + ' is working on ' +
                                                       JSON.stringify(messageResponse.context.match[nma].idea) + "\r\n";
                                        newMailArray.push(newMailText1);
                                      }

                                  newMailText2 = newMailArray.join('');

                                  var newUserEmail = messageResponse.context.email;

                                  textOutput3 = ' I just sent you an email with the info';
                                  textOutput4 = ' If you would like to keep networking, enter Yo';
                                  messageResponse.context.summary = 'Active';

                                  var newMailObject = {
                                    from: '"The Entrepreneur Alliance 👥" <chaoticbotshelp@gmail.com>',
                                    to: newUserEmail,
                                    subject: 'Delivering for You',
                                    text: newMailText2
                                  }

                                  sendContacts(newMailObject)
                                    .then(function() {
                                      console.log("Just emailed user from inside Case Searching for Idea");

                                    })
                                  delete messageResponse.context.search;
                              }


                            if (matchCounter == 0 && messageResponse.context.have_email){
                              textOutput3 = '';
                              textOutput4 = ' If you would like to keep searching, enter Yo. ';
                              messageResponse.context.summary = 'Active';
                            }

                            if (matchCounter > 0) {
                              textOutputn = textOutput1 + matchCounter + textOutput2 + textOutput3 + textOutput4;
                            } else {
                              textOutputn = textOutput1 + textOutput2 + textOutput3 + textOutput4;
                            }

                            messageResponse = extend(messageResponse, {output: {text: textOutputn}});
                            return messageResponse;

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
        console.log({dbUserCity: dbUser.context.city});

        return saveUser(dbUser)

        .then(function(data) {

          console.log("-------------------------------".green);
          console.log("MONGODB RECORD UPDATED - SENDING RESPONSE TO USER".green);
          console.log({dbupdate: data});
/*
          // update ui message object with context
          if (_message.context) {
          _message.context.summary = messageToUser.context.summary;
        }
*/
          messageToUser = extend(_message, messageToUser);

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
