'use strict'

const Moo = require("mootools"),
		path = require("path"),
		BaseApp = require ('./base.conf');

module.exports = new Class({
  Extends: BaseApp,
  
  options: {
	  
		authorization: {
			config: {
				"permissions":[],
			},
		},
		
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
						
						if(verb == 'get' && !route.roles)//users can "read" info
							route.roles = ['user']
					});
				}
				
			});
		}
		
			
		this.parent(options);//override default options
		
		
  },
  
	
});
