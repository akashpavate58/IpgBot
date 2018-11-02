/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var request = require('request');
var fs = require('fs');
var restify = require('restify'); 
//var useEmulator = (process.env.NODE_ENV == 'development');

var config = require('./botconfig.json')

//helper functions import12
var remedy = require('./remedy');
var logger = require("./logger.js");
var payload = require("./payload.json");
var summary = require('./ticketsummary.json');

//all responses import
//var response = require("./responses.json");
var misc_responses = require('./responses/misc.responses.json');
var request_responses = require('./responses/request.responses.json');
var error_responses = require('./responses/error.responses.json');
var question_responses = require('./responses/question.responses.json')

 //var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
	 var connector = new builder.ChatConnector({ 
  appId: config.appId,
  appPassword: config.appPassword,
  stateEndpoint: process.env['BotStateEndpoint'],
  openIdMetadata: process.env['BotOpenIdMetadata']
});  

var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3000, function () {

console.log("--------------------------------------------------------");
console.log( "IPG Bot is running with the address : "+server.url);

console.log("--------------------------------------------------------");
});

/* 
var	connector = new builder.ChatConnector({ 
	appId: "9c2670cb-393c-4770-9370-cd460f6782a8",//"621b7c00-1ac1-4c20-b7a5-f7b895526f73",
appPassword: "Y7z>_i0cmURN-xl9"//"7@$/XzMHJ)TC_Z=;"
}) */;


//var bot = new builder.UniversalBot(connector);
var bot = new builder.UniversalBot(connector, {
    storage: new builder.MemoryBotStorage()
});

server.post('/api/messages', connector.listen());

var userDetails = {
  "userEmail": "ram.burugu@interpublic.com",
  // "userEmail": "ram.burugu@corp.ipgnetwork.com",
  "platform": "Windows",
  "site": "US-NYC-9093AV-GIS",
  "siteGroup": "United States"
}

//var bot = new builder.UniversalBot(connector)
var bot = new builder.UniversalBot(connector, {
    storage: new builder.MemoryBotStorage()
});
bot.on("event", function(event) {
  var msg = new builder.Message().address(event.address);
  var msgArray = [];
  msg.textLocale("en-us");
  userDetails.userEmail = event.value.user;
  userDetails.platform = event.value.platform;
  // function logStartMessage(msgArray, msgText){
  //   msgArray.push({text: msgText});
  //   logger.log(msgArray, false, false, false, "");
  //   msgArray = [];
  // };
  if (event.value.site == "") {
    userDetails.userEmail = event.value.user;
    userDetails.platform = event.value.platform;
    userDetails.site = "";
    userDetails.siteGroup = "";
    var message = "Hey There! I would be glad to assist you! But in order to do that you will have to provide me with the site information, up in the form!"
    msg.text(message);
    logStartMessage(msgArray, message);
  } else {
    userDetails.userEmail = event.value.user;
    userDetails.platform = event.value.platform;
    userDetails.site = event.value.site;
    userDetails.siteGroup = event.value.siteGroup;
    if (event.name === "SAPTM") {
      var message = "Hey There! I am your Virtual Vantage assistant.  How can I assist you with your time management today?";
      msg.text(message);
      // logStartMessage(message);
    } else if (event.name === "SAPTM-stale") {
      var message = "Still having trouble with Time management? Feel free to ask away!";
      msg.text(message);
      // logStartMessage(message);
    } else if (event.name === "initReponse") {
      var message = "Hello, I am Irwin - the IPG Help Desk Assistant! What can I help you with today?";
      msg.text(message);
      // logStartMessage(message);
    } else if (event.name === "setSiteVal") {
      var message = "Great! I have all the information I need! By the way, I am Irwin. What can I help you with today?";
      msg.text(message);
      // logStartMessage(message);
    }
    msg.attachmentLayout(builder.AttachmentLayout.list)
    .attachments(getCardsAttachments());
  }
  console.log(userDetails);
  bot.send(msg);
  logger.endDialog();
});


//Basic root dialog which takes an inputted color and sends a changeBackground event. No NLP, regex, validation here - just grabs input and sends it back as an event.

bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = '50de5b8e-97ca-4e24-8063-362c3538c2fb';
var luisAPIKey = '9b5a68370b9d4f4bb5abb31a3fb62257';
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl =config.model; //'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/50de5b8e-97ca-4e24-8063-362c3538c2fb?subscription-key=9b5a68370b9d4f4bb5abb31a3fb62257&timezoneOffset=-360&q=';

function createReceiptCard1(session) {
  return new builder.ReceiptCard(session)
  .title('Steps')
  .facts([
    builder.Fact.create(session, '', 'Check the time entry that you want to delete from your time sheet'),
    builder.Fact.create(session, '', 'Click Delete Button'),
    builder.Fact.create(session, '', 'Click Save as Favorite')

  ]);
}

function getCardsAttachments(session) {
  return [
    new builder.HeroCard(session)
    .buttons([
      builder.CardAction.imBack(session, 'I have an error', "I have an error"),
      builder.CardAction.imBack(session, 'I have a question', "I have a question"),
      builder.CardAction.imBack(session, 'I have a request', "I have a request")
    ]),
  ];
}

function confirmCards(session) {
  return [
    new builder.HeroCard(session)
    .buttons([
      builder.CardAction.imBack(session, 'Yes', "Yes"),
      builder.CardAction.imBack(session, 'No', "No"),
    ]),
  ];
}

var data = payload.createticket_payload;



// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intent = new builder.IntentDialog({
  recognizers: [recognizer]
});
//Creates a backchannel event
var createEvent = function(eventName, value, address) {
  var msg = new builder.Message().address(address);
  msg.data.type = "event";
  msg.data.name = eventName;
  msg.data.value = value;
  return msg;
};

function checkFields(session) {
  var event = createEvent("checkFields", "#usersite", session.message.address);
  session.send(event);
};
intent.matches('/', [
  function(session, args) {
    session.sendTyping();
  }
]);
intent.matches('intent.greetings', [
  function(session, args) {
	  console.log("Inside greeting")
    session.sendTyping();
    var a = misc_responses.greetings;
    var cards = getCardsAttachments();
    // create reply with Carousel AttachmentLayout
	//greetings12
    var reply = new builder.Message(session)
    .text(a[Math.round(Math.random() * 1)])
    .attachmentLayout(builder.AttachmentLayout.list)
    .attachments(cards);
    checkFields(session);
    session.send(reply);
    logger.endDialog();
    logger.log(session.batch, session.message, false, false, "",""); 
  }
]);

intent.matches('intent.request', [
  function(session, args) {
    session.sendTyping();
    session.send(request_responses.request);
    logger.log(session.batch, session.message, false, false,"", "").then((currentLogState)=>{
      console.log(currentLogState);
    });
  }
]);

intent.matches('intent.changetimeapprover', [
  function(session, args) {
    session.sendTyping();
    setTicketData(session, userDetails, "Request",summary.request.changetimeapprover,"User Service Request");
    //Create Ticket Function
    remedy.createTicket(data)
    .then(function(referenceObject) {
      session.send(request_responses.changetimeapprover.main);
      session.delay(3000);
      session.send(request_responses.changetimeapprover.sub+request_responses.changetimeapprover.links);
      referenceObject.resolution = "User has been advised to reach out to local office HR admin to update the ZHR04(if needed) and PA30 for time approver change. IPG Learning Center links provided as well."+request_responses.changetimeapprover.links;
      referenceObject.sapTabCause = "User Error";
      referenceObject.sapTabResolution = "User advised with procedure - NAR";
      confirmResolution(session, referenceObject);
    })
    .catch(function(err) {
      console.log("Ticket creation failed.");
      session.send(err);
    });
  }, function(session, results){
    session.endDialog();
  }
]);

function confirmResolution(session, referenceObject){
  session.privateConversationData.batch = session.batch;
  session.privateConversationData.userMessage = session.message;
  session.privateConversationData.referenceObject = referenceObject;
  session.beginDialog('confirmResolution', session.batch);
};

bot.dialog('confirmResolution', [
  function (session) {
      session.delay(3000);
    var reply = new builder.Message(session)
    .text("Was I able to solve your problem?")
    .attachmentLayout(builder.AttachmentLayout.carousel)
    .attachments(confirmCards());
    builder.Prompts.confirm(session, reply);
  },
  function (session, results) {
    if(results.response){
      session.endDialog("Great! I am glad to have helped you!");
      session.privateConversationData.batch = session.privateConversationData.batch.concat(session.batch),
      logAndResolve(
        session.privateConversationData.batch,
        session.privateConversationData.userMessage,
        session.privateConversationData.referenceObject);
      }else{
        session.endDialog("I am sorry to hear that, your ticket number is "+session.privateConversationData.referenceObject.incidentID+". A help desk representative will be able to help you very soon. I have submitted a ticket on your behalf and you do NOT have to submit the iForm again.");

        session.privateConversationData.referenceObject.resolution ="Bot was not able to solve user's issue. - " + session.privateConversationData.referenceObject.resolution;
        session.privateConversationData.batch = session.privateConversationData.batch.concat(session.batch),
        logAndUpdate(
          session.privateConversationData.batch,
          session.privateConversationData.userMessage,
          session.privateConversationData.referenceObject);
        }
      }
    ]);
    intent.matches('intent.removetimeapprover', [
      function(session, args) {
        session.sendTyping();
        setTicketData(session, userDetails, "Request",summary.request.removetimeapprover,"User Service Request");
        //Create Ticket Function
        remedy.createTicket(data)
        .then(function(referenceObject) {
          session.send(request_responses.removetimeapprover.main);
          session.delay(3000);
          session.send(request_responses.removetimeapprover.sub+request_responses.removetimeapprover.links);
          referenceObject.resolution = "User advised to reach out to the local office HR admin and request to be removed as time approver in the user’s PA30. IPG Learning Center links provided as well. "+request_responses.removetimeapprover.links;
          referenceObject.sapTabCause = "User Error";
          referenceObject.sapTabResolution = "User advised with procedure - NAR";
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },
      function(session, results){
        session.endDialog();
      }
    ]);
    intent.matches('intent.setuptimeapprover', [
      function(session, args) {
        setTicketData(session, userDetails, "Request",summary.request.setuptimeapprover,"User Service Request");
        //Create Ticket Function
        remedy.createTicket(data)
        .then(function(referenceObject) {
          session.send(request_responses.setuptimeapprover.main);
          session.delay(3000);
          session.send(request_responses.setuptimeapprover.sub+request_responses.setuptimeapprover.links);
          referenceObject.resolution = "User advised to reach out to the local office HR admin and request to be updated as time approver in the user’s PA30. IPG Learning Center links provided as well."+request_responses.setuptimeapprover.links;
          referenceObject.sapTabCause = "User Error";
          referenceObject.sapTabResolution = "User advised with procedure - NAR";
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },function(session,results){
        session.endDialog();
      }
    ]);
    intent.matches('intent.updatetime', [
      function(session, args) {
        session.sendTyping();
        setTicketData(session, userDetails, "Request",summary.request.updatetime,"User Service Request");
        //Create Ticket Function
        remedy.createTicket(data)
        .then(function(referenceObject) {
          session.send(request_responses.updatetimeapprover.main);
          session.delay(3000);
          session.send(request_responses.updatetimeapprover.sub+request_responses.updatetimeapprover.links);
          referenceObject.resolution = "User advised to reach out to Super User to edit time on their behalf."+request_responses.updatetimeapprover.links;
          referenceObject.sapTabCause = "User Error";
          referenceObject.sapTabResolution = "User advised with procedure - NAR";
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },function(session,results){
        session.endDialog();
      }
    ]);

    intent.matches('intent.question', [
      function(session, args) {
        session.sendTyping();
        session.send(question_responses.question);
        logger.log(session.batch, session.message, false, false,"", "");
      }
    ]);

    intent.matches('intent.editfavouritejoblist', [
      function(session, args) {
          console.log(args);
        session.sendTyping();
        setTicketData(session, userDetails, "Question",summary.question.editfavouritejoblist,"User Service Restoration");

        remedy.createTicket(data)
        .then(function(referenceObject) {
            console.log(args.entities[0].type);
          if (args.entities[0].type == "entity.favoritelistoperations::edit") {
            session.send(question_responses.editfavouritejoblist.edit);
            session.delay(3000);
        } else if (args.entities[0].type == "entity.favoritelistoperations::add") {
            session.send(question_responses.editfavouritejoblist.add);
            session.delay(3000);
        } else if (args.entities[0].type == "entity.favoritelistoperations::remove") {

            session.send(question_responses.editfavouritejoblist.remove);
            session.delay(3000);
          }
          session.send(question_responses.editfavouritejoblist.sub + question_responses.editfavouritejoblist.links);
          referenceObject.resolution = "User advised on steps to edit favorite jobs. IPG Learning Center Training link also shared."+question_responses.editfavouritejoblist.links;
          referenceObject.sapTabCause = "Training";
          referenceObject.sapTabResolution = "User advised with procedure - NAR";
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },function(session,results){
        session.endDialog();
      }

    ]);

    intent.matches('intent.timeentry', [
      function(session, args) {
        session.sendTyping();
        setTicketData(session, userDetails, "Question",summary.question.timeentry,"User Service Restoration");
        //Create Ticket Function
        remedy.createTicket(data)
        .then(function(referenceObject) {
          session.send(question_responses.timeentry.main+question_responses.timeentry.links)

          referenceObject.resolution = "User advised to learn more about Time Entry in the IPG Learning Center. Also directed to speak with Office Time Super User for additional assistance."+question_responses.timeentry.links;
          referenceObject.sapTabCause = "User Error";
          referenceObject.sapTabResolution = "Training";
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },function(session,results){
        session.endDialog();
      }
    ]);

    intent.matches('intent.multipletimeadmins', [
      function(session, args) {
        session.sendTyping();
        setTicketData(session, userDetails, "Question",summary.question.multipletimeadmins,"User Service Restoration");
        //Create Ticket Function
        remedy.createTicket(data)
        .then(function(referenceObject) {
          session.send(question_responses.multipletimeadmins.main);

          referenceObject.resolution = "User advised that only one time admin can be maintained per user in their PA30.";
          referenceObject.sapTabCause = "Training";
          referenceObject.sapTabResolution = "User advised with procedure - NAR";

          //logging and resolveIncident now wrapped in one function
          //logAndResolve(session.batch, session.message, referenceObject);
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },function(session,results){
        session.endDialog();
      }
    ]);
    intent.matches('intent.error', [
      function(session, args) {
        session.sendTyping();
        session.send(error_responses.error);
        logger.log(session.batch, session.message, false, false,"", "");
      }

    ]);
    intent.matches('intent.employeegrademissing', [
      function(session, args) {
        session.sendTyping();
        setTicketData(session, userDetails, "Incident",summary.error.employeegrademissing,"User Service Restoration");
        //Create Ticket Function
        remedy.createTicket(data)
        .then(function(referenceObject) {
          session.send(error_responses.employeegrademissing.main);
          session.delay(3000);
          session.send(error_responses.employeegrademissing.sub+error_responses.employeegrademissing.links);

          referenceObject.resolution = "User advised to reach out to HR team to update the missing employee grade in PA30."+error_responses.employeegrademissing.links;
          referenceObject.sapTabCause = "User Account Configuration";
          referenceObject.sapTabResolution = "User advised with procedure - NAR";

          //logging and resolveIncident now wrapped in one function
          //logAndResolve(session.batch, session.message, referenceObject);
          confirmResolution(session, referenceObject);
        })
        .catch(function(err) {
          session.send(err);
        });
      },function(session,results){
        session.endDialog();
      }
    ]);

    //#3
    var ticketjson={};
    intent.matches('intent.errorinvalidjob', [
      function(session, args) {
        session.sendTyping();
        setTicketData(session, userDetails, "Incident",summary.error.errorinvalidjob,"User Service Restoration");
        remedy.createTicket(data)
        .then(function(referenceObject) {
          ticketjson.ticketnumber=referenceObject;
          if (args.entities.length == 0) {
            console.log(args.entities);
            session.dialogData.num = '';
            session.beginDialog('/jobnumber', session.dialogData.num);
            session.dialogData.num;
            logger.log(session.batch, session.message, false, false,false, ticketjson.ticketnumber);
            //logger.endDialog();
          } else {
            session.dialogData.num = args.entities[0].entity;
          }

        })
        .catch(function(err) {
          session.send(err);
        });
      }
    ]);

    //console.log(json1.ticketnumber);
    bot.dialog('/jobnumber', [
      function(session, args, next) {
        console.log(args);
        if (args == "") {

          console.log(session.dialogData.num)
          session.beginDialog('/askjobnumber', session.dialogData.num);
        } else {
          next(args);
        }
      },
      function(session, args, next) {
        session.endDialog();
      }
    ]);

    var n;
    bot.dialog('/askjobnumber', [
      function(session, args) {
        builder.Prompts.text(session, "Can you please enter your job number?");
        // logger.log(session.batch, session.message, false, false, ticketjson.ticketnumber);
        //logger.endDialog();
      },
      function(session, args, results) {

        session.dialogData.num = args.response;
        console.log(args.response);
        session.send(error_responses.invalidjob);
        session.delay(3000);
        //logger.log(session.batch, session.message, false, false,ticketjson.ticketnumber);
        request({
          method: 'GET',
          uri: config.validator + '/irwin/validator/?object=job&jbn=' + args.response
        },
        function(error, res, body) {

          if (res.statusCode==200) {

            console.log(JSON.parse(res.body).reason);
            if (JSON.parse(res.body).reason == "incorrect job number") {
              session.send(error_responses.incorrectjobnum.main);
              session.delay(3000);
              session.send(error_responses.incorrectjobnum.sub+error_responses.incorrectjobnum.links);

              ticketjson.ticketnumber.resolution = "Incorrect job number found, hence user asked to recheck the job number else confirm job number with job owner"+error_responses.incorrectjobnum.links;
              ticketjson.ticketnumber.sapTabCause = "User Error";
              ticketjson.ticketnumber.sapTabResolution = "User advised with procedure - NAR";

              //logging and resolveIncident now wrapped in one function
              session.endDialog();
              //logAndResolve(session.batch, session.message, ticketjson.ticketnumber);

              confirmResolution(session, ticketjson.ticketnumber);


            } else if (JSON.parse(res.body).reason == "validity expired") {
              session.send(error_responses.validityexpired.main);
              session.delay(3000);
              session.send(error_responses.validityexpired.sub+error_responses.validityexpired.links);

              ticketjson.ticketnumber.resolution = "User advised to have the job dates updated"+error_responses.validityexpired.links;
              ticketjson.ticketnumber.sapTabCause = "User Error";
              ticketjson.ticketnumber.sapTabResolution = "User advised with procedure - NAR";

              //logging and resolveIncident now wrapped in one function
              session.endDialog();
              //logAndResolve(session.batch, session.message, ticketjson.ticketnumber);
              confirmResolution(session, ticketjson.ticketnumber);


            } else if (JSON.parse(res.body).reason == "invalid status") {
              session.send(error_responses.invalidstatus.main);
              session.delay(3000);
              session.send(error_responses.invalidstatus.sub+error_responses.invalidstatus.links);

              ticketjson.ticketnumber.resolution = "Invalid Job Status Found, user advised to reach out to job owner (or) finance contact to have job status updated (or) new job number created"+error_responses.invalidstatus.links;
              ticketjson.ticketnumber.sapTabCause = "User Error";
              ticketjson.ticketnumber.sapTabResolution = "User advised with procedure - NAR";

              //logging and resolveIncident now wrapped in one function
              session.endDialog();
              //logAndResolve(session.batch, session.message, ticketjson.ticketnumber);
              confirmResolution(session, ticketjson.ticketnumber);


            } else if (JSON.parse(res.body).reason == "invalid plant") {
              session.send(error_responses.invalidplant.main);
              session.delay(3000);
              session.send(error_responses.invalidplant.sub+error_responses.invalidplant.links);

              ticketjson.ticketnumber.resolution = "Plant does not match for user and job, user advised to reach out to respective contacts to resolve the issue"+error_responses.invalidplant.links;
              ticketjson.ticketnumber.sapTabCause = "User Error";
              ticketjson.ticketnumber.sapTabResolution = "User advised with procedure - NAR";

              //logging and resolveIncident now wrapped in one function
              session.endDialog();
              //logAndResolve(session.batch, session.message, ticketjson.ticketnumber);
              confirmResolution(session,ticketjson.ticketnumber );

            } else {
              session.send("The Job Number is perfectly valid");
              session.endDialog();

              //logAndResolve(session.batch, session.message, ticketjson.ticketnumber);
              confirmResolution(session,ticketjson.ticketnumber);
            }

          } else {
            console.log(error);
            noServerResponse(session);

          };
        }
      )


    },function(session,results){
      session.endDialog();
    }

  ]);

  intent.matches('intent.errorinvalidactivity', [
    function(session, args) {
      session.sendTyping();
      setTicketData(session, userDetails, "Incident",summary.error.errorinvalidactivity,"User Service Restoration");

      remedy.createTicket(data)
      .then(function(referenceObject) {
        ticketjson.ticketnumber_activity=referenceObject;
        if (args.entities.length == 0) {
          console.log(args.entities);
          session.dialogData.num = '';
          session.beginDialog('/jobnumber1', session.dialogData.num);
          session.dialogData.num;
          logger.log(session.batch, session.message, false, false,false, ticketjson.ticketnumber_activity);
        } else {
          session.dialogData.num = args.entities[0].entity;
        }

      })
      .catch(function(err) {
        session.send(err);
      });
    },function(session,results){
      session.endDialog();
    }
  ]);


  bot.dialog('/jobnumber1', [

    function(session, args, next) {
      console.log("inside job number1");
      console.log(args);
      if (args == "") {

        console.log(session.dialogData.num)
        session.beginDialog('/askjobnumber1', session.dialogData.num);
      } else {
        next(args);
      }
    },
    function(session, args, next) {
      session.endDialog();
    }
  ]);
  var n;
  var json = {};
  bot.dialog('/askjobnumber1', [

    function(session, args) {
      console.log("inside ask job number1")
      builder.Prompts.text(session, "Can you please enter your job number?");
      //logger.log(session.batch, session.message, false, false, ticketjson.ticketnumber_activity);

    },
    function(session, args, results) {

      session.dialogData.num = args.response;
      json.jobnumber = args.response;
      session.dialogData.activity = '';
      //logger.log(session.batch, session.message, false, false, "");
      session.beginDialog('/activitynumber', session.dialogData.activity);
      session.dialogData.activity;

    }

  ]);
  bot.dialog('/activitynumber', [
    function(session, args, next) {

      if (args == "") {

        console.log(session.dialogData.activity)
        session.beginDialog('/askactivitynum', session.dialogData.activity);
      } else {
        next(args);
      }
    },
    function(session, args, next) {
      session.endDialog();
    }
  ]);
  bot.dialog('/askactivitynum', [
    function(session, args) {

      if (n == 0) {
        builder.Prompts.text(session, " Please provide me your correct activity number?");
      } else {
        builder.Prompts.text(session, "Can you please enter your activity number?");
        logger.log(session.batch, session.message, false, false, ticketjson.ticketnumber_activity);
      }


    },
    function(session, args, results) {

      session.dialogData.activity = args.response;
      console.log(json.sample);
      session.send(error_responses.invalidactivity);
      logger.log(session.batch, session.message, false, false,false, ticketjson.ticketnumber_activity);

      session.delay(3000);

      request({
        method: 'GET',
        uri: config.validator + '/irwin/validator/?object=activity&jbn=' + json.jobnumber + '&act=' + args.response
      },
      function(error, res, body) {
        if (res.statusCode==200) {

          console.log(JSON.parse(res.body).reason);

          if (JSON.parse(res.body).reason == "invalid Time Off activity code") {
            session.send(error_responses.timeoffcode.main);
            session.delay(3000);
            session.send(error_responses.timeoffcode.sub+error_responses.timeoffcode.links);

            ticketjson.ticketnumber_activity.resolution = "User provided with training links for Time Entry and Time Off Activity Codes in IPG Learning Center"+error_responses.timeoffcode.links;
            ticketjson.ticketnumber_activity.sapTabCause = "User Error";
            ticketjson.ticketnumber_activity.sapTabResolution = "Training";

            //logging and resolveIncident now wrapped in one function
            session.endDialog();
            //logAndResolve(session.batch, session.message, ticketjson.ticketnumber_activity);
            confirmResolution(session, ticketjson.ticketnumber_activity);


          } else if (JSON.parse(res.body).reason == "agency customer master list not maintained") {
            session.send(error_responses.agencycustomer.main);
            session.delay(3000);
            session.send(error_responses.agencycustomer.sub+error_responses.agencycustomer.links);


            ticketjson.ticketnumber_activity.resolution = "User advised to recheck the activity type, else ask job owner to update the Customer Material list in VB03"+error_responses.agencycustomer.links;
            ticketjson.ticketnumber_activity.sapTabCause = "User Error";
            ticketjson.ticketnumber_activity.sapTabResolution = "User advised with procedure - NAR";

            //logging and resolveIncident now wrapped in one function
            session.endDialog();
            //logAndResolve(session.batch, session.message,ticketjson.ticketnumber_activity);
            confirmResolution(session, ticketjson.ticketnumber_activity);

          }
          else {

            session.send(error_responses.activity);

            session.endDialog();
            confirmResolution(session, ticketjson.ticketnumber_activity);
          }
        }else {
          console.log(error);
          noServerResponse(session);
        };
      });
    },function(session,results){
      session.endDialog();
    }

  ]);
  intent.matches('intent.personnelnotauthorized', [
    function(session, args) {
      session.sendTyping();
      setTicketData(session, userDetails, "Incident",summary.error.personnelnotauthorized,"User Service Restoration");
      //Create Ticket Function
      remedy.createTicket(data)
      .then(function(referenceObject) {
        request({
          method: 'GET',
          uri: config.validator + '/irwin/validator/?object=role&user=' + userDetails.userEmail
        },
        function(error, res, body) {
          if (res.statusCode==200) {
            if (JSON.parse(res.body).statusCode == "TENM") {
              session.send(error_responses.incorrectrole.main);
              session.delay(3000);
              session.send(error_responses.incorrectrole.sub + referenceObject.incidentID);

              session.endDialog();
              referenceObject.sapTabCause = "User Account Configuration";
              logAndUpdate(session.batch, session.message, referenceObject);
            }else if(JSON.parse(res.body).statusCode == "CVRNM"){
              session.send(error_responses.incorrectrole1.main);
              session.delay(3000);
              session.send(error_responses.incorrectrole1.sub + referenceObject.incidentID);

              session.endDialog();
              referenceObject.sapTabCause = "User Account Configuration";
              logAndUpdate(session.batch, session.message, referenceObject);

            }
            else {
              session.send(error_responses.personal.main);
              session.delay(3000);
              session.send(error_responses.personal.sub+error_responses.personal.links);

              session.endDialog();
              //logger.log(session.batch, session.message, false, false, referenceObject);
              referenceObject.resolution ="User advised to double check dates (or) reach outto HR Department for updating active status"+error_responses.personal.links;
              referenceObject.sapTabCause = "User Account Configuration";
              referenceObject.sapTabResolution = "User advised with procedure - NAR";
              //logAndUpdate(session.batch, session.message, referenceObject);
              //logAndResolve(session.batch, session.message, referenceObject);
              confirmResolution(session,referenceObject);

            }
          } else {
            console.log(error);
            noServerResponse(session);

          };
        }
      )
      //remedy.resolveIncident(referenceObject, session.batch);
      //logger.log(session.batch, session.message, true, true, referenceObject);
      //logger.endDialog();
    })
    .catch(function(err) {
      console.log(err);
    });
  },function (session,results){
    session.endDialog();
  }
]);
intent.matches('intent.useremailblocked', [
  function(session, args) {
    session.sendTyping();
    setTicketData(session, userDetails, "Incident",summary.error.useremailblocked,"User Service Restoration");
    //Create Ticket Function


    remedy.createTicket(data)
    .then(function(referenceObject) {
      session.send(error_responses.emailblocked);
      session.delay(3000);
      request({
        method: 'GET',
        uri: config.validator + '/irwin/validator?object=time&user='+userDetails.userEmail
      },
      function(error, res, body) {
        if (res.statusCode==200) {
          //console.log("INSIDE")
          console.log(JSON.parse(res.body).reason);

          if (JSON.parse(res.body).status =='error') {
            session.send(error_responses.emailblockederror.main +JSON.parse(res.body).response);
            session.delay(3000);
            session.send(error_responses.emailblockederror.sub+error_responses.emailblockederror.links);

            session.endDialog();
            //  session.endConversation();
            referenceObject.resolution = "User was missing time, advised on which time entry to complete to get access to email"+error_responses.emailblockederror.links;
            referenceObject.sapTabCause = "User Error";
            referenceObject.sapTabResolution = "User advised with procedure - NAR";

            //logging and resolveIncident now wrapped in one function
            //logAndResolve(session.batch, session.message, referenceObject);
            confirmResolution(session,referenceObject);

          } else {
            session.send(error_responses.emailblockedsuccess.main);
            session.delay(3000);
            session.send(error_responses.emailblockedsuccess.sub + referenceObject.incidentID)


            session.endDialog();
            //  session.endConversation();
            referenceObject.resolution = "";
            referenceObject.sapTabCause = "User Error";
            referenceObject.sapTabResolution = "User not authorised for the process";

            //logging and resolveIncident now wrapped in one function
            //logAndResolve(session.batch, session.message, referenceObject);
            //confirmResolution(session,referenceObject);
            logAndUpdate(session.batch, session.message, referenceObject);

          }
        } else {
          console.log(error);
          noServerResponse(session);

        };
      }
    )

  })
  .catch(function(err) {
    console.log(err);
  });
},function(session,results){
  session.endDialog();
}
]);

intent.matches('intent.useremailnotblocked', [
  function(session, args) {
    session.sendTyping();
    setTicketData(session, userDetails, "Incident",summary.error.useremailnotblocked,"User Service Restoration");
    remedy.createTicket(data)
    .then(function(referenceObject) {
      ticketjson.ticketnumber_email=referenceObject;
      console.log(ticketjson.ticketnumber_email);
      if (args.entities.length == 0) {
        console.log(args.entities);
        session.dialogData.num = '';
        session.beginDialog('/personnelnumber', session.dialogData.num);
        session.dialogData.num;
        // logger.log(session.batch, session.message, false, false, ticketjson.ticketnumber_email);
        //logger.endDialog();
      } else {
        session.dialogData.num = args.entities[0].entity;
      }

    })
    .catch(function(err) {
      session.send(err);
    });
  }
]);

//console.log(json1.ticketnumber);
bot.dialog('/personnelnumber', [
  function(session, args, next) {
    console.log(args);
    if (args == "") {

      console.log(session.dialogData.num)
      session.beginDialog('/askpersonnelnumber', session.dialogData.num);
    } else {
      next(args);
    }
  },
  function(session, args, next) {
    session.endDialog();
  }
]);
var n;
bot.dialog('/askpersonnelnumber', [
  function(session, args) {
    builder.Prompts.text(session, "Can you please provide me his/her Email Address?");
    logger.log(session.batch, session.message, false, false,false, ticketjson.ticketnumber_email);
    //logger.endDialog();
  },
  function(session, args, results) {

    session.dialogData.num = args.response;
    console.log(args.response);
    session.send(error_responses.emailnotblocked);
    session.delay(3000);
    // logger.log(session.batch, session.message, false, false,ticketjson.ticketnumber_email);
    request({
      method: 'GET',
      uri: config.validator + '/irwin/validator?object=blocking&user='+args.response
    },
    function(error, res, body) {
      if (res.statusCode==200) {

        console.log(JSON.parse(res.body).reason);
        if (JSON.parse(res.body).reason == "Company Not Existent") {
          session.send(error_responses.companynotexistent.main);
          session.delay(3000);
          session.endDialog(error_responses.companynotexistent.sub+error_responses.companynotexistent.links);

          ticketjson.ticketnumber_email.resolution = "User’s company not included in Email Blocking Setup. Advised user to submit request to the Vantage Email Blocking Request Form and provided Learning Center link"+error_responses.companynotexistent.links;
          ticketjson.ticketnumber_email.sapTabCause = "User Error";
          ticketjson.ticketnumber_email.sapTabResolution = "User advised with procedure - NAR";

          //logging and resolveIncident now wrapped in one function
          //logAndResolve(session.batch, session.message, ticketjson.ticketnumber_email);
          confirmResolution(session,ticketjson.ticketnumber_email);


        } else if (JSON.parse(res.body).reason == "Time Sheets Required") {
          session.send(error_responses.timesheetsrequired.main);
          session.delay(3000);
          session.endDialog(error_responses.timesheetsrequired.sub+error_responses.timesheetsrequired.links);

          ticketjson.ticketnumber_email.resolution = "Required to submit time in time sheet’ is not checked and hence user not included in Email Blocking. User advised to reach out to local admin for changes within PA20."+error_responses.timesheetsrequired.links;
          ticketjson.ticketnumber_email.sapTabCause = "User Error";
          ticketjson.ticketnumber_email.sapTabResolution = "User advised with procedure - NAR";

          //logging and resolveIncident now wrapped in one function
          //logAndResolve(session.batch, session.message, ticketjson.ticketnumber_email);
          confirmResolution(session,ticketjson.ticketnumber_email);


        } else if (JSON.parse(res.body).status == "success") {
          session.send(error_responses.emailnotblockedsuccess.main);
          session.delay(3000);
          console.log(JSON.stringify(ticketjson.ticketnumber_email.incidentID));
          session.endDialog(error_responses.emailnotblockedsuccess.sub  + JSON.stringify(ticketjson.ticketnumber_email.incidentID));

          ticketjson.ticketnumber_email.resolution = "";
          ticketjson.ticketnumber_email.sapTabCause = "User Error";
          ticketjson.ticketnumber_email.sapTabResolution = "User not authorised for the process";

          //logging and resolveIncident now wrapped in one function
          //logAndResolve(session.batch, session.message, ticketjson.ticketnumber_email);
          //confirmResolution(session,ticketjson.ticketnumber_email);
          logAndUpdate(session.batch, session.message,ticketjson.ticketnumber_email );

        } else {
          session.endDialog("The Job Number is perfectly valid");
          //logAndResolve(session.batch, session.message,ticketjson.ticketnumber_activity);
          confirmResolution(session,ticketjson.ticketnumber_email);
        }

      } else {
        console.log(error);
        noServerResponse(session);


      };
    }
  )


},function(session,results){
  session.endDialog();
}

]);
intent.matches('intent.increasecolrowfiori', [
  function(session, args) {
    session.sendTyping();
    setTicketData(session, userDetails, "Incident",summary.error.increasecolrowfiori,"User Service Restoration");
    //Create Ticket Function
    remedy.createTicket(data)
    .then(function(referenceObject) {
      session.send(error_responses.increasecolrowfiori.main);
      session.delay(3000);
      session.send(error_responses.increasecolrowfiori.sub+error_responses.increasecolrowfiori.links);

      referenceObject.resolution = "User advised that this is not part of the functionality of the Fiori Mobile App"+error_responses.increasecolrowfiori.links;
      referenceObject.sapTabCause = "User Error";
      referenceObject.sapTabResolution = "User advised with procedure - NAR";

      //logging and resolveIncident now wrapped in one function
      //logAndResolve(session.batch, session.message, referenceObject);
      confirmResolution(session,referenceObject);

    })
    .catch(function(err) {
      session.send(err);
    });
  },function(session,results){
    session.endDialog();
  }
]);

intent.matches('intent.help', [
  function(session, args) {
    session.sendTyping();
    var cards = getCardsAttachments();
    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(session)
    .text(misc_responses.help)
    .attachmentLayout(builder.AttachmentLayout.list)
    .attachments(cards);
    session.send(reply);
    logger.log(session.batch, session.message, false, false,"", "");
    logger.endDialog();

  }
]);

intent.matches('intent.thankyou', [
  function(session, args) {
	  console.log("Inside thank you")
    session.sendTyping();
    var b = misc_responses.thankyou;
    var msg = new builder.Message(session)
    .text(b[Math.round(Math.random() * 1)])
    session.send(msg);
    /* logger.log(session.batch, session.message, true, false,"", "");
    logger.endDialog(); */
  }

]);


intent.matches('intent.nevermind', [
  function(session, args) {
    session.sendTyping();
    var a = misc_responses.nevermind;
    var msg = new builder.Message(session)
    .text(a[Math.round(Math.random() * 1)])
    session.send(msg);
    logger.log(session.batch, session.message, true, false,"", "");
    logger.endDialog();
  }
]);

function setTicketData(session, userDetails, caseType, summary,servicetype) {
	console.log("inside set ticket function");

  data.myID_000010902.Detailed_Decription = session.message.text;
  data["myID_000010902"]["Case Type"] = caseType;
  data["myID_000010902"]["Description"] = summary;
  data["myID_000010902"]["Login_ID"] = userDetails.userEmail;
  data["myID_000010902"]["Site"] = userDetails.site;
  data["myID_000010902"]["Site Group"] = userDetails.siteGroup;
  data["myID_000010902"]["Platform"] = userDetails.platform;
  data["myID_000010902"]["Service_Type"] = servicetype;

  console.log(data["myID_000010902"]);
};
function noServerResponse(session){
    console.log(session);
    session.send("I am sorry, but I am having trouble contacting the back end server for the required information. Please refresh the page and try again, or try again after sometime.")
}
function logAndResolve(session_batch, session_message, referenceObject){
  //console.log("inside log and resolve function");
  logger.log(session_batch, session_message, true, false,true, referenceObject).then((currentLogState)=>{
    remedy.resolveIncident(referenceObject, session_batch, currentLogState);
  }).catch(()=>{
    remedy.resolveIncident(referenceObject, session_batch, false);
  });
  logger.endDialog();
};

function logAndUpdate(session_batch, session_message, referenceObject){
  logger.log(session_batch, session_message, true, false,false, referenceObject).then((currentLogState)=>{
    remedy.updateIncident(referenceObject, session_batch, currentLogState);
  }).catch(()=>{
    remedy.resolveIncident(referenceObject, session_batch, false);
  });
  logger.endDialog();
}


intent.onDefault((session) => {
  session.sendTyping();
  session.send(misc_responses.default);
  logger.endDialog();
});

bot.dialog('/', intent);


/* if (useEmulator) {
  var restify = require('restify');
  var server = restify.createServer();
  server.listen(3978, function() {
    console.log('test bot endpont at http://localhost:3978/api/messages');
  });
  server.post('/api/messages', connector.listen());
}else {
  var listener = connector.listen();
  var withLogging = function(context, req) {
    console.log = context.log;
    listener(context, req);
  }
  module.exports = { default: withLogging }
} */


/*
else {
module.exports = {
default: connector.listen()
}
}
*/
