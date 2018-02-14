'use strict'

const Moo = require("mootools"),
		BaseApp = require ('./base.conf'),
		path = require('path');

module.exports = new Class({
  Extends: BaseApp,
  
  options: {
		conf_path: {
			available: [ 
				path.join(__dirname,"../../../../devel/etc/apache2/sites-available/"),
				//path.join(__dirname,"../../../../devel/etc/apache2/sites-available/proxies/"),
				//path.join(__dirname,"../../../../devel/etc/apache2/sites-available/redirects/"),
				//path.join(__dirname,"../../../../devel/etc/apache2/sites-available/ssl/"),
			],
			enabled: path.join(__dirname,"../../../../devel/etc/apache2/sites-enabled/"),
		},
		
	}
  
});
