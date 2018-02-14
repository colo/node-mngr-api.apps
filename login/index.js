'use strict'

var path = require('path'),
	util = require('util');

	
const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,
  
  login: function(req, res, next){
		console.log('Login Request');
		//console.log(req.headers.authorization);
		
		this.authenticate(req, res, next,  function(err, user, info) {
			//console.log(err);
			//console.log(user);
			//console.log(info);
			
			this.profile('login_authenticate');
			
			if (err) {
				//console.log('--err--');
				//console.log(err);

				res.status(403).json({'error': err});
			}
			else if (!user) {
				
				this.log('login', 'warn', 'login authenticate ' + info);
				
				res.cookie('login', false, { maxAge: 99999999, httpOnly: false });
				
				//req.flash('error', info);
				res.status(403).json({'error': info.message});

			}
			else{
				req.logIn(user, function(err) {
					if (err) {
						//console.log('--err--');
						//console.log(err);
						
						this.log('login', 'error', err);
						return next(err);
					}
					
					this.log('login', 'info', 'login authenticate ' + util.inspect(user));
					
					res.cookie('login', true, { maxAge: 0, httpOnly: false });
					
					res.send({'status': 'ok'});
					
				}.bind(this));
			}
		}.bind(this));
		
	
  },
  get: function(req, res, next){
		res.status(200);
			
		res.format({
			'text/plain': function(){
				res.send('login app');
			},

			'text/html': function(){
				res.send('<h1>login app</h1');
			},

			'application/json': function(){
				res.send({info: 'login app'});
			},

			'default': function() {
				// log the request and respond with 406
				res.status(406).send('Not Acceptable');
			}
		});
		
  },
  initialize: function(options){
		this.profile('login_init');//start profiling
		
		this.parent(options);//override default options
		
		this.profile('login_init');//end profiling
		
		this.log('login', 'info', 'login started');
  },
  
});
