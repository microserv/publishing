var express = require('express');
var bodyParser = require('body-parser')
var jsonfile = require('jsonfile')
var morgan = require('morgan')
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/IT2901';

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
	//var file = "article.json";
	//jsonfile.writeFile(file, req.body, function (err) {
	//	if (err) console.error(err);
	//	else console.log("Saved data!");
	//});
  
	//console.log(req.body.article);
  
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection("publishing").insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			//console.log("Inserted a document into the publishing collection.");
		});
	});
  
	res.sendStatus(204);
});

app.get("/list", function (req, res) {
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		var art_list = db.collection('publishing').find().toArray(function(err, documents) {
			var art_list = [];
			for (i = 0; i < documents.length; i++) {
				art_list.push({id:documents[i]._id.toHexString(), title:documents[i].title});
			}
			db.close();
			
			//for (i = 0; i < art_list.length; i++) {
			//	console.log(art_list[i].id + ", " + art_list[i].title);
			//}
			
			list_response = {list: art_list};
			res.send(JSON.stringify(list_response));
		});
    });
})

app.get("/article/*", function (req, res) {
	var article_name = req.url.substr(9);
	var new_id = new ObjectId(article_name);
	
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);	
		db.collection('publishing').findOne({"_id":new_id}, function(err, doc){
			res.send(doc.article);
		});
	
	});
})

app.listen(3000, function () {
	//console.log("Publishing app listening on port 3000!");
});