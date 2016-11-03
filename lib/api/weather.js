
'use strict';



//////////////////////////////////////////////////////////////////////////
///////////////////      Weather Insights API           /////////////////
////////////////////////////////////////////////////////////////////////

var debug = require('debug')('bot:api:weather');
var pick = require('object.pick');
var format = require('string-template');
var extend = require('extend');
var fields = ['temp', 'pop', 'uv_index', 'narrative', 'phrase_12char', 'phrase_22char', 'phrase_32char'];
var requestDefaults = {
  auth: {
    username: process.env.WEATHER_USERNAME,
    password: process.env.WEATHER_PASSWORD,
    sendImmediately: true
  },
  jar: true,
  json: true
};
var requestNoAuthDefaults = {
  jar: true,
  json: true
};

var weatherKey = process.env.WEATHER_API_KEY;
var request;
var WEATHER_URL = process.env.WEATHER_URL || 'https://twcservice.mybluemix.net/api/weather';

module.exports = {

  geoLocation: function(params, callback) {
    if (!params.name) {
      callback('name cannot be null')
    }

    console.log("-------------------------------".green);
    console.log("ENTERED Weather Service".green);
    console.log({params: params});

    // If API Key is not provided use auth. credentials from Bluemix
    var qString;
    if (!weatherKey) {
        request = require('request').defaults(requestDefaults);
        qString = {
                query: params.name,
                locationType: 'city',
                countryCode: 'US',
                language: 'en-US'
                };
     }else{
        request = require('request').defaults(requestNoAuthDefaults);
        qString = {
                    query: params.name,
                    locationType: 'city',
                    language: 'en-US',
                    countryCode: 'US',
                    apiKey: weatherKey,
                    format : 'json'
                  };
     }

     console.log("-------------------------------".green);
     console.log("Weather Service SEARCH ARGUMENT".green);
     console.log({weatherurl: WEATHER_URL});
     console.log({qstring: qString})


    request({
      method: 'GET',
      url: WEATHER_URL + '/api/weather/v3/location/search',
      qs: qString
    }, function(err, response, body) {
      if (err) {
        callback(err);
      } else if(response.statusCode != 200) {
        callback('Error http status: ' + response.statusCode);
      } else if (body.errors && body.errors.length > 0){
        callback(body.errors[0].error.message);
      } else {

        var location = body.location;

        // note the data model for weather is unique. If multiple states use the same name for a city
        // then weather returns an array called location which has 1 entry -- but with mulitple properties, each of which
        // is an array with an entry for each of the cities
        // otherwise weather returns an object with properties for the single city

        var statesByCity = { };

        if (Array.isArray(location.adminDistrict) ) {

            location.adminDistrict.forEach(function(state, i) {
              // Avoid duplicates

              if (!statesByCity[state]){
                statesByCity[state] = {
                  longitude: location.longitude[i],
                  latitude: location.latitude[i]
                };
              };
            });
          } else {
            statesByCity[location.adminDistrict] = {
              longitude: location.longitude,
              latitude: location.latitude
            }
          }
        console.log(JSON.stringify(statesByCity))
        callback(null, { states: statesByCity });
      }
    });
  },

/**
 * Gets the forecast based on a location and time range
 * @param  {[string]}   params.latitute   The Geo latitude
 * @param  {[string]}   params.longitude   The Geo longitude
 * @param  {[string]}   params.range   (Optional) The forecast range: 10day, 48hour, 5day...
 * @param  {Function} callback The callback
 * @return {void}
 */
  forecastByGeoLocation : function(params, callback) {
    var _params = extend({ range: '7day' }, params);

    if (!_params.latitude || !_params.longitude) {
      callback('latitude and longitude cannot be null')
    }
       var qString;
       if (!weatherKey) {
            request = require('request').defaults(requestDefaults);
            qString = {
                     units: 'e',
                     language: 'en-US'
                     };
         } else {
            request = require('request').defaults(requestNoAuthDefaults);
             qString = {
                     units: 'e',
                     language: 'en-US',
                     apiKey: weatherKey
                     };
          }
     request({
      method: 'GET',
      url: format(WEATHER_URL + '/api/weather/v1/geocode/{latitude}/{longitude}/forecast/daily/{range}.json', _params),
      qs: qString
    }, function(err, response, body) {
      if (err) {
        callback(err);
      } else if(response.statusCode != 200) {
        callback('Error getting the forecast: HTTP Status: ' + response.statusCode);
      } else {
        var forecastByDay = {};
        body.forecasts.forEach(function(f) {
          if (!forecastByDay[f.dow]) {
          forecastByDay[f.dow] = {
            day: pick(f.day, fields),
            night: pick(f.night, fields)
          };
        };
        });
        debug('forecast for: %s is: %s', JSON.stringify(params), JSON.stringify(forecastByDay, null, 2));
        callback(null, forecastByDay);
      }
    });
  }
}
