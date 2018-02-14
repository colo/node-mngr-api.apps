'use strict'

var path = require('path'),
		passwd = require('etc-passwd'),
		uidToUsername = require("uid-username");

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');

	
module.exports = new Class({
  Extends: App,
  
  
  options: {
	  
		id: 'shadows',
		path: '/os/shadows',
		
		params: {
			uid: /^\w+$/,
			prop: /username|password|lastchg|min|max|warn|inactive|expire|flag/
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: ':uid',
						callbacks: ['get_shadow'],
						version: '',
					},
					{
						path: ':uid/:prop',
						callbacks: ['get_shadow'],
						version: '',
					},
					{
						path: '',
						callbacks: ['get'],
						version: '',
					},
				]
			},
			
		},
  },
  get_shadow: function (req, res, next){
		//console.log('shadows param:');
		//console.log(req.params);
		//console.log(req.path);

		var getShadow = function(username){
			passwd.getShadow({'username': username}, function(err, shadow){
			if(err){
				//console.error(err);
				res.status(500).json({error: err.message});
			}
			else{
				if(req.params.prop){
					res.json(shadow[req.params.prop]);
				}
				else{
					res.json(shadow);
				}
			}
		});
		}
		//res.json({info: 'shadows'});
		if(req.params.uid){
			var condition = /^(0|[1-9][0-9]*)$/;//numeric uid

			if(condition.exec(req.params.uid) != null){//uid param is numeric, must detect username
				uidToUsername(req.params.uid, function (err, username) {
					////console.log('uidToUsername');
					//console.error(err);
					////console.log(username);
					if(err){
						//console.error(err);
						res.status(500).json({error: err.message});
					}
					else{
						getShadow(username);
					}
				});
			}
			else{//uid is string
				getShadow(req.params.uid);
			}


		}
		else{
			//next();
			res.status(500).json({error: 'Bad shadow uid param'});
		}
  },
  get: function (req, res, next){
		var shadows = passwd.getShadows();
		var shadows_data = [];
		
		shadows.on('shadow', function(shadow) {
			////console.log('user');
			////console.log(JSON.stringify(user));
			shadows_data.push(shadow);
		});
		
		shadows.on('end', function() {
			res.json(shadows_data);
		});
		
		//doens't work
		//passwd.getShadows(function(shadows) {
			////console.log('get shadows func');
			////console.log(shadows);
			//res.json(shadows);
		//});

  },
  initialize: function(options){
		if(process.env.NODE_ENV === 'production'){
			/**
			 * change allowed role for admin on this app
			 * */
			Object.each(this.options.api.routes, function(routes, verb){
				
				if(verb != 'all'){
					Array.each(routes, function(route){
						route.roles = ['admin']
					});
				}
				
			});
		}
		
		this.parent(options);//override default options
		
		this.log('os-shadows', 'info', 'os-shadows started');
  },
	
});

