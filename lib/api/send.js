
'use strict';

var transport =             require('../../config/gmail');

///////////////////////////////////////////////////////////////////////
/////////////////// email notification and transport///////////////////
//////////////////////////////////////////////////////////////////////


module.exports = {

  mail: function(mailobject, callback) {

    console.log("-------------------------------".green);
    console.log("ENTERED SEND EMAIL".green);
    console.log({mailobject: mailobject});    

    transport.sendMail(mailobject, function (error, info) {
        if (error) {console.log(error)};
      })

    return callback();
    }

};
