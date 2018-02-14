'use strict'

var path = require('path');

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');
	


module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  
  get: function (req, res, next){
		res.json({info: 'dirvish api'});
  },
  initialize: function(options){
	
		this.parent(options);//override default options
		
		this.log('dirvish', 'info', 'dirvish started');
  },
  
});

