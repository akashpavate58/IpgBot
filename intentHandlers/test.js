var DocumentClient = require('documentdb').DocumentClient;
module.exports = function (context, req) {
  var host = "https://ipgtestdb.documents.azure.com:443/";
  var masterKey = "rMlSBiUFvD7JAWQHoKlcG5jNtRh7M2dKGS4AlZAfSpQ307l7wT1VROj3F4xr5vTezYlyDtFuNhTPLDVgF9V0yg==";
  var client = new DocumentClient(host, {masterKey: masterKey});
  var databaseDefinition = { id: "IPG" };
  var collectionDefinition = { id: "dialog collection" };
  var HttpStatusCodes = { NOTFOUND: 404 };
  var databaseUrl=`dbs/${databaseDefinition.id}`;
  var collectionUrl=`${databaseUrl}/colls/${collectionDefinition.id}`;
  var changedData;
  //if document is present then..
  if(req.body){
    var bodyMessages = req.body.messages;
    var indexofLastMessage = bodyMessages.length - 1;
    var documentDefinition = {
      id:req.body.dialogID,
      content:req.body.messages,
      hasEnded:req.body.messages[indexofLastMessage].hasEnded,
      isAbandoned:req.body.messages[indexofLastMessage].isAbandoned,
      incidentID:req.body.messages[indexofLastMessage].incidentid,
      entryID:req.body.messages[indexofLastMessage].entryID,
      conversationID: req.body.conversationID,
      userID: req.body.userID,
      lastUpdated: new Date()
    };

    function getDatabase(){
      return new Promise(function(resolve,reject) {
        client.readDatabase(databaseUrl, function(err,result) {
          if(err){
            context.log("Cannot find the database");
            if (err.code == HttpStatusCodes.NOTFOUND) {
              context.log("Database not found.");
              reject(err);
            }
            reject(err);
          }else{
            context.log("DB found. Accessing..");
            resolve(result);
          }
        });
      });
    };

    function getCollection(){
      context.log('Getting collection: '+ collectionDefinition.id);
      return new Promise(function(resolve,reject) {
        client.readCollection(collectionUrl, function(err,result) {
          if (err) {
            context.log("Collection Not Found. Creating New with name: " + collectionDefinition.id);
            if (err.code == HttpStatusCodes.NOTFOUND) {
              client.createCollection(databaseUrl, collectionDefinition, { offerThroughput: 400 }, function(err,created) {
                if (err) reject(err);
                else {
                  context.log(created._self)
                  resolve(created);
                }
              });
            } else {
              reject(err);
            }
          }else {
            context.log("Collection Found, Proceeding..");
            resolve(result);
          }
        });
      });
    };

    function createDocument(document){
      let documentUrl = `${collectionUrl}/docs/${document.id}`;
      return new Promise(function(resolve,reject) {
        client.readDocument(documentUrl, (err, result) => {
          context.log( 'Trying to find document: ' + documentUrl);
          if(err){
            if (err.code == HttpStatusCodes.NOTFOUND) {
              client.createDocument(collectionUrl, document, (err, created) => {
                context.log("Document not found. Created New.");
                if (err) {
                  reject(err)
                }else {
                  resolve(created);
                }
              });
            }else{
              reject(err);
            }
          }else{
            context.log("Document " +document.id+" already present. Updating..");
            result.content = result.content.concat(document.content);
            result.hasEnded = document.hasEnded;
            result.isAbandoned = document.isAbandoned;
            result.incidentID = document.incidentID;
            result.entryID = document.entryID;
            client.replaceDocument(documentUrl, result, function (err, updated, headers) {
              context.log(updated);
              resolve(updated);
            });
          };
        });
      });
    };

    function returnUpdatedDocument(updatedDoc){
      context.log("Updated doc");
      context.log(updatedDoc);

    }

    getDatabase()
    .then(() => getCollection())
    .then(() => createDocument(documentDefinition))
    .then(function(updatedDoc){
      context.res = {
      body: updatedDoc
    };
    context.done();
    })
    .catch((error) => { exit(`Completed with error ${JSON.stringify(error)}`) });



  }else
  {
    context.res = {
      status: 400,
      body: "Dialog not present. Try calling the function from inside the bot."
    };
    context.done();
  }


};
