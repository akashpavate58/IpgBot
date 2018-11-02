var DocumentClient = require("documentdb").DocumentClient;
var request=require('request')
module.exports = function (context, myTimer) {
  var timeStamp = new Date().toISOString();

  if(myTimer.isPastDue)
  {
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
  var host ="https://ipgtestdb.documents.azure.com:443/";
  var masterKey ="rMlSBiUFvD7JAWQHoKlcG5jNtRh7M2dKGS4AlZAfSpQ307l7wT1VROj3F4xr5vTezYlyDtFuNhTPLDVgF9V0yg==";
  var client = new DocumentClient(host, {masterKey: masterKey});
  var databaseDefinition = { id: "IPG" };
  var collectionDefinition = { id: "dialog collection" };
  var HttpStatusCodes = { NOTFOUND: 404 };
  var databaseUrl=`dbs/${databaseDefinition.id}`;
  var collectionUrl=`${databaseUrl}/colls/${collectionDefinition.id}`

  /**
  * Get the database by ID, or create if it doesn't exist.
  * @param {string} database - The database to get or create
  */
  function getDatabase() {
    context.log("inside function");

    return new Promise(function(resolve,reject) {
      context.log("inside promise")
      client.readDatabase(databaseUrl, function(err,result) {
        if (err) {
          context.log("err")
          if (err.code == HttpStatusCodes.NOTFOUND) {
            client.createDatabase(databaseDefinition,function(err,created) {
              if (err) reject(err)
              else {
                context.log("database else");
                context.log(created)
                resolve(created);

              }
            });
          } else {
            reject(err);
          }
        } else {
          context.log("inside else");
          context.log(result);
          resolve(result);
        }
      });
    });
  }

  function getCollection() {
    context.log(`Getting collection:\n${collectionDefinition.id}\n`);

    return new Promise(function(resolve,reject) {
      context.log("create",collectionUrl);
      client.readCollection(collectionUrl, function(err,result) {
        if (err) {
          context.log("collection err")
          if (err.code == HttpStatusCodes.NOTFOUND) {
            client.createCollection(databaseUrl, collectionDefinition, { offerThroughput: 400 }, function(err,created) {
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
          context.log("collection resolve");
          context.log("resolve",result._self);
          //json.sample=result._self;
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
          context.log(results.length);
          for (var queryResult of results) {

            let resultString = JSON.stringify(queryResult);
            if(queryResult.incidentid!=false){
              context.log(queryResult.entryID);
              context.log("ticketid  is present");
              var reqBody = {};
              reqBody[queryResult.entryID]={
                "1000000151":"I am getting an error when I am filling my Timesheet. Hi, this is Irwin, how may I help you. I am getting error with my timesheet. Irwin: Did you try refreshing the browser User: Yes, but it did not work \n--------\n can you please try again"
              }

              request({
                method: 'PUT',
                headers: {
                  'bearer':'',
                  'Accept':'application/json',
                  'Content-Type': 'application/json'
                },
                json: reqBody,
                uri:'https://ipgcloud.apimanagement.us1.hana.ondemand.com/v1/RemedyV8/HPD:Help Desk/'
              }
              ,
              function (error, response, body) {
                context.log(response.body)

                if(response)
                { context.log(response.body);
                  context.log(queryResult.id)

                  let documentUrl = `${collectionUrl}/docs/${queryResult.id}`;
                  queryResult.hasEnded=true;
                  queryResult.isAbandoned=true;


                  client.replaceDocument(documentUrl, queryResult, (err, result) => {
                    if (err) context.log(err);
                    else {
                      context.log(result);
                    }
                  });
                }
                else
                context.log(error);
              }
            )



          }
          else
          {
            // context.log(queryResult);
            context.log("ticket id is null");


          }
          // context.log(`\tQuery returned ${resultString}`);
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
};
