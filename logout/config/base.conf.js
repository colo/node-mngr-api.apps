'use strict'

var App = require('node-express-app');
	
      
module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  options: {
	  
		id: 'logout',
		path: '/logout',
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
					{
					path: '',
					callbacks: ['logout'],
					version: '',
					},
				],
				all: [
					{
					path: '',
					callbacks: ['501'],
					version: '',
					},
				]
			},
			
		},
  },
  
  
	
});

