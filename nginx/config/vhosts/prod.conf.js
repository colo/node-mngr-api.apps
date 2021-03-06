'use strict'

const Moo = require("mootools"),
		BaseApp = require ('./base.conf'),
		path = require('path');

module.exports = new Class({
  Extends: BaseApp,
  
	options: {
		authorization: {
			config: {
				"permissions":[],
			},
		},
		
		conf_path: {
			available: [ 
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/"),
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/proxies/"),
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/redirects/"),
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/ssl/"),
			],
			enabled: path.join(__dirname,"../../../../devel/etc/nginx/sites-enabled/"),
		},
		/**
		 * production
		 * */
		 
		 /**
		  conf_path: {
			available: [ 
				path.join("/","/etc/nginx/sites-available/"),
				path.join("/","/etc/nginx/sites-available/proxies/"),
				path.join("/","/etc/nginx/sites-available/redirects/"),
				path.join("/","/etc/nginx/sites-available/ssl/"),
			],
			enabled: path.join("/","/etc/nginx/sites-enabled/"),
		},
		* */
	},
	
	initialize: function(options){
		
		if(process.env.NODE_ENV === 'production'){
			/**
			 * add 'check_authentication' & 'check_authorization' to each route
			 * */
			Object.each(this.options.api.routes, function(routes, verb){
				
				if(verb != 'all'){
					Array.each(routes, function(route){
						//debug('route: ' + verb);
						route.callbacks.unshift('check_authorization');
						route.callbacks.unshift('check_authentication');
						
						if(verb == 'get'){//users can "read" info
							route.roles = ['user']
						}
						else{
							route.roles = ['admin']
						}
					});
				}
				
			});
		}
		
		this.parent(options);//override default options
		
		
	}
	
});
