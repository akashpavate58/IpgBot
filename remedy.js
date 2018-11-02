var request=require('request');
var config = require('./config.json');
var fs=require('fs');
var payload1=require('./payload.json');
var logger = require("./logger.js");


function getToken(){
  var getReqPayload = {
    url: config.url.TokenURL,
    method: 'POST',
    auth: {
      user: config.user,
      pass: config.pass
    },
    form: {
      'grant_type': 'client_credentials'
    }
  };
  return new Promise(function(fulfill, reject){
    request.post(getReqPayload, function (err, response, body) {
      if (!err) {
        fulfill(JSON.parse(body).access_token);
      } else {
        reject(err);
      }
    });

  })
}


module.exports.createTicket=function(data){
  return new Promise(function(fulfill, reject){
    var getReqPayload = {
      url: config.url.ticketURL,
      method: 'POST',
      headers: {
        'bearer':'',
        'Accept':'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
    request.post(getReqPayload, function (err,response) {
      if (!err && response.statusCode == 200 && response.body) {
        var reqNumber = JSON.parse(response.body).myID_000010902;
        module.exports.GetTicket(reqNumber).then(function(incidentNumber){
          module.exports.GetIncident(incidentNumber).then(function(referenceObject){
            referenceObject.ticketNumber = JSON.parse(response.body).myID_000010902;
            console.log("========Ticket Created. Related Data:========");
            console.log(referenceObject);
            fulfill(referenceObject);
          }).catch(function(error){//catch if getIncident() fails
            reject(error);
          })
        }).catch(function(error){//catch if getTicket() fails
          reject(error);
        })

      } else {
        reject("**Remedy ticket creation failed.** \n\n In order to keep track of the help requests, I create a ticket for each request. In this case, creation of such help desk ticket has failed. It is possible that your email address is not recognised by Remedy. Please try again with the different email address or contact the Help Desk.")
      }
    });
  });
};

module.exports.GetTicket=function(data){
  return new Promise(function(fulfill, reject){
    request({
      method: 'GET',
      uri: config.url.ticketURL + "'Request ID'="+data
    },
    function (error, response, body) {
      if(!error && response.statusCode == 200 && JSON.parse(body)[data]){
        // console.log("Inside the GET Ticket")
        //returns incident number
        //console.log(JSON.parse(body));
        fulfill(JSON.parse(body)[data]['Incident Number']);
      }else{
        reject("**Remedy ticket creation failed.** \n\n In order to keep track of the help requests, I create a ticket for each request. In this case, creation of such help desk ticket has failed. It is possible that either - your email address is not recognised by Remedy, or you do not have a valid site field set. Please try again with the different email address and an appropriate site field or contact the Help Desk."); //needs better error handling
      }
    }
  )

});

}
module.exports.GetIncident=function(data){
  var sample=JSON.stringify(data);
  return new Promise(function(fulfill, reject){
    request(
      { method: 'GET',
      uri: config.url.incidentURL + "'Incident Number'="+sample
    },
    function (error, response, body) {
      if(!error && response.statusCode == 200){
        body  = JSON.parse(body)
        var entryID = Object.keys(body)[0];
        fulfill({
          "entryID" : entryID,
          "incidentID" : body[entryID]["Incident Number"]
        });
      }else{
        console.log("Could not get Incident. Possible error: " + error);
        reject("Could not get Incident.");
      };
    }
  )

});
};

exports.updateTicket = function (referenceObject, messageString, detailedDesc) {
  //update the ticket. Tag as assigned
  var entryID = referenceObject.entryID;
  var payload = {
    method: 'PUT',
    headers: {
      'Accept':'application/json',
      'Content-Type': 'application/json'
    },
    body:{    },
    uri: config.url.incidentURL
  }
  // console.log(referenceObject.sapTabCause +" | "+ referenceObject.sapTabResolution);
  payload.body[entryID] = payload1.updateTicket_payload
  payload.body[entryID].Resolution = referenceObject.resolution;
  payload.body[entryID]["Detailed Decription"] = detailedDesc;
  payload.body[entryID]["SAPTab-Cause"] = referenceObject.sapTabCause;

  // console.log(JSON.stringify(payload.body, null, "\t"));
  payload.body = JSON.stringify(payload.body);
  console.log(payload.body[entryID]);

  return new Promise(function(fulfill, reject){
    request(payload,function(error, response, body){
      body = JSON.parse(body);
      if(!error && response.statusCode == 200 && body[entryID] == 'success'){
        fulfill(body);
      }else{
        console.log("Error updating the incident.");
        console.log(body);
        reject(error);
      }
    });
  });
};

exports.closeTicket = function (referenceObject, messageString, detailedDesc) {
  //close the ticket. Tag as resolved.
  var entryID = referenceObject.entryID;
  var payload = {
    method: 'PUT',
    headers: {
      'Accept':'application/json',
      'Content-Type': 'application/json'
    },
    body:{    },
    uri: config.url.incidentURL
  }
  // console.log(referenceObject.sapTabCause +" | "+ referenceObject.sapTabResolution);
  payload.body[entryID] = payload1.closeticket_payload
  payload.body[entryID].Resolution = referenceObject.resolution;
  payload.body[entryID]["Detailed Decription"] = detailedDesc;
  payload.body[entryID]["SAPTab-Cause"] = referenceObject.sapTabCause;
  payload.body[entryID]["SAPTab-Resolution"] = referenceObject.sapTabResolution;

  // console.log(JSON.stringify(payload.body, null, "\t"));
  payload.body = JSON.stringify(payload.body);

  return new Promise(function(fulfill, reject){
    request(payload,function(error, response, body){
      body = JSON.parse(body);
      if(!error && response.statusCode == 200 && body[entryID] == 'success'){
        fulfill(body);
      }else{
        console.log("Error closing the incident.");
        console.log(body);
        reject(error);
      }
    });
  });
};

/*
i have a request
want to change the time approver
*/

exports.resolveIncident = function (referenceObject, batch, detailedDesc) {
  //Called when ticket is Closed
  // var detailedDesc = logStateParser(logState);
  var messageString = batchMessageParser(batch);
  exports.closeTicket(referenceObject, messageString, detailedDesc).then(function(result){
    console.log("Ticket <" + referenceObject.ticketNumber + "> Closed with entry: " + referenceObject.entryID + " and incidentID: " + referenceObject.incidentID);
    referenceObject.message = "Ticket closed. Ticket reference number is: " + referenceObject.incidentID;
    //update the worklog
    logger.logRemedyWorkLog(referenceObject.incidentID, detailedDesc);
    return referenceObject;
  }).catch(function(error){//catch if closeTicket fails
    console.log(error);
  });

};

exports.updateIncident = function (referenceObject, batch, detailedDesc) {
  //Called when ticket is Closed
  // var detailedDesc = logStateParser(logState);
  var messageString = batchMessageParser(batch);
  exports.updateTicket(referenceObject, messageString, detailedDesc).then(function(result){
    console.log("Ticket <" + referenceObject.ticketNumber + "> updated with entry: " + referenceObject.entryID + " and incidentID: " + referenceObject.incidentID);
    referenceObject.message = "Ticket updated. Ticket reference number is: " + referenceObject.incidentID;
    //update the worklog
    logger.logRemedyWorkLog(referenceObject.incidentID, detailedDesc);
    return referenceObject;
  }).catch(function(error){//catch if closeTicket fails
    console.log(error);
  });

};


module.exports.readfile=function(data1){
  return new Promise(function(fulfill, reject){
    fs.readFile('./PA30file.txt', function (err, data) {
      if (err) throw err;
      if(data.indexOf(data1) >= 0){

        fulfill("success");

      }
      else{
        reject(err);
      }
    });
  });
}

// Helpers
function batchMessageParser(batch) {
  var messageText = "";
  batch.forEach(function(message){
    messageText += message.text;
  })
  return messageText;
};


module.exports.user=function(data){
  console.log(data);
}
