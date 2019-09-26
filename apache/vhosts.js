//read: https://www.npmjs.com/package/config-general
//write: https://www.npmjs.com/package/tonto

'use strict'

var os = require('os'),
		path = require('path'),
		util = require('util'),
		fs = require('fs'),
		cg = require('config-general'),//read
		Tonto = require('./libs/tonto'),//write
		changeCase = require('change-case'),
		lockFile = require('lockfile');

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/vhosts/prod.conf')
      : require('./config/vhosts/dev.conf');

module.exports = new Class({
  Extends: App,

  add: function(req, res, next){
		//console.log(req.body);
		//console.log(req.params);
		//console.log(req.query);

		//var config = cg.parser( { ConfigFile: './example.vhost', SlashIsDirectory: true } );

		//var config_data = config.getall();


		//config_data['VirtualHost']['*:80']['RewriteEngine'] = "on";
		//console.log(config_data);
		//config.save_file('./example.vhost.saved');

		//this.comments = (req.query && req.query.comments == "false") ? false : true;

		var uri = req.params.uri;

		var callback = function(scaned_vhosts){

			var send = null;

			if(uri){//if vhost uri sent...this check should be run prev to scan the vhost!!??

				/**
				 * new func (scaned_vhosts, uri, index, prop)
				 * */
				var read_vhosts = this.search_vhost(scaned_vhosts, uri);

				if(read_vhosts.length == 0){//no match

					this.fireEvent(this.ON_VHOST_NOT_FOUND, [req, res, next, [uri]]);

				}
				else{

					this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [null, read_vhosts]]);

				}
			}
			else{//no uri sent
				this.fireEvent(this.ON_NO_VHOST, [req, res, next, [scaned_vhosts]]);
			}


		}.bind(this);

		/**
		 * per default will add on 'available' vhosts, unless request path is /vhosts/enabled/
		 * if added on "enabled", automatically will add it to "available"
		 * */
		var sync = (req.path.indexOf('enabled') != -1) ? 'enabled' : 'available';
		this.sync_vhosts(sync, callback);


	},
	remove: function(req, res, next){

		this.comments = (req.query && req.query.comments == "false") ? false : true;

		var uri = req.params.uri;

		// is Numberic index or a property String - mootols 1.6 vs 1.5
		var index = (Number.convert) ? Number.convert(req.params.prop_or_index) : Number.from(req.params.prop_or_index);

		//if index was String, take it as property
		//var prop = (index == null) ? req.params.prop_or_index : req.params.prop;

		var callback = function(scaned_vhosts){

			var send = null;

			if(uri){//if vhost uri sent

				//var read_vhosts = this.search_unique_vhost(vhosts, req.params.uri);
				var read_vhosts = this.search_vhost(scaned_vhosts, uri);


				if(read_vhosts.length == 0){//no match

					this.fireEvent(this.ON_VHOST_NOT_FOUND, [req, res, next, [uri]]);

				}
				else{

					if(read_vhosts.length == 1)//if only one match, should return a vhost {}, not an [] of vhosts
						read_vhosts = read_vhosts[0];

					//with {uri,file} info, read whole vhost config
					this.read_vhosts_full(read_vhosts, function(cfg){

						if(req.params.prop_or_index){
						//if(index >= 0 || prop != undefined){

							if(cfg instanceof Array){//multiple vhosts

								if(index != null){//search for vhost matching index on []

									if(cfg[index]){//exist

										this.fireEvent(this.ON_VHOST_INDEX_FOUND, [req, res, next, [cfg, index, read_vhosts]]);

									}
									else{//index doens't exist

										this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, index, read_vhosts]]);

									}
								}
								else{//no index sent, search for matching property on every vhost on []

									this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, null, read_vhosts]]);

								}
							}
							else{//single vhosts

								if(index == 0 || index == null){//if there is only one vhost and index=0, return that vhost

									this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [cfg, read_vhosts]]);

								}
								else{
									this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, index, read_vhosts]]);
								}

							}
						}
						else{//no 'prop_or_index' param sent, return full vhost or []
							this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [cfg, read_vhosts]]);
						}

					}.bind(this));

				}
			}
			else{//complete vhosts list
				this.fireEvent(this.ON_NO_VHOST, [req, res, next, [scaned_vhosts]]);
			}


		}.bind(this);

		/**
		 * per default will sync & search on 'available' vhosts, unless request path is /vhosts/enabled/
		 * if removed from "available", automatically will remove it from "enabled"
		 * */
		var sync = (req.path.indexOf('enabled') != -1) ? 'enabled' : 'available';
		this.sync_vhosts(sync, callback);


	},
	/**
	 * query with no comments: ?comments=false
	 * */
	get: function(req, res, next){

		this.comments = (req.query && req.query.comments == "false") ? false : true;

		var uri = req.params.uri;

		// is Numberic index or a property String - mootols 1.6 vs 1.5
		var index = (Number.convert) ? Number.convert(req.params.prop_or_index) : Number.from(req.params.prop_or_index);

		//if index was String, take it as property
		var prop = (index == null) ? req.params.prop_or_index : req.params.prop;

		var callback = function(scaned_vhosts){

			var send = null;

			if(uri){//if vhost uri sent

				//var read_vhosts = this.search_unique_vhost(vhosts, req.params.uri);
				var read_vhosts = this.search_vhost(scaned_vhosts, uri);


				if(read_vhosts.length == 0){//no match

					this.fireEvent(this.ON_VHOST_NOT_FOUND, [req, res, next, [uri]]);

				}
				else{

					if(read_vhosts.length == 1)//if only one match, should return a vhost {}, not an [] of vhosts
						read_vhosts = read_vhosts[0];

					//with {uri,file} info, read whole vhost config
					this.read_vhosts_full(read_vhosts, function(cfg){

						if(req.params.prop_or_index){
						//if(index >= 0 || prop != undefined){

							if(cfg instanceof Array){//multiple vhosts

								if(index != null){//search for vhost matching index on []

									if(cfg[index]){//exist

										if(prop && cfg[index][prop]){//property exists

											this.fireEvent(this.ON_VHOST_INDEX_PROP_FOUND, [req, res, next, [cfg, index, prop, read_vhosts]]);

										}
										else if(prop != undefined && !cfg[index][prop]){

											this.fireEvent(this.ON_VHOST_INDEX_PROP_NOT_FOUND, [req, res, next, [cfg, index, prop, read_vhosts]]);

										}
										else{// property param wasn't set at all, return vhost matching index on []

											this.fireEvent(this.ON_VHOST_INDEX_FOUND, [req, res, next, [cfg, index, read_vhosts]]);

										}


									}
									else{//index doens't exist

										this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, index, read_vhosts]]);

									}
								}
								else{//no index sent, search for matching property on every vhost on []

									var props = [];
									Array.each(cfg, function(vhost, index){
											if(vhost[prop]){
												props[index] = vhost[prop];
											}
									});

									if(props.length > 0){
										this.fireEvent(this.ON_VHOST_PROP_FOUND, [req, res, next, [cfg, props, prop, read_vhosts]]);
									}
									else{
										this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [cfg, props, prop, read_vhosts]]);
									}
								}
							}
							else{//single vhosts

								if((index == 0 || index == null) && !prop ){//if there is only one vhost and index=0, return that vhost

									this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [cfg, read_vhosts]]);

								}
								else if((index == 0 || index == null) && prop){

									if(cfg[prop]){
										this.fireEvent(this.ON_VHOST_PROP_FOUND, [req, res, next, [cfg, cfg[prop], prop, read_vhosts]]);
									}
									else{
										//this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [uri, prop]]);
										this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [cfg, null, prop, read_vhosts]]);
									}

								}
								else{
									this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, index, read_vhosts]]);
								}

							}
						}
						else{//no 'prop_or_index' param sent, return full vhost or []
							this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [cfg, read_vhosts]]);
						}

					}.bind(this));

				}
			}
			else{//complete vhosts list
				this.fireEvent(this.ON_NO_VHOST, [req, res, next, [scaned_vhosts]]);
			}


		}.bind(this);

		//per default will sync & search on 'available' vhosts, unless request path is /vhosts/enabled/
		var sync = (req.path.indexOf('enabled') != -1) ? 'enabled' : 'available';
		this.sync_vhosts(sync, callback);


  },


  /**
	 * &listen=108.163.170.178:80&ServerName=campus.apci.org.ar&location[value]=\&location[limit_req]=zone=default burst=4
	 * &include[]=/etc/apache2/conf.d/no_log.conf2&include[]=/etc/apache2/conf.d/errors.conf
	 *
	 * */
	update: function(req, res, next){
		console.log(req.body);
		console.log(req.params);
		//throw new Error();

		this.comments = (req.query && req.query.comments == "false") ? false : true;

		var uri = req.params.uri;

		// is Numberic index or a property String - mootols 1.6 vs 1.5
		var index = (Number.convert) ? Number.convert(req.params.prop_or_index) : Number.from(req.params.prop_or_index);

		//if index was String, take it as property
		var prop = (index == null) ? req.params.prop_or_index : req.params.prop;

		if(prop == undefined &&
			Object.getLength(req.body) == 1 &&
			!(req.body['value'] || req.body['_value'])){//asume req.body to have the property
			prop = Object.keys(req.body)[0];
		}

		var callback = function(scaned_vhosts){

			var send = null;

			if(uri){//if vhost uri sent

				/**
				 * new func (scaned_vhosts, uri, index, prop)
				 * */
				var read_vhosts = this.search_vhost(scaned_vhosts, uri);

				if(read_vhosts.length == 0){//no match

					this.fireEvent(this.ON_VHOST_NOT_FOUND, [req, res, next, [uri]]);

				}
				else{

					if(read_vhosts.length == 1)//if only one match, should return a vhost {}, not an [] of vhosts
						read_vhosts = read_vhosts[0];

					//with {uri,file} info, read whole vhost config
					this.read_vhosts_full(read_vhosts, function(cfg){

						if(req.params.prop_or_index){
						//if(index >= 0 || prop != undefined){

							if(cfg instanceof Array){//multiple vhosts

								if(index != null){//search for vhost matching index on []

									if(cfg[index]){//exist

										if(prop && cfg[index][prop]){//property exists

											this.fireEvent(this.ON_VHOST_INDEX_PROP_FOUND, [req, res, next, [cfg, index, prop, read_vhosts]]);

										}
										else if(prop != undefined && !cfg[index][prop]){

											this.fireEvent(this.ON_VHOST_INDEX_PROP_NOT_FOUND, [req, res, next, [cfg, index, prop, read_vhosts]]);

										}
										else{// property param wasn't set at all, return vhost matching index on []

											this.fireEvent(this.ON_VHOST_INDEX_FOUND, [req, res, next, [cfg, index, read_vhosts]]);

										}


									}
									else{//index doens't exist

										this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, index, read_vhosts]]);

									}
								}
								//else if(prop != undefined){//no index sent, search for matching property on every vhost on []
								else {
									var props = [];
									Array.each(cfg, function(vhost, index){
											if(vhost[prop]){
												props[index] = vhost[prop];
											}
									});

									if(props.length > 0){
										this.fireEvent(this.ON_VHOST_PROP_FOUND, [req, res, next, [cfg, props, prop, read_vhosts]]);
									}
									else{
										this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [cfg, props, prop, read_vhosts]]);
									}


								}
								//else{
									//this.fireEvent(this.ON_VHOST_ERROR, [req, res, next, [uri, 'Property undefined']]);
								//}
							}
							else{//single vhosts

								if((index == 0 || index == null) && !prop ){//if there is only one vhost and index=0, return that vhost

									this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [cfg, read_vhosts]]);

								}
								else if((index == 0 || index == null) && prop){

									if(cfg[prop]){
										this.fireEvent(this.ON_VHOST_PROP_FOUND, [req, res, next, [cfg, null, prop, read_vhosts]]);
									}
									else{
										//this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [uri, prop]]);
										this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [cfg, null, prop, read_vhosts]]);
									}

								}
								else{
									this.fireEvent(this.ON_VHOST_INDEX_NOT_FOUND, [req, res, next, [cfg, index, read_vhosts]]);
								}

							}
						}
						else{//no 'prop_or_index' param sent, return full vhost or []
							this.fireEvent(this.ON_VHOST_FOUND, [req, res, next, [cfg, read_vhosts]]);
						}



					}.bind(this));

				}
			}
			else{//no uri sent, that's an error
				this.fireEvent(this.ON_NO_VHOST, [req, res, next, [scaned_vhosts]]);
				//res.status(500).json({error: 'Vhost not specified.'});
			}


		}.bind(this);

		/**
		 * per default will sync & search on 'available' vhosts, unless request path is /vhosts/enabled/
		 * */
		var sync = (req.path.indexOf('enabled') != -1) ? 'enabled' : 'available';
		this.sync_vhosts(sync, callback);

	},
  initialize: function(options){
		this.profile('apache_vhosts_init');//start profiling

		this.parent(options);//override default options

		/**
		 * ******************************
		 * generic Events for GET/PUT/DELETE methods
		 * ******************************
		 * */
		this.addEvent(this.ON_VHOST_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'GET' || req.method == 'PUT' || req.method == 'DELETE'){
				console.log('GET/PUT: ON_VHOST_NOT_FOUND');
				var uri = params[0];
				res.status(404).json({error: 'URI/ServerName: '+uri+' not Found'});
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_NOT_FOUND, function(req, res, next, params){
			console.log('ON_VHOST_INDEX_NOT_FOUND');
			var cfg = params[0];
			var index = params[1];
			var read_vhosts = params[2];

			res.status(404).json({error: 'Index: '+index+' not found for URI/ServerName: '+req.params.uri});

		}.bind(this));

		this.addEvent(this.ON_VHOST_ERROR, function(req, res, next, params){
			console.log('ON_VHOST_ERROR');
			var error = params[0];
			res.status(500).json({error: error});
		}.bind(this));
		/**
		 *
		 * */

		/**
		 * ******************************
		 * POST/add Events
		 * ******************************
		 * */

		this.addEvent(this.ON_NO_VHOST, function(req, res, next, params){
			if(req.method == 'POST'){
				console.log('POST: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				var post_val = this.post_value(req);
				var post_path_available = this.post_path_available(req);

				console.log(post_path_available);

				if(post_val && post_val['ServerName']){//hast the minimun requirement, a ServerName

					//var conf = this.obj_to_conf(post_val, function (conf){
						//this.save(conf, post_path_available);
					//}.bind(this));

					this.save(post_val, post_path_available);

					res.json(post_val);

				}
				else{
					res.status(500).json({error: 'At least URI/ServerName must be specified'});
				}


			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'POST'){
				console.log('POST: ON_VHOST_NOT_FOUND');
				var uri = params[0];

				var post_val = this.post_value(req);
				var post_path_available = this.post_path_available(req);

				console.log(post_path_available);

				if(post_val){//has the minimun requirement, a ServerName
					post_val['ServerName'] = uri;

					//var conf = this.obj_to_conf(post_val, function (conf){
						//this.save(conf, post_path_available);
					//}.bind(this));

					this.save(post_val, post_path_available);

					res.json(post_val);
				}
				else{
					res.status(500).json({error: 'No data sent or incorrect format'});
				}


			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'POST'){
				console.log('POST: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				var post_val = this.post_value(req);
				var post_path_available = this.post_path_available(req);

				console.log(read_vhosts);

				if(post_val){//has the minimun requirement, a ServerName

					if(read_vhosts instanceof Array){
						post_val['ServerName'] = read_vhosts[0]['uri'];
					}
					else{
						post_val['ServerName'] = read_vhosts['uri'];
					}

					//var conf = this.obj_to_conf(post_val, function (conf){
						//this.save(conf, post_path_available);
					//}.bind(this));

					this.save(post_val, post_path_available);

					res.json(post_val);
				}
				else{
					res.status(500).json({error: 'No data sent or incorrect format'});
				}



			}
		}.bind(this));
		/**
		 * *
		 * */

		/**
		 * ******************************
		 * DELETE/remove Events
		 * ******************************
		 * */

		this.addEvent(this.ON_NO_VHOST, function(req, res, next, params){
			if(req.method == 'DELETE'){
				console.log('DELETE: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				res.status(500).json({error: 'URI/ServerName not specified.'});
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'DELETE'){
				console.log('DELETE: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				if(cfg instanceof Array){

					var vhosts= [];
					Array.each(cfg, function(vhost, index){

						this.save(null, read_vhosts[index]['file'], read_vhosts[index]['index']);
						vhosts.push(cfg[index]);

					}.bind(this));

					if(vhosts.length == 0){
						res.status(500).json({error: 'Problem deleting URI/ServerName vhosts'});
					}
					else{
						res.json(vhosts);
					}
				}
				else{
					this.save(null, read_vhosts['file'], read_vhosts['index']);
					res.json(cfg);
				}


			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_FOUND, function(req, res, next, params){
			if(req.method == 'DELETE'){
				console.log('DELETE: ON_VHOST_INDEX_FOUND');
				var cfg = params[0];
				var index = params[1];
				var read_vhosts = params[2];

				this.save(null, read_vhosts[index]['file'], read_vhosts[index]['index']);

				res.json(cfg[index]);
			}
		}.bind(this));

		/**
		 * *
		 * */

		/**
		 * ******************************
		 * GET Events
		 * ******************************
		 * */

		this.addEvent(this.ON_NO_VHOST, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				var send = [];

				for(var i = 0; i < scaned_vhosts.length; i++){
					if(send.indexOf(scaned_vhosts[i].uri) == -1)//not found
						send.push(scaned_vhosts[i].uri);
				}

				res.json(send);
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_PROP_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_VHOST_INDEX_PROP_FOUND');
				var cfg = params[0];
				var index = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				res.json(cfg[index][prop]);
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_PROP_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_VHOST_INDEX_PROP_NOT_FOUND');
				var cfg = params[0];
				var index = params[1];
				var prop = params[2];
				var read_vhosts = params[3];


				res.status(404).json({error: 'Property: '+prop+' not found on URI/ServerName: '+req.params.uri+' at index: '+index});
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_PROP_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_VHOST_PROP_FOUND');
				var cfg = params[0];
				var props = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				res.json(props);
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_PROP_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_VHOST_PROP_NOT_FOUND');
				var cfg = params[0];
				var props = params[1];
				var prop = params[2];
				var read_vhosts = params[3];


				res.status(404).json({error: 'Property: '+prop+' not found on URI/ServerName: '+req.params.uri});
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_VHOST_INDEX_FOUND');
				var cfg = params[0];
				var index = params[1];
				var read_vhosts = params[2];

				res.json(cfg[index]);
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				console.log('GET: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				res.json(cfg);

			}
		}.bind(this));
		/**
		 *
		 * */

		/**
		 * ******************************
		 * PUT/Update Events
		 * ******************************
		 * */
		this.addEvent(this.ON_NO_VHOST, function(req, res, next, params){
			if(req.method == 'PUT'){
				console.log('PUT: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				res.status(500).json({error: 'URI/ServerName not specified.'});
			}

		}.bind(this));

		var save_index_property = function(req, res, next, params){
			if(req.method == 'PUT'){
				console.log('PUT: ON_VHOST_INDEX_PROP_FOUND || ON_VHOST_INDEX_PROP_NOT_FOUND');
				var cfg = params[0];
				var index = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				var put_val = this.put_value(req);

				/**
				 * convert prop to apache.conf and save
				 * */
				//if(cfg[index][prop]){
				//if property is found, check that put_val doens't include it
				put_val = (put_val[prop]) ? put_val[prop] : put_val;
				//}

				var value = {};
				value[prop] = put_val;

				console.log(cfg);
				console.log(value);

				cfg[index] = this.cfg_merge(cfg[index], value);

				//var conf = this.obj_to_conf(cfg[index], function (conf){
					//this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
				//}.bind(this));
				this.save(cfg[index], read_vhosts[index]['file'], read_vhosts[index]['index']);

				res.json(value);
			}
		}.bind(this);

		this.addEvent(this.ON_VHOST_INDEX_PROP_FOUND, save_index_property);
		this.addEvent(this.ON_VHOST_INDEX_PROP_NOT_FOUND, save_index_property);


		this.addEvent(this.ON_VHOST_INDEX_FOUND, function(req, res, next, params){
			if(req.method == 'PUT'){
				console.log('PUT: ON_VHOST_INDEX_FOUND');
				var cfg = params[0];
				var index = params[1];
				var read_vhosts = params[2];

				/**
				 * convert prop to apache.conf and save
				 * */
				cfg[index] = this.cfg_merge(cfg[index], this.put_value(req));

				//var conf = this.obj_to_conf(cfg[index], function (conf){
					//this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
				//}.bind(this));
				this.save(cfg[index], read_vhosts[index]['file'], read_vhosts[index]['index']);

				res.json(cfg[index]);
			}
		}.bind(this));

		var save_property = function(req, res, next, params){
			if(req.method == 'PUT'){
				console.log('PUT: ON_VHOST_PROP_FOUND || ON_VHOST_PROP_NOT_FOUND');
				var cfg = params[0];
				var props = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				var props = [];
				var put_val = this.put_value(req);

				if(cfg instanceof Array){
					Array.each(cfg, function(vhost, index){

						/**
						 * convert prop to apache.conf and save
						 * */
						 //if(vhost[prop]){
						 //if property is found, check that put_val doens't include it
						 put_val = (put_val[prop]) ? put_val[prop] : put_val;
						 //}

						var value = {};
						value[prop] = put_val;

						vhost = this.cfg_merge(vhost, value)

						//var conf = this.obj_to_conf(vhost,  function (conf){
							//this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
						//}.bind(this));
						this.save(vhost, read_vhosts[index]['file'], read_vhosts[index]['index']);

						props[index] = value;

					}.bind(this));

					res.json(props);
				}
				else{
					/**
					 * convert prop to apache.conf and save
					 * */

					//if(cfg[prop]){
					//if property is found, check that put_val doens't include it
					put_val = (put_val[prop]) ? put_val[prop] : put_val;
					//}

					var value = {};
					value[prop] = put_val;

					cfg = this.cfg_merge(cfg, value);

					//var conf = this.obj_to_conf(cfg,  function (conf){
						//this.save(conf, read_vhosts['file'], read_vhosts['index']);
					//}.bind(this));
					this.save(cfg, read_vhosts['file'], read_vhosts['index']);

					res.json(value);
				}
			}
		}.bind(this);

		this.addEvent(this.ON_VHOST_PROP_FOUND, save_property);
		this.addEvent(this.ON_VHOST_PROP_NOT_FOUND, save_property);

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'PUT'){
				console.log('PUT: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				var vhosts = [];
				var put_val = this.put_value(req);

				console.log(put_val);

				if(cfg instanceof Array){

					Array.each(cfg, function(vhost, index){
						/**
						 * convert prop to apache.conf and save
						 * */
						if(!put_val['_value'] && put_val instanceof Object){
							cfg[index] = this.cfg_merge(cfg[index], put_val)
							//var conf = this.obj_to_conf(cfg[index],  function (conf){
								//this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
							//}.bind(this));
							this.save(cfg[index], read_vhosts[index]['file'], read_vhosts[index]['index']);

							vhosts.push(cfg[index]);
						}
					}.bind(this));

					if(vhosts.length == 0){
						res.status(500).json({error: 'Bad formated property value', value: put_val});
					}
					else{
						res.json(vhosts);
					}
				}
				else{
					/**
					 * convert prop to apache.conf and save
					 * */

					if(put_val['_value'] && put_val instanceof Object){
						res.status(500).json({error: 'Bad formated property value', value: put_val});
					}
					else{
						cfg = this.cfg_merge(cfg, put_val);

						//var conf = this.obj_to_conf(cfg,  function (conf){
							//this.save(conf, read_vhosts['file'], read_vhosts['index']);
						//}.bind(this));
						this.save(cfg, read_vhosts['file'], read_vhosts['index']);

						res.json(cfg);
					}
				}
			}
		}.bind(this));
		/**
		 *
		 * */

		this.profile('apache_vhosts_init');//end profiling

		this.log('apache_vhosts', 'info', 'apache_vhosts started');
  },
  put_value: function(req){
		var put_val = null;//value to PUT on property
		if(req.body['value'] || req.body['_value']){
			put_val = (req.body['value']) ? req.body['value'] : req.body['_value'];
		}
		else{
			put_val = req.body;
		}

		return put_val;
	},
	post_value: function(req){
		return (req.body instanceof Object && Object.getLength(req.body) >= 1) ? req.body : null;
	},
	/**
	 * @modified
	 *
	 * */
	post_path_available: function(req){
		var path_available = this.options.conf_path.available;
		var path = (path_available instanceof Array) ? path_available[0] : path_available;

		var uri = (req.params && req.params.uri) ? req.params.uri : req.body.ServerName;

		if(req.query && req.query.dir)
			path+= req.query.dir+'/';

		path+= (req.query && req.query.file) ? req.query.file : uri;

		return path;
	},
	/**
	 * @modified
	 * conf = null to delete vhost
	 * */
  save: function(conf, file, index){
		var original_file = path.posix.basename(file);
		var original_path = path.dirname(file);
		var lock = os.tmpdir()+ '/.' + original_file + '.lock';

		//conf = null;

		var save_file = function(obj, file){
			this.obj_to_conf(obj, function (doc){
				console.log(doc.render());
				fs.writeFileSync(file, doc.render());
			}.bind(this));
		}.bind(this);

		//var result = (conf == null) ? null : conf.render(); //data to be saved


		////test
		////file = os.tmpdir()+ '/.' + original_file + '_' + new Date().getTime();

		//console.log('---save----');
		//console.log(file);
		//console.log(conf);

		fs.open(file, 'wx', (err, fd) => {

			lockFile.lock(lock, {wait: 1000} ,function (lock_err) {

				if(lock_err)
					throw lock_err;


				if (err) {

					if(err.code === 'ENOENT'){//if no exist, it's safe to write
						fs.close(fd);
						save_file(conf, file);
					}
					else if(err.code === 'EEXIST'){

						//console.log('exists....');
						//console.log(file);

						var original_conf = cg.parser( { ConfigFile: file, SlashIsDirectory: true } );
						var original_conf_data = original_conf.getall();
						console.log(original_conf_data);
						console.log(conf);
						//console.log(conf.render());
						////console.log(conf.apache.server);

							////var server = null;

							////apache.create(file, function(err, original_conf) {
								////if (err) {
									//////console.log(err);
									////return;
								////}

								//////don't write to disk when something changes
								//////original_conf.die(file);

								if(Object.keys(original_conf_data).length > 0){//if no empty file

									if(original_conf_data.VirtualHost){
									}
									else if(!original_conf_data.VirtualHost && conf != null){//no vhosts config && adding one
										original_conf_data.VirtualHost = {};
										original_conf_data.VirtualHost[conf.VirtualHost] = {};

										delete conf.VirtualHost;
										original_conf_data.VirtualHost[conf.VirtualHost] = conf;

										save_file(original_conf_data, file);
									}
									//else{
										//original_conf_data.VirtualHost = {}
										//original_conf_data.VirtualHost[conf.VirtualHost] = {};
										//delete conf.VirtualHost;
										//original_conf_data.VirtualHost[conf.VirtualHost] = conf.render();
									//}

									////if(original_conf.apache.server instanceof Array){
										////////console.log('original_conf.apache.server instanceof Array');
										//////if(original_conf.apache.server[index]){
											//////if(conf == null){//delete the vhost

												//////original_conf.apache._remove('server', index);
											//////}
											//////else{
												//////original_conf.apache.server[index] = conf.apache.server;
											//////}
										//////}
										//////else{
											//////throw new Error('Bad index, somthing went wrong!');
										//////}
									////}
									////else{
										////////console.log('original_conf.apache.server NO Array');
										//////if(conf == null){//delete the vhost
											//////console.log('deleting....');
											//////result = null;
										//////}
										//////else{

											//////if(index == 0){
												//////original_conf.apache.server = conf.apache.server;
											//////}
											//////else{
												//////original_conf.apache._add('server');
												//////original_conf.apache.server[1] = conf.apache.server;
											//////}
										//////}

									////}


								}
								else{//empty file...and maybe where vhosts are on original_conf.apache.http....
									console.log('---empty file---');
									save_file(conf, file);
								}


								////fs.writeFileSync(file, result);
								////original_conf.flush();

							////});


					}
					else{
						throw err;
					}
				}
				else{//if no exist, it's safe to write
					fs.close(fd);
					save_file(conf, file);
				}

			lockFile.unlock(lock, function (lock_err) {
				if(lock_err)
					throw lock_err;

				});
			}.bind(this));

		});//open

	},
  /**
   * @protected
   * */
	/**
	 * sync = available || enbaled
	 * */
	sync_vhosts: function(sync, callback){

		if(this.options.conf_path[sync] instanceof Array){
			var vhosts = [];

			var tmp = [];
			Array.each(this.options.conf_path[sync], function(dir, index){

				this.scan_vhosts(
					dir,
					this.options.conf_ext[sync],
					function(cfg){

						vhosts = vhosts.concat(cfg);

						tmp.push(dir);

						if(tmp.length == this.options.conf_path[sync].length){

							callback(vhosts);

						}
					}.bind(this)
				);


			}.bind(this));

		}
		else{
			////console.log(this.options.conf_path[sync]);
			this.scan_vhosts(
				this.options.conf_path[sync],
				this.options.conf_ext[sync],
				callback
			);
		}
	},
	scan_vhosts: function(conf_path, ext, callback){

		//console.log('----conf_path---');
		//console.log(conf_path);

		//try{
		if(fs.statSync(conf_path).isDirectory() == true){

			if(!this[conf_path] || this[conf_path].expire < Date.now()) {
				this[conf_path] = {files: fs.readdirSync(conf_path), expire: Date.now() + 10000}
			}

			var files = this[conf_path].files

			var vhosts_full_conf_path = [];

			////console.log('----FILES-----');
			////console.log(files);

			if(files.length > 0){

				files.sort();//ensure always the same order

				Array.each(files, function(file, index) {


					var full_conf_path = path.join(conf_path, file);

					var isFile = false;

					try{
						isFile = fs.statSync(full_conf_path).isFile();
					}
					catch(e){}

					if(
						isFile == true &&
						( ext == null || path.extname(file).match(ext) )&&
						file.charAt(0) != '.'
					)
					{
						//console.log('---full_conf_path---');
						//console.log(full_conf_path);

						vhosts_full_conf_path.push(full_conf_path);


					}

					if(index == files.length - 1){
						//console.log('----this.read_vhosts_simple----');
						//console.log(full_conf_path);
						this.read_vhosts_simple(vhosts_full_conf_path, function(cfg){

							callback(cfg);
						});

					}
					//else{
						//if(index == files.length - 1){
							//callback(vhosts);
						//}
					//}

				}.bind(this));
			}
			else{
				callback([]);
			}
		}
		else if(fs.statSync(conf_path).isFile() == true){
			this.read_vhosts_simple(full_conf_path, callback);
		}
		//}
		//catch(e){
		//}
	},
	/**
	 * @modified
	 *
	 * */
	read_vhosts_simple: function(files, callback){
		var vhosts = [];

		if(files instanceof Array){
			var tmp_cfg = [];
			var tmp_files = [];

			files.sort();//ensure always the same order

			Array.each(files, function(file, index){

				this.read_vhosts_simple(file, function(cfg){
					////console.log('---recursive----');


					tmp_cfg = tmp_cfg.concat(cfg);

					tmp_files.push(file);

					////console.log('----tmp_cfg-----');
					////console.log(tmp_cfg);

					//if(index == files.length - 1){
					if(tmp_files.length == files.length){
						//console.log(cfg);
						callback(tmp_cfg);
					}
				});

			}.bind(this));

		}
		else{
			var file = files;
			try {
				//var config = cg.parser( { ConfigFile: file, SlashIsDirectory: true, SaveSorted: true } );
				var config = cg.parser( { ConfigFile: file, ApacheCompatible: true, SaveSorted: true } );

				var config_data = config.getall();
				console.log(file);
				//console.log(config_data);
				//console.log(config_data.VirtualHost['*:80']);
				//console.log(config_data.VirtualHost['_default_:443']);

					var vhosts_cfg = this.search_vhosts_cfg(config_data);

					//console.log(vhosts_cfg);

					Array.each(vhosts_cfg, function(cfg, index){
						var all_uris = [];

						var server = this.conf_to_obj(cfg);
						//var VH = Object.keys(cfg)[0];
						//var server = cfg[VH];
						var listen = server.VirtualHost.split(":")[0];

						if(server.ServerName == undefined){
							all_uris.push(listen);
						}
						else{
							all_uris = server.ServerName.clean().split(" ");
						}

						if(server.ServerAlias != undefined){
							all_uris.combine(server.ServerAlias.clean().split(" "));
						}

						Array.each(all_uris, function(uri){

							vhosts.push({
								uri: uri,
								file: file,
								index: index
							});

						});


						console.log('----');
						console.log(all_uris);

					}.bind(this));


					//console.log(vhosts);
					callback(vhosts);


			}
			catch(e){
				console.log(e);
				callback(e);
			}


		}
	},
	/**
	 * @new
	 *
	 * */
	search_vhosts_cfg: function(obj){
		var vhost = [];

		if(typeof obj == 'object'){

			//console.log('Object');
			Object.each(obj, function(item, key){
				if(key == 'VirtualHost'){
					vhost.push(item);
				}
				else{
					var tmp_vhost = this.search_vhosts_cfg(item);
					if(tmp_vhost != null){
						//console.log()
						vhost.combine(tmp_vhost);
					}
				}
			}.bind(this));
		}

		if(vhost.length > 0){
			return vhost;
		}
		else{
			return null;
		}

	},
	/**
	 * @modified
	 *
	 * */
	read_vhosts_full: function(vhosts, callback){
		var cfg = null;

		console.log('read_vhosts_full----');
		console.log(vhosts);
		if(vhosts instanceof Array){
			var tmp_cfg = [];

			//for(var i = 0; i < vhosts.length; i++){
				//var vhost = vhosts[i];

				//this.read_vhosts_full(vhost, function(cfg){
					////console.log('---recursive----');
					////console.log(i);

					//tmp_cfg = tmp_cfg.concat(cfg);

					//if(i == vhosts.length){
						//callback(tmp_cfg);
					//}
				//});
			//}

			//Array.each(vhosts, function(vhost, i){
			//var not_full_array = true;

			for(var i = 0; i < vhosts.length; i++){
				var vhost = vhosts[i];

				this.read_vhosts_full(vhost, function(cfg, vhost){

					////console.log(recursive_index);


					var index = vhosts.indexOf(vhost);
					//console.log('---recursive----');
					//console.log(vhost);
					//console.log(index);

					//tmp_cfg = tmp_cfg.concat(cfg);
					tmp_cfg[index] = Object.clone(cfg);

					//console.log(tmp_cfg);

					//not_full_array = tmp_cfg.contains(undefined);

					if(tmp_cfg.clean().length == vhosts.length){


						////console.log(tmp_cfg);
						callback(tmp_cfg);
					}
				});
			}
			//}.bind(this));

		}
		else{
			var file = vhosts.file;
			var vhost = vhosts.uri;
			var index = vhosts.index;
			try {
				var config = cg.parser( { ConfigFile: file, SlashIsDirectory: true } );
				var config_data = config.getall();
				console.log(file);
				//console.log(config_data);
				//console.log(config_data.VirtualHost['*:80']);
				//console.log(config_data.VirtualHost['_default_:443']);

				var vhosts_cfg = this.search_vhosts_cfg(config_data);

				//console.log('---vhosts_cfg---');
				//console.log(vhosts_cfg);

				console.log('---index---');
				console.log(index);


				var all_uris = [];

				if(vhosts_cfg instanceof Array && index == undefined){
					console.log('---ARRAY----');

					cfg = [];
					Array.each(vhosts_cfg, function(server, index){


						//var VH = Object.keys(tmp_cfg)[0];
						////var server = tmp_cfg[VH];
						//var listen = VH.split(":")[0];
						server = this.conf_to_obj(server);
						var listen = server.VirtualHost.split(":")[0];

						//all_uris = server.ServerName.clean().split(" ");
						if(server.ServerName == undefined){
							all_uris.push(listen);
						}
						else{
							all_uris = server.ServerName.clean().split(" ");
						}

						if(server.ServerAlias != undefined){
							all_uris.combine(server.ServerAlias.clean().split(" "));
						}

						Array.each(all_uris, function(uri){

							if(vhost == uri){
								cfg.push(server);
							}

						}.bind(this));

					}.bind(this));


				}
				else{
					if(vhosts_cfg instanceof Array){
						var server = (index != undefined) ? vhosts_cfg[index] : vhosts_cfg;
					}
					else{
						var server = vhosts_cfg;
					}


					//var VH = Object.keys(server)[0];
					////var server = server[VH];
					//var listen = VH.split(":")[0];
					server = this.conf_to_obj(server);
					var listen = server.VirtualHost.split(":")[0];

					console.log('---server---');
					console.log(server);

					//console.log(server);

					//if(server.ServerName instanceof Array){
						//Array.each(server.ServerName, function(ServerName){
							//var tmp_uris = ServerName.clean().split(" ");
							//all_uris = all_uris.concat(tmp_uris);
						//}.bind(this));
					//}
					//else if(server.ServerName){
						//all_uris = server.ServerName.clean().split(" ");
					//}

					if(server.ServerName == undefined){
						all_uris.push(listen);
					}
					else{
						all_uris = server.ServerName.clean().split(" ");
					}

					if(server.ServerAlias != undefined){
						all_uris.combine(server.ServerAlias.clean().split(" "));
					}

					Array.each(all_uris, function(uri){

						if(vhost == uri){
							cfg = server;
						}

					}.bind(this));

					//console.log('---NO ARRAY----');
					//console.log(server.ServerName._value);
				}

				//console.log('---server---');
				//console.log(cfg);
				////console.log(cfg);
				callback(cfg, vhosts);


			}
			catch(e){
				console.log(e);
				callback(e);
			}






		}	//else

	},
  conf_to_obj: function(conf){
		//console.log('---conf_to_obj----');
		////console.log(conf);

		var cfg = {};
		var VH = Object.keys(conf)[0];
		cfg = conf[VH];
		cfg.VirtualHost = VH;

		//Object.each(conf, function(value, prop){
			//////console.log('prop: '+prop);
			//if(prop.charAt(0) != '_' && prop != 'toString'){
				//////console.log('prop: '+prop);
				//////console.log('value: '+value._comments);

				//if(value instanceof Array){
					//cfg[prop] = [];

					//Array.each(value, function(val){

						////cfg[prop].push(val._value);
						//var propertys = this.conf_to_obj(val);

						//if(Object.getLength(propertys) > 0){
							//var obj = {
								//'_value' : val._value
							//};

							//if(val._comments && this.comments)
								//obj['_comments'] = val._comments;

							//cfg[prop].push(
								//Object.merge(
									//obj,
									//propertys
								//)
							//);

						//}
						//else{
							//cfg[prop].push(val._value);
						//}

					//}.bind(this));
				//}
				////else if(!value._value){
					////cfg[prop] = this.conf_to_obj(value);
				////}
				//else{
					//var propertys = this.conf_to_obj(value);

					//////console.log(propertys);

					////if(Object.getLength(propertys) > 0){
						//cfg[prop] = Object.merge({
							//'_value' : value._value
						//},
						//propertys);

						//if(this.comments && value._comments && value._comments.length > 0)//if there are comments, attach it
							//cfg[prop]['_comments'] = value._comments;

						//if(Object.getLength(cfg[prop]) == 1)//if there are no other keys, except "_value", return it as property = value
							//cfg[prop] = cfg[prop]['_value'];

					////}
					////else{
						////cfg[prop] = value._value;
					////}

					//////console.log(this.conf_to_obj(value));
				//}
			//}

		//}.bind(this));

		return cfg;
	},

	obj_to_conf: function(obj, callback){
		var conf = new Tonto();

		if(obj != null){


			//console.log(conf);

			var lowerFL = function(string) {
					return string.charAt(0).toLowerCase() + string.slice(1);
			}

			var traverse_obj = function(obj, subDirective){

				Object.each(obj, function(value, key){
					var prop = lowerFL(key);

					try{
						if(typeof value == 'string'){
							console.log('---string---');
							console.log(prop);
							prop = changeCase.camelCase(prop);
							subDirective[prop](value);
						}
						else if(value instanceof Array){
							//console.log('---array---');
							//console.log(prop);
							Array.each(value, function(val){
								subDirective[prop](val);
							});

						}
						else{
							//console.log('---object---');
							//console.log(value);
							Object.each(value, function(sub_value, sub_key){
								//console.log('---subkey---');
								//console.log(sub_key);

								subDirective[prop](sub_key, function(sd){
									traverse_obj(sub_value, sd)
								});
							});

						}
					}
					catch(e){
						if(e instanceof TypeError){
							console.log(prop + ': unknown (define a Custom Directive or Custom Block)');
						}
						//else{
							console.log(e);
						//}
					}


				}.bind(this));

				//return subDirective;
			}


			if(obj.VirtualHost){
				conf.virtualHost(obj.VirtualHost, function (vh) {
					delete obj.VirtualHost;

					//var virtualhost = traverse_obj(obj, vh);
					traverse_obj(obj, vh);

				});
			}
			else{
				traverse_obj(obj, conf);
			}
			//console.log(conf.render());
		}

		callback(conf);
	},
	/**
	* change "location /" on Array: location[][_value]=/&location[][limit_req]=zone=default burst=5
	* , and with a comment: location[][_value]=/&location[][limit_req]=zone=default burst=5&location[][_comments][]=a comment
	* add "location /colo" on Array: location[][_value]=/colo&location[][limit_req]=zone=default burst=5
	* change include Array order: include[1]=/etc/apache2/conf.d/no_log.conf&include[0]=/etc/apache2/conf.d/errors.conf
	* convert "set" to Array: set[]=$proxy "http://educativa"&set[]=$bar "foo"
	* convert "if" Object to Array: if[][_value]=BAR&if[][rewrite]=FOO
	* delete "location": location=
	*/
	cfg_merge: function(orig, cfg){
		//var config = {};

		//config = Object.merge(orig, cfg);
		Object.each(cfg, function(value, prop){
			if(!orig[prop] && (!value || value == '')){//if property doesn't exist and value not empty or undefined, add it
				orig[prop] = value;
			}
			else{
				if(!value || value == '' || value == null){//if value empty or undefined, delete it
					delete orig[prop];
				}
				else if(value instanceof Array){

					if (orig[prop] instanceof Array){//if original it's also an Array

						var found = false;

						/**
						 * check what type of data it is:
						 * simple as include: [file, file2, fileN]
						 * complex as location: [{ _value: '/', proxy_pass: '$proxy' }]
						 * */
						Array.each(value, function(inside_val, inside_key){
							if(inside_val['_value']){
								/**
								 * if it's and object (ex: location: { _value: '/' }), we need to search it inside original
								 * */
								Array.each(orig[prop], function(orig_val, orig_key){

									if(orig_val['_value'] && (orig_val['_value'] == inside_val['_value'])){//match, replace it
										found = true;

										if(!inside_val || inside_val == '' || inside_val == null){//if value empty or undefined, delete it
											delete orig[prop][orig_key];
										}
										else{
											orig[prop][orig_key] = inside_val;
										}
									}

								});

								if(!found && (!inside_val || inside_val == ''))//no match, push it (unless no inside_val)
									orig[prop].push(inside_val);

							}
							else{//simple values (ex: include[file, file2, fileN])
								if(!inside_val || inside_val == '' || inside_val == null){//if value empty or undefined, delete it
									delete orig[prop][inside_key];
								}
								else{
									orig[prop][inside_key] = inside_val;
								}
								//orig[prop][inside_key] = inside_val;
							}
						});
					}
					else if (orig[prop] instanceof Object){//if original it's an Object, convert it to an array, saving orginal value
						var tmp_val = orig[prop];
						orig[prop] = value;
						orig[prop].unshift(tmp_val);
					}
					else{//if original not Array, just replace it
						orig[prop] = value;
					}
				}
				//else if(value instanceof Object){
					//if (orig[prop] instanceof Object){//if original it's also an Object
					//}
					//else{//if original not Object, just replace it
						//orig[prop] = value;
					//}
				//}
				else{//simple values
					orig[prop] = value;
				}

			}

		});

		//Object.each(cfg, function(value, prop){
			//if(!value || value == '')
				//delete orig[prop];
				////delete cfg[prop];
		//});


		return orig;
	},
	/**
	 * return just 1 match of vhosts, even if it is multiple times in a file,
	 * vhosts: {uri, file}
	 * uri: vhost to search
	 * */
	search_unique_vhost: function(vhosts, uri){
		var tmp_files = [];//keep track of wich files were already included
		var read_vhosts = [];

		for(var i = 0; i < vhosts.length; i++){//search uri on all vhosts, there may be multiple matchs on same or diferent files

			if(vhosts[i].uri == uri){//found

				if(tmp_files.indexOf(vhosts[i].file) == -1){//if file was not include already, include {uri, file}
					read_vhosts.push(vhosts[i]);
				}

				tmp_files.push(vhosts[i].file);
			}

		}

		return read_vhosts;
	},
	/**
	 * return every match of vhost
	 * vhosts: {uri, file}
	 * uri: vhost to search
	 * */
	search_vhost: function(vhosts, uri){
		var read_vhosts = [];

		for(var i = 0; i < vhosts.length; i++){//search uri on all vhosts, there may be multiple matchs on same or diferent files

			if(vhosts[i].uri == uri){//found
				read_vhosts.push(vhosts[i]);
			}

		}

		return read_vhosts;
	},
});
