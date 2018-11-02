var DocumentClient = require("documentdb").DocumentClient;
var request = require('request')
module.exports = function(context, myTimer) {
  var timeStamp = new Date().toISOString();

  if (myTimer.isPastDue) {
    context.log('JavaScript is running late!');
  }
  context.log('JavaScript timer trigger function ran!', timeStamp);

  /*
  Root Level
  id, conversationId, content, hasEnded, isAbondoned,
  1. Get all documents from DB which have where hasEnded == false -- select * from c where c.hasEnded = false
  2. For every document,
  if(currentTime - timestamp > 10 minutes && TicketNumber is present)
  make a Update HTTP Call to API and set appropriate description in the ticket.
  3. Set document.hasEnded = true, isAbandoned = true
  4. Update all documents back to the DB.

  */
  var host = "https://ipgtestdb.documents.azure.com:443/";
  var masterKey = "rMlSBiUFvD7JAWQHoKlcG5jNtRh7M2dKGS4AlZAfSpQ307l7wT1VROj3F4xr5vTezYlyDtFuNhTPLDVgF9V0yg==";
  var client = new DocumentClient(host, {
    masterKey: masterKey
  });
  var databaseDefinition = {
    id: "IPG"
  };
  var collectionDefinition = {
    id: "dialog collection"
  };
  var HttpStatusCodes = {
    NOTFOUND: 404
  };
  var databaseUrl = `dbs/${databaseDefinition.id}`;
  var collectionUrl = `${databaseUrl}/colls/${collectionDefinition.id}`
  var reqBody = {};
  var payload={
    method: 'PUT',
    headers: {
      'bearer': '',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    json: reqBody,
    uri: 'https://ipgcloud.apimanagement.us1.hana.ondemand.com/v1/RemedyV8/HPD:Help Desk/'
  }

  function getDatabase() {
    return new Promise(function(resolve, reject) {
      client.readDatabase(databaseUrl, function(err, result) {
        if (err) {

          if (err.code == HttpStatusCodes.NOTFOUND) {
            client.createDatabase(databaseDefinition, function(err, created) {
              if (err) reject(err)
              else {
                context.log(created)
                resolve(created);
              }
            });
          } else {
            reject(err);
          }
        } else {
          resolve(result);
        }
      });
    });
  }

  function getCollection() {
    context.log(`Getting collection:\n${collectionDefinition.id}\n`);
    return new Promise(function(resolve, reject) {
      client.readCollection(collectionUrl, function(err, result) {
        if (err) {
          if (err.code == HttpStatusCodes.NOTFOUND) {
            client.createCollection(databaseUrl, collectionDefinition, {
              offerThroughput: 400
            }, function(err, created) {
              if (err) reject(err)
              else {
                context.log(created._self)
                resolve(created);
              }
            });
          } else {
            reject(err);
          }
        } else {
          resolve(result);
        }
      });
    });
  }

  function queryCollection() {
    context.log(`Querying collection through index:\n${collectionUrl}`);

    return new Promise((resolve, reject) => {
      client.queryDocuments(
        collectionUrl,
        'SELECT * FROM IPG i where i.hasEnded=false'
      ).toArray((err, results) => {
        if (err) reject(err)
        else {
          for (var queryResult of results) {
            let resultString = JSON.stringify(queryResult);
            if (queryResult.incidentid != false) {
              var detailedDescription = logStateParser(queryResult);
              reqBody[queryResult.entryID] = {
                "1000000151": detailedDescription
              }
              request(payload,function(error, response, body) {
                if (response) {
                  //update remedy workLog
                  logRemedyWorkLog(queryResult.incidentID, detailedDescription);
                  context.log(queryResult.id)
                  let documentUrl = `${collectionUrl}/docs/${queryResult.id}`;
                  queryResult.hasEnded = true;
                  queryResult.isAbandoned = true;
                  client.replaceDocument(documentUrl, queryResult, (err, result) => {
                    if (err) context.log(err);
                    else {
                      context.log(result);
                    }
                  });
                } else
                context.log(error);
              }
            )
          } else {
            context.log("ticket id is null");
          }

        }
        context.log();
        resolve(results);
      }
    });
  });
};
getDatabase()
.then(() => getCollection())
.then(() => queryCollection())
context.done();

//helpers
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
};

function logRemedyWorkLog (incidentID, detailedDesc) {
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

};
