'use strict'

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');

module.exports = new Class({
  Extends: App,
  
  get: function(req, res, next){
		
		res.status(200);
			
		res.format({
			'text/plain': function(){
				res.send('apache app');
			},

			'text/html': function(){
				res.send('<h1>apache app</h1');
			},

			'application/json': function(){
				res.send({info: 'apache app'});
			},

			'default': function() {
				// log the request and respond with 406
				res.status(406).send('Not Acceptable');
			}
		});
			
  },
  initialize: function(options){
		this.profile('apache_init');//start profiling
		
		this.parent(options);//override default options
		
		this.profile('apache_init');//end profiling
		
		this.log('apache', 'info', 'apache started');
  },
  
});
