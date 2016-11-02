
'use strict';


//////////////////////////////////////////////////////////////////////////
/////////////////////////////    Mainline       /////////////////////////
////////////////////////////////////////////////////////////////////////

require('dotenv').config();

var express =           require('express');
var app = express();
var session =           require('express-session');
var cookieParser =      require('cookie-parser');
var Cookies =           require('cookies');
var serialize =         require('serialize-javascript')
var path =              require('path');
var cors =              require('cors');
var path =              require('path');
var favicon =           require('serve-favicon');
var SocketIo =          require('socket.io');
var url =               require('url');
var colors =            require('colors');
var bodyParser =        require('body-parser');
var rateLimit =         require('express-rate-limit');
var helmet =            require('helmet');
var http =              require('http').Server(app);


// configurations
var setup =             require('./config/setup');
var secrets =           require('./config/secrets');
var transport =         require('./config/gmail');

var debug =             require('debug')('bot:server');

var host =        setup.SERVER.HOST;
var port =        setup.SERVER.PORT;
var dbURI =       setup.SERVER.DB;

// configure express
app.use(helmet());
app.use('/api/', rateLimit({
  windowMs: 60 * 1000, // seconds
  delayMs: 0,
  max: 15
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(favicon(path.join(__dirname, '/public/favicon.ico')));

/////////////////////////////////////////////////////////////////////////////////////////////
//////////////////// Configure our Mongo server and set defaults////////////////////////////
///////////////// This also enables the set of recognized channels for Watson  /////////////
////////////////////////////////////////////////////////////////////////////////////////////

require('./lib/db/mongoose')(dbURI);

///////////////////////////////////////////////////////////////////////
/////////////////// session and session store setup ////////////////////////
//////////////////////////////////////////////////////////////////////


// for express sessions and cookies
var sessionSecret = secrets.SECRETS.SESSIONSECRET;

var MongoDBStore = require('connect-mongo')(session);

var track = new MongoDBStore(
        { url: dbURI,
          collection: 'sessions'});

var sessionParms = {
  name: 'chaoticbots',
  secret: sessionSecret,
  saveUninitialized: true,
  resave: false,
  store: track,
  cookie: {
      path: '/',
      domain: 'localhost',
      secure: false,
      httpOnly: false
//      maxAge: 1000
      }
  }


// Catch errors
track.on('error', function(error) {
    console.log("error with session store = " + error);
});

app.use(session(sessionParms));


///////////////////////////////////////////////////////////////////////
/////////////////// chaoticbot alerts on errors //////////////////////
//////////////////////////////////////////////////////////////////////

var mailObject = {
  from: '"ChaoticBots 👥" <chaoticbotshelp@gmail.com>',
  to: 'patrick.howard@hotmail.com',
  subject: 'Platform Error',
  text: ''
}

process.on('uncaughtException', function (er) {
    console.error(er.stack)
    mailObject.text = er.stack;
    transport.sendMail(mailObject, function (er) {
       if (er) console.error(er)
       process.exit(1)
    })
  })

// Helper Function to check for environment variables
var checkAndRequire = function(envItem, toRequire, debugMessage) {
  if (envItem && envItem.match(/true/i)) {
    if (debugMessage) {
        debug(debugMessage);
    }
    require(toRequire)(app,controller);
  }
};

// configure the channels
var controller = require('./lib/controller');
checkAndRequire(process.env.USE_FACEBOOK, './lib/bot/facebook','Initializing FB Messenger Bot');
checkAndRequire(process.env.USE_TWILIO, './lib/bot/twilio', 'Initializing Twilio Bot');
checkAndRequire(process.env.USE_TWILIO_SMS, './lib/bot/twilio-sms', 'Initializing Twilio SMS Bot');
checkAndRequire(process.env.USE_WEBUI, './lib/bot/web-ui', 'Initializing WebUI');


///////////////////////////////////////////////////////////////////////
///////////////    configure webserver for sessions    ///////////////
//////////////////////////////////////////////////////////////////////
/*
app.use(function(req, res, next){

	var keys;
	console.log('-----------incoming request -------------'.green);
	console.log('New ' + req.method + ' request for', req.url);

  if (req.session.count) {
    req.session.count++;
  }
  else {
    req.session.count = 1;
  }

  req.bag = req.session						//create my object for my stuff

  req.session.save(function(err){
    if (err) console.log("error saving session".green + err);
  })

	var url_parts = url.parse(req.url, true);
	req.parameters = url_parts.query;
	keys = Object.keys(req.parameters);

	if(req.parameters && keys.length > 0)
    console.log({parameters: req.parameters});		//print request parameters
	keys = Object.keys(req.body);
	if (req.body && keys.length > 0)
    console.log({body: req.body});						//print request body

	next();
});
*/




http.listen(port, function () {
  debug('Server listening on port: ' + port);
});

module.exports = http
