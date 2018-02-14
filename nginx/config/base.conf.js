'use strict'

var App = require('node-express-app');
	
      
module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  options: {
	  
		id: 'nginx',
		path: '/nginx',
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: '',
						callbacks: ['get'],
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

