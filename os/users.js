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
	  
		id: 'users',
		path: '/os/users',
		
		params: {
			uid: /^\w+$/,
			prop: /username|password|uid|gid|comments|home|shell/
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: ':uid',
						callbacks: ['get_user'],
						version: '',
					},
					{
						path: ':uid/:prop',
						callbacks: ['get_user'],
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
  get_user: function (req, res, next){

		var getUser = function(username){
			passwd.getUser({'username': username}, function(err, user){
				if(err){
					//console.error(err);
					res.status(500).json({error: err.message});
				}
				else{
					if(req.params.prop){
						res.json(user[req.params.prop]);
					}
					else{
						res.json(user);
					}
				}
			});
		};

		//res.json({info: 'users'});
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
						getUser(username);
					}
				});
			}
			else{
				getUser(req.params.uid);
			}
		}
		else{
			//next();
			res.status(500).json({error: 'Bad user uid param'});
		}
  },
  get: function (req, res, next){
	  //console.log('users param:');
	  //console.log(req.params);
	  //console.log(req.path);
	  
	  
		var users = passwd.getUsers();
		var users_data = [];

		users.on('user', function(user) {
			////console.log('user');
			////console.log(JSON.stringify(user));
			users_data.push(user);
		});

		users.on('end', function() {
			res.json(users_data);
		});

		//doens't work
		//passwd.getUsers(function(users) {
			////console.log('get users func');
			////console.log(users);
			//res.json(users);
		//});
	  
  },
  initialize: function(options){
	
		this.parent(options);//override default options
		
		this.log('os-users', 'info', 'os-users started');
  },
	
});

