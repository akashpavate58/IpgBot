var DocumentClient = require('documentdb').DocumentClient;
var DocumentBase = require('documentdb').DocumentBase;

	var host = "https://localhost:8081/";                   
var masterKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="; 

var connectionPolicy = new DocumentBase.ConnectionPolicy(); 
  connectionPolicy.DisableSSLVerification = true; // Add the masterkey of the endpoint
var client = new DocumentClient(host, {masterKey: masterKey},connectionPolicy);
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
    var collectionUrl = `${databaseUrl}/colls/${collectionDefinition.id}`;
    var changedData;


var express=require('express');
var app= express();
var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.post('/azurefn',function (req,res){
	console.log("inside function");
    if (req.body) {
        var bodyMessages = req.body.messages;
        var indexofLastMessage = bodyMessages.length - 1;
        var documentDefinition = {
            id: req.body.dialogID,
            content: req.body.messages,
            hasEnded: req.body.messages[indexofLastMessage].hasEnded,
            isAbandoned: req.body.messages[indexofLastMessage].isAbandoned,
            incidentID: req.body.messages[indexofLastMessage].incidentid,
            entryID: req.body.messages[indexofLastMessage].entryID,
            conversationID: req.body.conversationID,
            userID: req.body.userID,
            lastUpdated: new Date()
        };

			 function getdatabase(){
			 
			
             return new Promise(function(resolve, reject) {
                client.readDatabase(databaseUrl, function(err, result) {
					console.log(result);
					console.log(err);
                    if (err) {
                        console.log("Cannot find the database");
                        if (err.code == HttpStatusCodes.NOTFOUND) {
                            console.log("Database not found.");
                            reject(err);
                        }
                        reject(err);
                    } else {
						
                        console.log("DB found. Accessing..");
                        resolve(result);
                    }
                });
            }); 
       };

        function getCollection() {
            console.log('Getting collection: ' + collectionDefinition.id);
            return new Promise(function(resolve, reject) {
                client.readCollection(collectionUrl, function(err, result) {
                    if (err) {
                        console.log("Collection Not Found. Creating New with name: " + collectionDefinition.id);
                        if (err.code == HttpStatusCodes.NOTFOUND) {
                            client.createCollection(databaseUrl, collectionDefinition, {
                                offerThroughput: 400
                            }, function(err, created) {
                                if (err) reject(err);
                                else {
                                    console.log(created._self)
                                    resolve(created);
                                }
                            });
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log("Collection Found, Proceeding..");
                        resolve(result);
                    }
                });
            });
        };

        function createDocument(document) {
            let documentUrl = `${collectionUrl}/docs/${document.id}`;
            return new Promise(function(resolve, reject) {
                client.readDocument(documentUrl, (err, result) => {
                    console.log('Trying to find document: ' + documentUrl);
                    if (err) {
                        if (err.code == HttpStatusCodes.NOTFOUND) {
                            client.createDocument(collectionUrl, document, (err, created) => {
                                console.log("Document not found. Created New.");
                                if (err) {
                                    reject(err)
                                } else {
                                    resolve(created);
                                }
                            });
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log("Document " + document.id + " already present. Updating..");
                        result.content = result.content.concat(document.content);
                        result.hasEnded = document.hasEnded;
                        result.isAbandoned = document.isAbandoned;
                        result.incidentID = document.incidentID;
                        result.entryID = document.entryID;
                        client.replaceDocument(documentUrl, result, function(err, updated, headers) {
                            console.log(updated);
                            resolve(updated);
                        });
                    };
                });
            });
        };

        function returnUpdatedDocument(updatedDoc) {
            console.log("Updated doc");
            console.log(updatedDoc);
        }
        getdatabase()
            . then(() => getCollection())
            .then(() => createDocument(documentDefinition))
            .then(function(updatedDoc) {
				var response={
				body:updatedDoc
				}
				res.send(response);
                
            })
            .catch((error) => {
				console.log(error);
				res.send(`Completed with error ${JSON.stringify(error)}`)
               // exit(`Completed with error ${JSON.stringify(error)}`)
            }); 
    } else {
		var response={
			"result":"there is a problem in the API"
		}
		
		console.log("error");
		res.send(response);
		
		
       /*  context.res = {
            status: 400,
            body: "Dialog not present. Try calling the function from inside the bot."
        };
        context.done(); */
    }
	
})
app.listen(3000,function(){
	console.log("server is running at 3000");
})

