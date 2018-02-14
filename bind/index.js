'use strict'

var App = require('node-express-app');
	


module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  options: {
	  
	id: 'bind',
	path: '/bind',
	
	//authorization: {
		//config: path.join(__dirname,'./config/rbac.json'),
	//},
	
	params: {
	  //route: /^(0|[1-9][0-9]*)$/,
	},
	
	routes: {
		
		/*all: [
		  {
			path: '',
			callbacks: ['get']
		  },
		]*/
	},
	
	api: {
		
		version: '1.0.0',
		
		routes: {
			all: [
			  {
				path: '/',
				callbacks: ['get'],
				version: '',
			  },
			]
		},
		
	},
  },
  get: function (req, res, next){
	  res.json({info : 'bind9 api'});
  },
  initialize: function(options){
	
	this.parent(options);//override default options
	
	this.log('bind', 'info', 'bind started');
  },
	
});

