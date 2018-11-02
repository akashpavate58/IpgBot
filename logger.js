var request=require('request');
var dialogStack = [];
var payload, conversationID, dialogID;

exports.log = function (botStack,userMessage,hasEnded,isAbandoned,isResolved, ticketReferenceObject) {
  if(!hasEnded){
    hasEnded = false;
  };
  if(!isAbandoned){
    isAbandoned = false;
  };

  if(!ticketReferenceObject){
    var ticketReferenceObject = {};
    ticketReferenceObject.entryID = false;
    ticketReferenceObject.incidentID = false;
    ticketReferenceObject.ticketNumber = false;
  }


  if (!dialogID && !conversationID){
	  // console.log(botStack);
    dialogID = generateDialogID(botStack[0].address.conversation.id);
    conversationID = botStack[0].address.conversation.id
  }
  if(userMessage){
    standardize(userMessage, hasEnded, isAbandoned,isResolved,ticketReferenceObject);
    dialogStack.push(userMessage);
  }
  exports.parseStack(botStack, hasEnded, isAbandoned,isResolved,ticketReferenceObject);
  // stringifyDialog(botStack, userMessage);
  return new Promise(function(fulfill, reject){
    exports.logRemote(generatePayload(ticketReferenceObject)).then((currentLogState) => {
      var stringLogState = logStateParser(currentLogState);
      if(currentLogState.incidentID){
        // exports.logRemedyWorkLog(currentLogState.incidentID, stringLogState);
      }else if (currentLogState.incidentID == "0") {
        reject("Logging failed");
      }
      fulfill(stringLogState);
    });
  })

}; //exports.log ends

exports.parseStack = function(botStack, hasEnded, isAbandoned,isResolved,ticketReferenceObject){
  botStack.forEach(function(message){
    standardize(message, hasEnded, isAbandoned,isResolved,ticketReferenceObject);
    dialogStack.push(message);
  });
};

exports.endDialog = function () {
  dialogID = false;
  conversationID = false;
};




exports.logRemote = function (payload) {
  var requestPayload = {
    url: 'https://ipgbottestapp.azurewebsites.net/api/HttpTrigger1?code=1s4NqlisCLEB79uZ2tqGHsyxXYNNtg0aZu0m7B5EVPHAIpS/6mesYQ==',
    //url:'http://localhst:3000/azurefn',
	method: 'POST',
    headers: {
      'Accept':'application/json',
      'Content-Type': 'application/json'
    },
    json: payload
  };
  console.log("Contacting azure log function..");
  return new Promise(function(fulfill, reject){
    request.post(requestPayload, function (err,response, body) {
			
      if (!err || response.body.statusCode != 500) {
        fulfill(response.body);
      } else {
        console.log("Azure function error: "+ err.message + " | Status code: "+err.statusCode);
        reject("Azure function error: "+ err.message + " | Status code: "+err.statusCode);
      }
      dialogStack = [];
      payload = {};
    });
  });
};

exports.logRemedyWorkLog = function (incidentID, detailedDesc) {
  var payload = {
    method: 'PUT',
    headers: {
      'Accept':'application/json',
      'Content-Type': 'application/json'
    },
    body:{
      "myID_000010902": {
        "1000000170":"Chat",
        "1000001476": "Yes",
        "1000000761": "Internal",
        "1000000655": "Other",
        "7":"Enabled",
        "1000000161":"",
        "8":"Chatbot Conversation Log",
        "1000000151":""
      }
    },
    uri: "https://ipgcloud.apimanagement.us1.hana.ondemand.com/v1/RemedyV8/HPD:WorkLog"
  }

  payload.body["myID_000010902"]["1000000161"] = incidentID;
  payload.body["myID_000010902"]["1000000151"] = detailedDesc;
  payload.body = JSON.stringify(payload.body);

  request.post(payload, function (err,response) {
    console.log(response.body);
  });

};


function standardize(message,hasEnded,isAbandoned,isResolved,ticketReferenceObject){
  message.conversationID = message.address.conversation.id;
  message.dialogID = dialogID;
  message.hasEnded= hasEnded;
  message.isAbandoned= isAbandoned;
   message.isResolved= isResolved;

  message.entryID = ticketReferenceObject.entryID;
  message.incidentid = ticketReferenceObject.incidentID;


  return new Promise(function(fulfill, reject){
    if (message.conversationID && message.dialogID) {
      fulfill(message);
    } else {
      reject(message);
    }
  });
};

function generatePayload(ticketReferenceObject){
  return {
    "userID" : dialogStack[0].address.user.id,
    "conversationID": conversationID,
    "dialogID" : dialogID,
    "messages" : dialogStack
  }
};

function generateDialogID(conversationID){
  return conversationID + new Date().getTime();
};

function logStateParser(logState){
  if(logState){
    var detailedDesc = "";
    logState.content.forEach(function(message){
      if(message.type == 'message'){
        if(message.user){
          detailedDesc += 'User: ' + message.text + " | ";
        }else{
          detailedDesc += 'Bot: ' + message.text + " | ";
        }
      }
    });
    return detailedDesc;
  }else{
    return "Log failed. Records not maintained for this conversation."
  }
}

function stringifyDialog(botStack, userMessage){
  // console.log("========stack========");
  // console.log(JSON.stringify(botStack, null, "\t"));
  // console.log("========UM========");
  // console.log(userMessage);
}
