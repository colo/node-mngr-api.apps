'use strict'

var App = require('node-express-app');
	
      
module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  options: {
	  
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
  
  options: {
			
		id: 'login',
		path: '/login',
		
		logs: { 
			path: './logs' 
		},


		params: {
		},
		
		/*routes: {
			
			all: [
				{
				path: '',
				callbacks: ['get']
				},
			]
		},*/
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
					{
					path: '',
					callbacks: ['login'],
					version: '',
					},
				],
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

