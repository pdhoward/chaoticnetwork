
'use strict';


//////////////////////////////////////////////////////////////////////////
/////////////////////////////   Web UI Bot      /////////////////////////
////////////////////////////////////////////////////////////////////////

module.exports = function (app, controller) {

  app.post('/api/message', function(req, res, next) {

    console.log("-------------------------------".green);
    console.log("ENTERED WEB UI".green);
    console.log({reqparams: req.body});

    if (!process.env.WORKSPACE_ID) {
      res.status(400).json({error: 'WORKSPACE_ID cannot be null', code: 500});
      return;
    }

    controller.processMessage(req.body, function(err, response) {
      if (err) {
        res.status(err.code || 400).json({error: err.error || err.message});
      } else {
        res.json(response);
      }
    })
  });
}
