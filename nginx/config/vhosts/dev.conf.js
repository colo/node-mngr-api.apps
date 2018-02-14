'use strict'

const Moo = require("mootools"),
		BaseApp = require ('./base.conf'),
		path = require('path');

module.exports = new Class({
  Extends: BaseApp,
  
  options: {
		conf_path: {
			available: [ 
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/"),
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/proxies/"),
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/redirects/"),
				path.join(__dirname,"../../../../devel/etc/nginx/sites-available/ssl/"),
			],
			enabled: path.join(__dirname,"../../../../devel/etc/nginx/sites-enabled/"),
		},
		
	}
  
});
