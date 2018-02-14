'use strict'

var App = require('node-express-app');
	
      
module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  comments: true,
  
	ON_NO_VHOST: 'onNoVhost',
  ON_VHOST_ERROR: 'onVhostError',
  
  ON_VHOST_FOUND: 'onVhostFound',
  ON_VHOST_NOT_FOUND: 'onVhostNotFound',
  
  ON_VHOST_INDEX_FOUND: 'onVhostIndexFound',
  ON_VHOST_INDEX_NOT_FOUND: 'onVhostIndexNotFound',
  
  ON_VHOST_INDEX_PROP_FOUND: 'onVhostIndexPropFound',
  ON_VHOST_INDEX_PROP_NOT_FOUND: 'onVhostIndexPropNotFound',
  
  ON_VHOST_PROP_FOUND: 'onVhostPropFound',
  ON_VHOST_PROP_NOT_FOUND: 'onVhostPropNotFound',
  
  options: {
		conf_ext: {
			//available: new RegExp("\\w+", "gi"),
			//enabled: new RegExp("\\w+", "gi"),
			available: null,
			enabled: null,
		},
		
		id: 'apache_vhosts',
		path: '/apache/vhosts',
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
					{
						path: 'enabled',
						callbacks: ['add'],
						version: '',
					},
					{
						path: 'enabled/:uri',
						callbacks: ['add'],
						version: '',
					},
					{
						path: ':uri',
						callbacks: ['add'],
						version: '',
					},
					{
						path: '',
						callbacks: ['add'],
						version: '',
					},
				],
				put: [
					{
						path: 'enabled',
						callbacks: ['update'],
						version: '',
					},
					{
						path: 'enabled/:uri',
						callbacks: ['update'],
						version: '',
					},
					{
						path: 'enabled/:uri/:prop_or_index',
						callbacks: ['update'],
						version: '',
					},
					{
						path: 'enabled/:uri/:prop_or_index/:prop',
						callbacks: ['update'],
						version: '',
					},
					{
						path: ':uri',
						callbacks: ['update'],
						version: '',
					},
					{
						path: ':uri/:prop_or_index',
						callbacks: ['update'],
						version: '',
					},
					{
						path: ':uri/:prop_or_index/:prop',
						callbacks: ['update'],
						version: '',
					},
					{
						path: '',
						callbacks: ['update'],
						version: '',
					},
				],
				delete: [
					{
						path: 'enabled',
						callbacks: ['remove'],
						version: '',
					},
					{
						path: 'enabled/:uri',
						callbacks: ['remove'],
						version: '',
					},
					{
						path: 'enabled/:uri/:prop_or_index',
						callbacks: ['remove'],
						version: '',
					},
					{
						path: ':uri',
						//callbacks: ['check_authentication', 'add'],
						callbacks: ['remove'],
						version: '',
					},
					{
						path: ':uri/:prop_or_index',
						//callbacks: ['check_authentication', 'add'],
						callbacks: ['remove'],
						version: '',
					},
					{
						path: '',
						//callbacks: ['check_authentication', 'add'],
						callbacks: ['remove'],
						version: '',
					},
				],
				get: [
					{
						path: 'enabled',
						callbacks: ['get'],
						version: '',
					},
					{
						path: 'enabled/:uri',
						callbacks: ['get'],
						version: '',
					},
					{
						path: 'enabled/:uri/:prop_or_index',
						callbacks: ['get'],
						version: '',
					},
					{
						path: 'enabled/:uri/:prop_or_index/:prop',
						callbacks: ['get'],
						version: '',
					},
					{
						path: ':uri',
						callbacks: ['get'],
						version: '',
					},
					{
						path: ':uri/:prop_or_index',
						callbacks: ['get'],
						version: '',
					},
					{
						path: ':uri/:prop_or_index/:prop',
						callbacks: ['get'],
						version: '',
					},
					{
						path: '',
						callbacks: ['get'],
						version: '',
					},
				],
				/*all: [
					{
					path: '',
					callbacks: ['get'],
					version: '',
					},
				],*/
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

