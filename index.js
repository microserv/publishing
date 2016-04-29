var express = require('express');
var session = require('express-session')
var bodyParser = require('body-parser')
var jsonfile = require('jsonfile')
var Grant = require('grant-express')
var morgan = require('morgan')
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

var CONFIGURATION = require('./config.json')

var authUrl = CONFIGURATION.microauth._host
var mdb_url = "mongodb://localhost:27017/IT2901";
var indexer_url = "http://despina.128.no/indexer";

CONFIGURATION.microauth.key = process.env.PUBLISHING_MICROAUTH_CLIENT_ID
CONFIGURATION.microauth.secret = process.env.PUBLISHING_MICROAUTH_SECRET
var grant = new Grant(CONFIGURATION)

var app = express();
app.use(session({ secret: 'topkek' }))
app.use(grant)
app.use(bodyParser.urlencoded({ extended: true }));
app.use( bodyParser.json() );
app.use(morgan('dev'));

var REQUIRE_AUTH = {
    LIST: true,
    DETAIL: false,
    SAVE: false,
    DELETE: false
}

var REDIRECT_TO_AUTHORIZE = true;

function isCredentialExpired(oauth2) {
    return oauth2.issued_at + oauth2.expires_in < Date.now()
}

function requiresAuthentication(req) {
    var authorizationHeader = req.get('Authorization');
    if (req.session.oauth2) {
        if (!isCredentialExpired(req.session.oauth2)) {
            return false
        }
    } else if (authorizationHeader !== "" && authorizationHeader !== undefined) {
        request.get({
            uri: authUrl + 'verify/',
            headers: {'Authorization': authorizationHeader},
          },
          function (err, response, body) {
            console.log(err, body)
            if (err !== null || response.statusCode !== 200) {
                return true
            } else {
                return false
            }
          }
        )
    } else {
        return true
    }
}

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.post("/save_article", function (req, res) {
    if (REQUIRE_AUTH.SAVE) {
        if (requiresAuthentication(req)) {
            if (REDIRECT_TO_AUTHORIZE) {
                req.session.next = req.url
                res.redirect('/connect/microauth')
                return
            } else {
                res.sendStatus(401, 'You need to be authenticated to do this action.')
                return
            } 
        }
    }
	try {
		MongoClient.connect(mdb_url, function(err, db) {
			assert.equal(null, err);
			db.collection("publishing").insertOne(req.body, function(err, result) {
				assert.equal(err, null);
				var options = {
					uri: indexer_url,
					method: 'POST',
					json: {
						"task": "updatedArticle",
						"articleID": result.insertedId.toHexString()
					}
				};
				request.post(options, function(err,httpResponse,body) {
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

app.get('/done', function (req, res) {

    var err = req.query.error
    if (err) {
        res.send(JSON.stringify(err))
        return
    }

    var oauth2 = {
        access_token: req.query.raw.access_token,
        refresh_token: req.query.raw.refresh_token,
        scope: req.query.raw.scope,
        expires_in: req.query.raw.expires_in,
        token_type: req.query.raw.token_type,
        issued_at: Date.now()
    }

    req.session.oauth2 = oauth2;

    if (req.session.next) {
        res.redirect(req.session.next)
    } else {
        res.send(JSON.stringify('You have authorized Content:Publishing to use your credentials on your behalf,' +
        ' for posting content.'));
    }
})

app.get("/list", function (req, res) {
    if (REQUIRE_AUTH.LIST) {
        if (requiresAuthentication(req)) {
            if (REDIRECT_TO_AUTHORIZE) {
                req.session.next = req.url
                res.redirect('/connect/microauth')
                return
            } else {
                res.sendStatus(401, 'You need to be authenticated to do this action.')
                return
            } 
        }
    }
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

app.get("/authorize_me", function (req, res) {
  res.redirect('/connect/microauth')
  return
})

app.delete("/article_json/*", function (req, res) {  
    if (REQUIRE_AUTH.DELETE) {
        if (requiresAuthentication(req)) {
            if (REDIRECT_TO_AUTHORIZE) {
                req.session.next = req.url
                res.redirect('/connect/microauth')
                return
            } else {
                res.sendStatus(401, 'You need to be authenticated to do this action.')
                return
            } 
        }
    }
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

app.listen(33095, function () {
	console.log("Publishing app listening on port 3000!");
});
