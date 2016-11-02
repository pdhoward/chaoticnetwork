# Chaoticbots

![Image of error bot]  (https://errbot.readthedocs.org/en/latest/_static/errbot.png)

![Image of travis shield] (https://img.shields.io/travis/errbotio/errbot/master.svg)

![Image of travis shield] (https://img.shields.io/pypi/v/errbot.svg)

![Image of travis shield] (https://img.shields.io/badge/License-GPLv3-green.svg)

![Image of travis shield] (https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg)

![Image of travis shield] (https://graphs.waffle.io/errbotio/errbot/throughput.svg)

======

ChaoticBot is a demonstration of the speed and agility that is gained through the open source Community for delivering rich interactive experiences.

We draw on numerous IBM open source projects for code, patterns and integration with the Watson APIs


## Getting Started

This application is written in [Node.js](http://nodejs.org/) and uses the [npm](https://www.npmjs.com/), the Node Package Manager, command to install a software development kit (SDK) for the Watson Developer Cloud services, as well as to satisfy other dependencies.

The following instructions include Instructions for downloading and installing these.

1. Log into GitHub and clone [the repository for this application](https://github.com/watson-developer-cloud/text-bot). Change to the folder that contains your clone of this repository.

2. [Create a Bluemix Account](sign_up) if you do not already have one, or use an existing account.

3. If it is not already installed on your system, download and install the [Cloud-foundry command-line interface (CLI)][cloud_foundry] tool.

4. If it is not already installed on your system, install [Node.js](http://nodejs.org/). Installing Node.js will also install the `npm` command. Make sure to use node version 4.2.1 or later, as specified in `package.json`, or you may run into problems when installing other mandatory Node.js packages.

5. <a name="edityml">Edit the `manifest.yml` file</a> in the folder that contains your clone of the repository and replace `application-name` with a unique name for your copy of the application. The name that you specify determines the application's URL, such as `application-name.mybluemix.net`.

6. Connect to Bluemix by running the following commands in a terminal window:

     ```bash
     cf api https://api.ng.bluemix.net
     cf login -u <your-Bluemix-ID> -p <your-Bluemix-password>
     ```

7. Create instances of the services that are used by the application - specifically, alchemy, weather and conversation. In addition, this application uses and instance of mongolab database. A free sandbox can be obtained along with api credentials at mongolab.com (or refactor the code to use another db)

## Installing the chaoticbot

1. This project uses the ibm sdk for bots, permitting numerous interaction points with users. The webui has been implemented in this project, but other configurations and api templates are available to deploy bots on twilio and facebook

2. Edit the `.env` file to add credentials for Facebook and Twilio. See the following links for information about where you can get the credentials required by the botkit for each service:

    * [Facebook](https://github.com/howdyai/botkit/blob/master/readme-facebook.md#getting-started)
    * [Twilio](https://github.com/howdyai/botkit/blob/master/readme-twilioipm.md#getting-started)

3. If you are integrating with Twilio, set the `USE_TWILIO` and `USE_TWILIO_SMS` variables in your `.env` file to `true`. If you are integrating with Facebook, set the `USE_FACEBOOK` variable in your `.env` file to `true`.

4. Modify the file `lib/bot/bot.js` to include your own bot handling code. If you would like to use a separate bot messaging service (such as `wit.ai`, `converse.ai`, and so on ), you can add the middleware to each bot instance that you'd like for that service to use, and configure it with the single `bot.js` file.

## Running Local

1. Gulp is used opening multiple ports for debugging purposes. Open `http://localhost:3000` to see the running application.

## Reference information
Many thanks to the team at IBM for excellent references on their AI services

The following links provide more information about the Conversation, WeatherInsights, and Alchemy Language services.

### Conversation service
  * [API documentation](http://www.ibm.com/watson/developercloud/doc/conversation/): Get an in-depth knowledge of the Conversation service
  * [API reference](http://www.ibm.com/watson/developercloud/conversation/api/v1/): SDK code examples and reference
  * [API Explorer](https://watson-api-explorer.mybluemix.net/apis/conversation-v1): Try out the API
  * [Creating your own conversation service instance](http://www.ibm.com/watson/developercloud/doc/conversation/convo_getstart.shtml): How to use the API to create and use your own classifier

### Weather service
  * [API documentation](https://console.ng.bluemix.net/docs/services/Weather/index.html?pos=2): Get an in-depth understanding of the Weather Insights services
  * [API reference](https://console.ng.bluemix.net/docs/services/Weather/weather_tutorials_samples.html#tutorials_samples): Code examples and reference
  * [API Explorer](https://console.ng.bluemix.net/docs/services/Weather/weather_rest_apis.html#rest_apis): Try out the REST API

### Alchemy Language
  * [API documentation](http://www.alchemyapi.com/api): Get an in-depth understanding of the AlchemyAPI services
  * [AlchemyData News reference](http://docs.alchemyapi.com/): API and query gallery


## Best Practices

Most of the best practices associated with writing a conversational application are explained within the [documentation for the Conversation service](http://www.ibm.com/watson/developercloud/doc/conversation/). These can be grouped into several general areas, as described in the next few sections.
