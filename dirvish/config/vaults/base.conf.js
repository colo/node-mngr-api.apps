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
		
		id: 'vaults',
		path: '/vaults',
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
					{
						path: ':vault',
						callbacks: ['post'],
						version: '',
					},
					{
						path: '',
						callbacks: ['post'],
						version: '',
					}
				],
				put: [
					{
						path: ':vault',
						callbacks: ['put'],
						version: '',
					},
					{
						path: '',
						callbacks: ['put'],
						version: '',
					}
				],
				get: [
					/**
					* hist needs to be before :key path, or won't be proceded
					* 
					* */
					{
						path: 'hist/:key',
						callbacks: ['hist'],
						version: '',
					},
					{
						path: 'hist',
						callbacks: ['hist'],
						version: '',
					},
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
						path: ':key/config/:item',
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

