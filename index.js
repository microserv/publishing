var express = require('express');
var bodyParser = require('body-parser')
var jsonfile = require('jsonfile')
var morgan = require('morgan')

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
  var file = "article.json";
  jsonfile.writeFile(file, req.body, function (err) {
	if (err) console.error(err);
	else console.log("Saved data!");
  });
  
  console.log(req.body.article);
  
  res.sendStatus(204);
});

app.get("/list", function (req, res) {
  res.send("List");
})

app.get("/article/*", function (req, res) {
  var article_name = req.url.substr(9);
  res.send(article_name);
})

app.listen(3000, function () {
  console.log("Publishing app listening on port 3000!");
});