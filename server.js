//Initiallising Global variables and node modules
var express = require("express");
var mysql = require('mysql');
var bodyParser = require("body-parser");
//Getting Application Configuration
var appConfig = require('./data/config.json');
var app = express();

//http://expressjs.com/en/guide/using-middleware.html
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(function(req, res, next) {
	//http://enable-cors.org/server_expressjs.html
	//Enabling CORS
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, contentType,Content-Type, Accept, Authorization");
	//User Authentication -Starts
	var response = {};
	try { 
		 //Validating AuthToken
		 if (req.path.match('authentication') || (null != _authToken && req.headers.authorization && req.headers.authorization == _authToken)) {
			 //Executing next call back function
			 next();
		 }
		 else {
			 response.Success = false;
			 response.Message = "UnAuthorised User";
			 res.send(response);
		 }
	}
	catch (e) {
		 response.Success = false;
		 response.Message = appConfig.recordReterived_Failed_Message;
		 response.ErrorDetails = e;
		 console.log("Exception: " + e);
		 res.send(response);
	}
	//User Authentication -Ends
});

//Error-handling middleware
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

//Setting up server
var server = app.listen(process.env.PORT || appConfig.port, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
 });

//To hold response object
var _response = {};
//To hold request object
var _request = {};
//To Store AuthToken
const _authToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2IjowLCJpYXQiOjE0ODA2NjE0NDEsImQiOnsidWlkIjoiMTA4IiwiRmlyc3ROYW1lIjoiV';

//http://expressjs.com/en/guide/database-integration.html
//Initiallising my sql connection string -Starts
 // var connection = mysql.createConnection({
     // host: appConfig.dbHost,
     // user: appConfig.dbUserName,
     // password: appConfig.dbPassword,
     // database: appConfig.dbName
 // });
 
 //http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
 var db_config = {
	host: appConfig.dbHost,
    user: appConfig.dbUserName,
    password: appConfig.dbPassword,
    database: appConfig.dbName
};

var connection;
function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();
//Initiallising my sql connection string -Ends

 var initApp = function (req, res, next) {
     _response = {};
     _request = {};
     //_authToken = null;
     next();
 }

//Function to form insert query based on request body parameters
 var saveQuery = function (request) {
     console.log('Inside saveQuery()');
     var response = {};
     response.query = "insert into "+ request.params.table + "( ";
     var i = 0;
     //setting columns names needs for inserting into given table
     for (var data in request.body) {
         i++;
         response.query = response.query + data + ((Object.keys(request.body).length == i) ? '  ' : ' , ');
     }
     response.query = response.query + ' ) values ( ';
     i = 0;
     //setting values for each columns
     for (var data in request.body) {
         i++;
         response.query = response.query + '"' + request.body[data] + '"' + ((Object.keys(request.body).length == i) ? '  ' : ' , ');
     }

     response.query = response.query + ' )';
     return response;
 }

//Function to form update query based on request body parameters
 var updateQuery = function (request) {
     console.log('Inside updateQuery()');
     try{
         var response = {};
         response.query = "UPDATE " + request.params.table + " SET ";
         var i = 0;
         for (var data in request.body) {
             i++;
             response.query = response.query + data + ' = ' + '"' + request.body[data] + '"' + ((Object.keys(request.body).length == i) ? '  ' : ' , ');
         }
         response.query = response.query + ' WHERE Id=' + request.params.id;
         return response;
     }
     catch (e) {
         response.Success = false;
         response.Message = appConfig.recordReterived_Failed_Message;
         response.ErrorDetails = e;
         console.log("Exception: " + e);
     }   
 }

//Function to form SQL Query
 var createQuery = function (request) {
     console.log('Inside createQuery()' + JSON.stringify(request));
     var response = {};
     try {       
         if (request.method == 'GET') {
             response.query = 'SELECT * FROM ' + request.params.table;
             if (request.params.id) {
                 response.query = response.query + ' WHERE Id = ' + request.params.id;
             }
         }
         else if (request.method == 'POST') {
             if (request.apiUrl.match('authentication')) {
                 response.query = 'SELECT * FROM USER WHERE Email = ' + '"' + request.body.userName + '"' + ' AND Password = ' + '"' + request.body.password + '"';
             }
             else {
                 response.query = saveQuery(request).query;
             }
         }
         else if (request.method == 'PUT') {
             response.query = updateQuery(request).query;
         }
         else if (request.method == 'DELETE') {
             response.query = 'DELETE FROM ' + request.params.table + ' WHERE Id = ' + request.params.id;
         }
         return response;
     }
     catch (e) {
         response.Success = false;
         response.Message = appConfig.recordReterived_Failed_Message;
         response.ErrorDetails = e;
         console.log("Exception: " + e);
     }   
 }

//Function to Authorize user
 var authorization = function (req, res, next) {
     console.log('Inside authorization()');
     var response = {};
     try { 
         if (null != _authToken && req.headers.authorization && req.headers.authorization == _authToken) {
             //Executing next call back function
             next();
         }
         else {
             response.Success = false;
             response.Message = "UnAuthorised User";
             res.send(response);
         }
     }
     catch (e) {
         response.Success = false;
         response.Message = appConfig.recordReterived_Failed_Message;
         response.ErrorDetails = e;
         console.log("Exception: " + e);
         res.send(response);
     }
 }

//Function to make DB call
 var databaseQuery = function (req, res, next) {
     var response = {};
     var request = {};
     console.log('Inside databaseQuery()');
     try{
         //Forming request object     
         request.apiUrl = req.path;
         request.params = req.params;
         request.body = req.body;
         request.method = req.method;
         request.header = req.headers;
         //Getting Query to be executed
         var query = createQuery(request).query;
         console.log(query);
         //Querying DB 
         connection.query(query, function (err, rows, fields) {
             if (err) {
                 console.log('Error');
                 response.Success = false;
                 response.Message = appConfig.recordReterived_Failed_Message;
                 response.ErrorDetails = err;
             }
             else {
                 console.log('Success');
                 response.Success = true;
                 response.Message = appConfig.recordReterived_Success_Message;
                 response.Records = rows;
             }
             _response = response;
             next();
         });
     }
     catch (e) {
         response.Success = false;
         response.Message = appConfig.recordReterived_Failed_Message;
         response.ErrorDetails = e;
         console.log("Exception: " + e);
         res.send(response);
     }     
 }


//Function to handle api response
 var responseHandler = function (req, res, next) {
     console.log('Inside responseHandler()');
     var response = {};
     try {
         if (_response.Success) {
             if (req.path.match('authentication') && _response.Records.length!=0) {
                 //_authToken = _response.Records[0].Code;
                 _response.AuthToken = _authToken;
             }
			 if (req.path.match('authentication') && _response.Records.length==0) {
                 //_authToken = _response.Records[0].Code;
                 _response.Message = "Invalid UserName or Password";
             }
             if ((req.path.match('user') || req.path.match('authentication')) && _response.Records.length) {
                 for (var i = 0; i < _response.Records.length; i++) {
                     delete _response.Records[i].Password;
                 }
             }
         }        
         res.send(_response);
     }
     catch (e) {
         response.Success = false;
         response.Message = appConfig.recordReterived_Failed_Message;
         response.ErrorDetails = e;
         console.log("Exception: " + e);
         res.send(_response);
     }
 }


//Routing Starts
//https://expressjs.com/en/guide/routing.html

//Generic APIs - Starts

//Generic API to do GetAll operation of any table -- GETALL
 app.get("/api/:table", [databaseQuery, responseHandler]);

//Generic API to do GetById operation of any table --GETBYID
 app.get("/api/:table/:id", [databaseQuery, responseHandler]);

 //Generic API to do Save operation of any table --SAVE
 app.post("/api/:table", [databaseQuery, responseHandler]);

 //Generic API to do Update operation of any table --UPDATE
 app.put("/api/:table/:id", [databaseQuery, responseHandler]);

//Generic API to do Hard Delete operation of any table by Id --DELETE
 app.delete("/api/:table/:id", [databaseQuery, responseHandler]);

//Generic APIs - Ends

//Authentication api
 app.post("/api/account/authentication", [initApp, databaseQuery, responseHandler]);

 // define the home page route, running index.html when server runs
 app.get('/', function (req, res) {
     res.sendFile('/index.html');
 })