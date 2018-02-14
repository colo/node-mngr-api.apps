var express = require('express');
var path = require('path');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ title: 'index' });
});

var app = express();

app.use('/', router);

module.exports = app;
