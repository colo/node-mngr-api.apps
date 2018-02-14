'use strict'

var	path = require('path'),
	util = require('util'),
	nginx = require('nginx-conf').NginxConfFile;

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,
  
  get: function(req, res, next){
		
		res.status(200);
			
		res.format({
			'text/plain': function(){
				res.send('nginx app');
			},

			'text/html': function(){
				res.send('<h1>nginx app</h1');
			},

			'application/json': function(){
				res.send({info: 'nginx app'});
			},

			'default': function() {
				// log the request and respond with 406
				res.status(406).send('Not Acceptable');
			}
		});
			
  },
  initialize: function(options){
		this.profile('nginx_init');//start profiling
		
		this.parent(options);//override default options
		
		this.profile('nginx_init');//end profiling
		
		this.log('nginx', 'info', 'nginx started');
  },
  
});
