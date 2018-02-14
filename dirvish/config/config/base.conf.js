'use strict'

var App = require('node-express-app');
	
      
module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  files: ["../../devel/etc/dirvish.conf", "../../devel/etc/dirvish/master.conf"],
  
  cfg_file: null,
  
  cfg: {},
  
  
  options: {
		
		id: 'config',
		path: '/config',
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
					{
						path: '',
						callbacks: ['post'],
						version: '',
					}
				],
				put: [
					{
						path: '',
						callbacks: ['put'],
						version: '',
					}
				],
				
				get: [
					{
						path: ':key',
						callbacks: ['get'],
						version: '',
					},
					{
						path: ':key/:prop',
						callbacks: ['get'],
						version: '',
					},
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

