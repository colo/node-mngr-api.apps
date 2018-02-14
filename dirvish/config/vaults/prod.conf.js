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
		
		
	},
	
	initialize: function(options){
		
		if(process.env.NODE_ENV === 'production'){
			/**
			 * add 'check_authentication' & 'check_authorization' to each route
			 * */
			Object.each(this.options.api.routes, function(routes, verb){
				//console.log(verb)
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
		//console.log(this.options.api.routes);
		this.parent(options);//override default options
		
		
	}
	
});
