'use strict';

const ALEXA_APP_ID = 'amzn1.ask.skill.app.your-skill-id';
const APIAI_PROJECT_ID = 'your-apiai-gcp-project-id';

const AlexaSdk = require('alexa-sdk');
const DialogflowSdk = require('dialogflow');
const sessionClient = DialogflowSdk.SessionsClient();
const structjson = require('./structjson.js');

let alexaSessionId;

exports.handler = function (event, context) {
  let alexa = AlexaSdk.handler(event, context);
  alexa.appId = ALEXA_APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

let handlers = {
  'LaunchRequest': function () {
    let self = this;
    setAlexaSessionId(self.event.session.sessionId);
    let sessionPath = sessionClient.sessionPath(APIAI_PROJECT_ID, alexaSessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        event: {
          name: 'WELCOME'
        },
      },
    };

    sessionClient
      .detectIntent(request)
      .then(responses => {
        logQueryResult(sessionClient, responses[0].queryResult);
        const speech = responses[0].queryResult.fulfillment.text;
        self.emit(':ask', speech, speech);
      })
      .catch(err => {
        console.error('ERROR:', err);
        self.emit(':tell', err);
      });
  },
  'ApiIntent': function () {
    var self = this;
    var text = self.event.request.intent.slots.Text.value;
    setAlexaSessionId(self.event.session.sessionId);
    if (text) {
      let sessionPath = sessionClient.sessionPath(APIAI_PROJECT_ID, alexaSessionId);

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: text,
            languageCode: languageCode,
          },
        },
      };
  
      sessionClient
        .detectIntent(request)
        .then(responses => {
          logQueryResult(sessionClient, responses[0].queryResult);
          const speech = responses[0].queryResult.fulfillment.text;
          if (isResponseIncompleted(responses[0])) {
            self.emit(':ask', speech, speech);
          } else {
            self.emit(':tell', speech);
          }
        })
        .catch(err => {
          console.error('ERROR:', err);
          self.emit(':tell', err);
        });
    } else {
      self.emit('Unhandled');
    }
  },
  'AMAZON.CancelIntent': function () {
    this.emit('AMAZON.StopIntent');
  },
  'AMAZON.HelpIntent': function () {
    var self = this;
    setAlexaSessionId(self.event.session.sessionId);
    let sessionPath = sessionClient.sessionPath(APIAI_PROJECT_ID, alexaSessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        event: {
          name: 'HELP'
        },
      },
    };

    sessionClient
      .detectIntent(request)
      .then(responses => {
        logQueryResult(sessionClient, responses[0].queryResult);
        const speech = responses[0].queryResult.fulfillment.text;
        self.emit(':ask', speech, speech);
      })
      .catch(err => {
        console.error('ERROR:', err);
        self.emit(':tell', err);
      });
  },
  'AMAZON.StopIntent': function () {
    var self = this;
    setAlexaSessionId(self.event.session.sessionId);
    let sessionPath = sessionClient.sessionPath(APIAI_PROJECT_ID, alexaSessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        event: {
          name: 'BYE'
        },
      },
    };

    sessionClient
      .detectIntent(request)
      .then(responses => {
        logQueryResult(sessionClient, responses[0].queryResult);
        const speech = responses[0].queryResult.fulfillment.text;
        self.emit(':tell', speech, speech);
      })
      .catch(err => {
        console.error('ERROR:', err);
        self.emit(':tell', err);
      });
  },
  'Unhandled': function () {
    var self = this;
    setAlexaSessionId(self.event.session.sessionId);
    let sessionPath = sessionClient.sessionPath(APIAI_PROJECT_ID, alexaSessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        event: {
          name: 'FALLBACK'
        },
      },
    };

    sessionClient
      .detectIntent(request)
      .then(responses => {
        logQueryResult(sessionClient, responses[0].queryResult);
        const speech = responses[0].queryResult.fulfillment.text;
        self.emit(':ask', speech, speech);
      })
      .catch(err => {
        console.error('ERROR:', err);
        self.emit(':tell', err);
      });
  }
};

function isResponseIncompleted(response) {
  if (response.queryResult.allRequiredParamsCollected) {
    return true;
  }

  for (var i = 0; i < response.queryResult.outputContexts.length; i++) {
    if (response.queryResult.outputContexts[i].lifespanCount > 1) {
      return true;
    }
  }
  return false;
}

function setAlexaSessionId(sessionId) {
  if (sessionId.indexOf("amzn1.echo-api.session.") != -1) {
    alexaSessionId = sessionId.split('amzn1.echo-api.session.').pop();
  } else {
    alexaSessionId = sessionId.split('SessionId.').pop();
  }
}

function logQueryResult(sessionClient, result) {
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates a context client
  const contextClient = new dialogflow.ContextsClient();

  console.log(`  Query: ${result.queryText}`);
  console.log(`  Response: ${result.fulfillmentText}`);
  if (result.intent) {
    console.log(`  Intent: ${result.intent.displayName}`);
  } else {
    console.log(`  No intent matched.`);
  }
  const parameters = JSON.stringify(
    structjson.structProtoToJson(result.parameters)
  );
  console.log(`  Parameters: ${parameters}`);
  if (result.outputContexts && result.outputContexts.length) {
    console.log(`  Output contexts:`);
    result.outputContexts.forEach(context => {
      const contextId = contextClient.matchContextFromContextName(context.name);
      const contextParameters = JSON.stringify(
        structjson.structProtoToJson(context.parameters)
      );
      console.log(`    ${contextId}`);
      console.log(`      lifespan: ${context.lifespanCount}`);
      console.log(`      parameters: ${contextParameters}`);
    });
  }
}
