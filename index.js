var express = require('express');
var bodyParser = require('body-parser')
var jsonfile = require('jsonfile')
var morgan = require('morgan')
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

var mdb_url = "mongodb://localhost:27017/IT2901";
var indexer_url = "http://localhost:8001";

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use( bodyParser.json() );
app.use(morgan('dev'));

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.post("/save_article", function (req, res) {	
	try {
		MongoClient.connect(mdb_url, function(err, db) {
			assert.equal(null, err);
			db.collection("publishing").insertOne(req.body, function(err, result) {
				assert.equal(err, null);
				
				request.post(indexer_url, {task : "publishedArticle" , articleID : result.insertedId.toHexString()}, function(err,httpResponse,body) {
					if (err != null) {
						console.log("Could not update indexer.");
						console.log(err.message);
					}
				});
			});
		});
		
		res.sendStatus(204);
		success = true;
	}
	
	catch (err) {
		res.sendStatus(500);
		console.log(err.message);
	}
});

app.get("/list", function (req, res) {
	try {
		MongoClient.connect(mdb_url, function(err, db) {
			assert.equal(null, err);
			var art_list = db.collection('publishing').find().toArray(function(err, documents) {
				var art_list = [];
				for (i = 0; i < documents.length; i++) {
					art_list.push({id:documents[i]._id.toHexString(), title:documents[i].title, description:documents[i].description});
				}
				db.close();
				
				list_response = {list: art_list};
				res.send(JSON.stringify(list_response));
			});
		});
	}
		
	catch (err) {
		res.sendStatus(500);
		console.log(err.message);
	}
});

app.get("/article/*", function (req, res) {
	try {
		var article_name = req.url.substr(-24);
		var new_id = new ObjectId(article_name);
		
		MongoClient.connect(mdb_url, function(err, db) {
			assert.equal(null, err);	
			db.collection('publishing').findOne({"_id":new_id}, function(err, doc){
				article_start = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>";
				article_mid = "</title></head><body>";
				article_end = "</body></html>";
				res.send(article_start+doc.title+article_mid+doc.article+article_end);
			});
		
		});
	}
		
	catch (err) {
		res.sendStatus(500);
		console.log(err.message);
	}
});

app.options("/article_json/*", function (req, res) {
	try {
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
		res.sendStatus(204);
	}
		
	catch (err) {
		res.sendStatus(500);
		console.log(err.message);
	}
});

app.get("/article_json/*", function (req, res) {
	try {
		var article_name = req.url.substr(-24);
		var new_id = new ObjectId(article_name);
		
		MongoClient.connect(mdb_url, function(err, db) {
			assert.equal(null, err);	
			db.collection('publishing').findOne({"_id":new_id}, function(err, doc){
				res.send(JSON.stringify(doc));
			});
		
		});
	}
		
	catch (err) {
		res.sendStatus(500);
		console.log(err.message);
	}
});

app.delete("/article_json/*", function (req, res) {  
	try {
		var article_name = req.url.substr(-24);
		var new_id = new ObjectId(article_name);
		
		MongoClient.connect(mdb_url, function(err, db) {
			assert.equal(null, err);
			db.collection('publishing').remove({"_id":new_id});
			
			request.post(indexer_url, {task : "removedArticle" , articleID : article_name}, function(err,httpResponse,body) {
				if (err != null) {
					console.log("Could not update indexer.");
					console.log(err.message);
				}
			});
		});
		
		res.sendStatus(204);
	}
		
	catch (err) {
		res.sendStatus(500);
		console.log(err.message);
	}
});

app.listen(3000, function () {
	console.log("Publishing app listening on port 3000!");
});