'use strict'

var App = require('node-express-app'),
	path = require('path'),
	util = require('util');


module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  //authorization:null,
  //authentication: null,
  
  options: {
	  
		id: 'authentication',
		path: '/admin/authentication',
		
		params: {
			//id: /^(0|[1-9][0-9]*)$/,
			//username:
			//role:
			//password:
		},
		
		routes: {
			
			//all: [
				//{
				//path: '',
				//callbacks: ['get']
				//},
			//]
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
					{
					path: '',
					//callbacks: ['check_authentication', 'add'],
					callbacks: ['add'],
					version: '',
					},
				],
				put: [
					{
					path: ':user',
					//callbacks: ['check_authentication', 'add'],
					callbacks: ['update'],
					version: '',
					},
				],
				delete: [
					{
					path: ':user',
					//callbacks: ['check_authentication', 'add'],
					callbacks: ['remove'],
					version: '',
					},
				],

				get: [
					{
					path: ':user',
					callbacks: ['get'],
					version: '',
					},
				],
				all: [
					{
					path: '',
					callbacks: ['get'],
					version: '',
					},
				]
			},
			
		},
  },
  //find: function(user){
		//user = this.express().get('authentication').store.findByID(user);
			
		//if(!user){
			//user = this.express().get('authentication').store.findByUserName(user);
		//}
		
		//return user;
	//},
  add: function(req, res, next){
		var self = this;
		
		self.express().get('authentication').store.add(req.body, function(err, user){
			if(err){
				res.status(500).json({error: err, user: user});
			}
			else{
				
				self.express().get('authentication').store.save(function(err){
					if(err){
						res.status(500).json({error: err, user: user});
					}
					else{
						res.json(user);
					}
					
				});
				
			}
			
		});
		
  },
  update: function(req, res, next){
		//console.log(req.params);
		//console.log(req.body);
		
		var self = this;
		var user = null;
		
		if(req.params.user){
			user = self.express().get('authentication').store.findByID(req.params.user);
			
			if(user instanceof Error){
				user = self.express().get('authentication').store.findByUserName(req.params.user);
				
				if(!(user instanceof Error)){
					var by_name = {username: user.username};
					user = Object.merge(user, req.body, by_name);
				}
				
			}
			else{
				var by_id = {id: user.id};
				user = Object.merge(user, req.body, by_id);
			}
			
			if(user instanceof Error){
				res.status(404).json({error: user.message, user: user.id || user.username });
			}
			else{
				self.express().get('authentication').store.update(user, function(err, user){
					if(err){
						
						res.status(500).json({error: err, user: user});
						
					}
					else{
						
						self.express().get('authentication').store.save(function(err){
							if(err){
								res.status(500).json({error: err, user: user});
							}
							else{
								res.json(user);
							}
							
						});
						
					}
				});
			}		
		}
		else{
			res.status(500).json({error: 'no user specified'});
		}
		
  },
  remove: function(req, res, next){
		//console.log(req.params);
		//console.log(req.body);
		
		var self = this;
		var user = null;
		
		if(req.params.user){
			user = self.express().get('authentication').store.findByID(req.params.user);
			
			if(user instanceof Error){
				user = self.express().get('authentication').store.findByUserName(req.params.user);
				
				//if(!(user instanceof Error)){
					//var by_name = {username: user.username};
					//user = Object.merge(user, req.body, by_name);
				//}
				
			}
			//else{
				//var by_id = {id: user.id};
				//user = Object.merge(user, req.body, by_id);
			//}
			
			if(user instanceof Error){
				res.status(404).json({error: user.message, user: user.id || user.username });
			}
			else{
				self.express().get('authentication').store.remove(user, function(err, user){
					if(err){
						
						res.status(500).json({error: err, user: user});
						
					}
					else{
						
						self.express().get('authentication').store.save(function(err){
							if(err){
								res.status(500).json({error: err, user: user});
							}
							else{
								res.json(user);
							}
							
						});
						
					}
				});
			}		
		}
		else{
			res.status(500).json({error: 'no user specified'});
		}
		
  },
  get: function(req, res, next){
		
		
		var user = null;
		
		if(req.params.user){
			user = this.express().get('authentication').store.findByID(req.params.user);
			
			if(user instanceof Error){
				user = this.express().get('authentication').store.findByUserName(req.params.user);
			}
			
			//console.log(user.id);
			//console.log(user.username);
			
			if(user instanceof Error){
				//var id_username = user.id || user.username;
				res.status(404).json({error: user.message, user: user.id || user.username });
			}
			else{
				res.json(user);
			}
			
		}
		else{
			
			this.express().get('authentication').store.list(function(users){
				res.json(users);
			});
			
			//res.status(200);
				
			//res.format({
				//'text/plain': function(){
					//res.send('authentication app');
				//},

				//'text/html': function(){
					//res.send('<h1>authentication app</h1');
				//},

				//'application/json': function(){
					//res.send({info: 'authentication app'});
				//},

				//'default': function() {
					//// log the request and respond with 406
					//res.status(406).send('Not Acceptable');
				//}
			//});
			
		}
  },
  initialize: function(options){
		this.profile('authentication_init');//start profiling
		
		this.parent(options);//override default options
		
		this.profile('authentication_init');//end profiling
		
		this.log('authentication', 'info', 'authentication started');
  },
  
});
