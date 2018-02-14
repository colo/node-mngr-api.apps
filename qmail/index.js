'use strict'

var App = require('node-express-app'),
	path = require('path');
	


module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  options: {
	  
	id: 'qmail',
	path: '/qmail',
	
	//authorization: {
		//config: path.join(__dirname,'./config/rbac.json'),
	//},
	
	params: {
	  //route_id: /^[0-9]+$/,
	  route: /^(0|[1-9][0-9]*)$/,
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
				path: 'smtp/allow/:route',
				callbacks: ['smtp_allow'],
				version: '',
			  },
			  {
				path: 'smtp/allow',
				callbacks: ['smtp_allow'],
				version: '',
			  },
			  {
				path: 'smtp/routes/:route',
				callbacks: ['smtp_routes'],
				version: '',
			  },
			  {
				path: 'smtp/routes',
				callbacks: ['smtp_routes'],
				version: '',
			  },
			  {
				path: '',
				callbacks: ['info'],
				version: '',
			  },
			]
		},
		
	},
  },
  info: function (req, res, next){
	  res.json({ id: 'qmail api'});
  },
  smtp_routes: function (req, res, next){
  
	//console.log('req.params');
	//console.log(req.params);
	
	if(req.method == 'GET'){
		if(req.params.route){//devuelve la ruta especificada x el indice
			res.json(':127.0.0.1');
		}
		else{//todas las rutas
			res.json([':127.0.0.1']);
		}
	}
	else if(req.method == 'POST'){//crea la ruta y devuelve el indice
		res.json({ status: 'created', id: 1});
	}
	else if(req.method == 'PUT' || req.method == 'PATCH'){
		res.json({ status: 'updated'});
	}
	else if(req.method == 'DELETE'){
		res.json({ status: 'deleted'});
	}
  },
  smtp_allow: function (req, res, next){
  
	//console.log('req.params');
	//console.log(req.params);
	
	if(req.method == 'GET'){
		if(req.params.route){//devuelve la ruta especificada x el indice
			res.json('127.:allow,RELAYCLIENT=""');
		}
		else{//todas las rutas
			res.json(['127.:allow,RELAYCLIENT=""']);
		}
	}
	else if(req.method == 'POST'){//crea la ruta y devuelve el indice
		res.json({ status: 'created', id: 1});
	}
	else if(req.method == 'PUT' || req.method == 'PATCH'){
		res.json({ status: 'updated'});
	}
	else if(req.method == 'DELETE'){
		res.json({ status: 'deleted'});
	}
  },
  initialize: function(options){
		
	this.parent(options);//override default options
		
	this.log('qmail', 'info', 'qmail started');	
		
  },
	
});

