'use strict'

const Moo = require("mootools"),
		BaseApp = require ('./base.conf'),
		path = require('path');

module.exports = new Class({
  Extends: BaseApp,
  
  conf_dir: path.join(__dirname,"../../../devel/etc/apache2/"),
  
});
