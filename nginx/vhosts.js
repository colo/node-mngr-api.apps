'use strict'

var	os = require('os'),
	path = require('path'),
	util = require('util'),
	fs = require('fs'),
	nginx = require('nginx-conf').NginxConfFile,
	lockFile = require('lockfile');

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/vhosts/prod.conf')
      : require('./config/vhosts/dev.conf');

const Debug = require('debug')
const debug = Debug('apps:nginx')
const async = require('async')

module.exports = new Class({
  Extends: App,


  add: function(req, res, next){
		debug(req.body);
		debug(req.params);
		debug(req.query);
		//throw new Error();

		this.comments = (req.query && req.query.comments == "false") ? false : true;

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
	 *
	 * first precedence param
	 * @first: return first entry
	 * @first=n: return first N entries (ex: ?first=7, first 7 entries)
	 *
	 * second precedence param
	 * @last: return last entry
	 * @last=n: return last N entries (ex: ?last=7, last 7 entries)
	 *
	 * third precedence params
	 * @start=n: return from N entry to last or @end (ex: ?start=0, return all entries)
	 * @end=n: set last N entry for @start (ex: ?start=0&end=9, return first 10 entries)
	 *
	 * status = 206 partial list | 200 full list
	 * */
	get: function(req, res, next){
		debug('get %o', req.body)

		this.comments = (req.query && req.query.comments == "false") ? false : true;

		let uri, index, prop
		if(req.body && req.body.uri){
			uri = req.body.uri
		}
		else{
			uri = req.params.uri;
		}

		if(req.body && req.body.index){
			index = req.body.index
		}
		else if(!req.body){
			// is Numberic index or a property String - mootols 1.6 vs 1.5
			index = (Number.convert) ? Number.convert(req.params.prop_or_index) : Number.from(req.params.prop_or_index);
		}

		if(req.body && req.body.prop){
			prop = req.body.prop
		}
		else if(!req.body){
			//if index was String, take it as property
			prop = (index == null) ? req.params.prop_or_index : req.params.prop;
		}

		var callback = function(scaned_vhosts){
			debug('get %o %o %s %d', req.body, uri, prop, index)
			// process.exit(1)

			//debug('---scaned_vhosts---');
			//debug(scaned_vhosts);

			var send = null;

			if(uri){//if vhost uri sent

				//var read_vhosts = this.search_unique_vhost(vhosts, req.params.uri);
				var read_vhosts = this.search_vhost(scaned_vhosts, uri);

				// debug('get read_vhosts %o', read_vhosts)
				// process.exit(1)

				// if(read_vhosts.length == 0){//no match
				if(Object.getLength(read_vhosts) === 0){

					this.fireEvent(this.ON_VHOST_NOT_FOUND, [req, res, next, [uri]]);

				}
				else{

					// if(read_vhosts.length == 1)
					// if(Object.getLength(read_vhosts) === 1)//if only one match, should return a vhost {}, not an [] of vhosts
					// 	read_vhosts = read_vhosts[Object.keys(read_vhosts)[0]];

					//with {uri,file} info, read whole vhost config
					this.read_vhosts_full(read_vhosts, function(cfg){

						debug('get read_vhosts_full %o', cfg)
						// process.exit(1)

						if(prop || index){
						//if(index >= 0 || prop != undefined){

							// if(cfg instanceof Array){//multiple vhosts
							if(!cfg.listen || cfg.server_name){

								if(index != null && !Number.isNaN(index)){//search for vhost matching index on []

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

									// var props = [];
									let props = {}
									let cfg_count = 0
									Object.each(cfg, function(vhost, uri){
										debug('vhost %o', vhost)
										// Array.each(vhost, function(real_vhost, index){
										for(let index = 0; index < vhost.length; index++){
											let real_vhost = vhost[index]
											debug('vhost %o', real_vhost)
											// process.exit(1)

												if(real_vhost[prop]){
													if(!props[uri]) props[uri] = []

													props[uri][index] = real_vhost[prop];
												}

												if(cfg_count === Object.getLength(cfg) - 1 && index === vhost.length - 1){
													// if(props.length > 0){
													if(Object.getLength(props) > 0 ){
														this.fireEvent(this.ON_VHOST_PROP_FOUND, [req, res, next, [cfg, props, prop, read_vhosts]]);
													}
													else{
														this.fireEvent(this.ON_VHOST_PROP_NOT_FOUND, [req, res, next, [cfg, props, prop, read_vhosts]]);
													}
												}
										// }.bind(this))
										}

										cfg_count++
									}.bind(this))




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
	 * &listen=108.163.170.178:80&server_name=campus.apci.org.ar&location[value]=\&location[limit_req]=zone=default burst=4
	 * &include[]=/etc/nginx/conf.d/no_log.conf2&include[]=/etc/nginx/conf.d/errors.conf
	 *
	 * */
	update: function(req, res, next){
		debug(req.body);
		debug(req.params);
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
		this.profile('nginx_vhosts_init');//start profiling

		this.parent(options);//override default options

		/**
		 * ******************************
		 * generic Events for GET/PUT/DELETE methods
		 * ******************************
		 * */
		this.addEvent(this.ON_VHOST_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'GET' || req.method == 'PUT' || req.method == 'DELETE'){
				debug('GET/PUT: ON_VHOST_NOT_FOUND');
				var uri = params[0];
				res.status(404).json({error: 'URI/server_name: '+uri+' not Found'});
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_NOT_FOUND, function(req, res, next, params){
			debug('ON_VHOST_INDEX_NOT_FOUND');
			var cfg = params[0];
			var index = params[1];
			var read_vhosts = params[2];

			res.status(404).json({error: 'Index: '+index+' not found for URI/server_name: '+req.params.uri});

		}.bind(this));

		this.addEvent(this.ON_VHOST_ERROR, function(req, res, next, params){
			debug('ON_VHOST_ERROR');
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
				debug('POST: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				var post_val = this.post_value(req);
				var post_path_available = this.post_path_available(req);

				debug(post_path_available);

				if(post_val && post_val['server_name']){//hast the minimun requirement, a server_name

					var conf = this.obj_to_conf(post_val, function (conf){
						this.save(conf, post_path_available);
					}.bind(this));

					res.json(post_val);

				}
				else{
					res.status(500).json({error: 'At least URI/server_name must be specified'});
				}


			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'POST'){
				debug('POST: ON_VHOST_NOT_FOUND');
				var uri = params[0];

				var post_val = this.post_value(req);
				var post_path_available = this.post_path_available(req);

				debug(post_path_available);

				if(post_val){//has the minimun requirement, a server_name
					post_val['server_name'] = uri;

					var conf = this.obj_to_conf(post_val, function (conf){
						this.save(conf, post_path_available);
					}.bind(this));

					res.json(post_val);
				}
				else{
					res.status(500).json({error: 'No data sent or incorrect format'});
				}


			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'POST'){
				debug('POST: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				var post_val = this.post_value(req);
				var post_path_available = this.post_path_available(req);

				debug(read_vhosts);

				if(post_val){//has the minimun requirement, a server_name

					if(read_vhosts instanceof Array){
						post_val['server_name'] = read_vhosts[0]['uri'];
					}
					else{
						post_val['server_name'] = read_vhosts['uri'];
					}

					var conf = this.obj_to_conf(post_val, function (conf){

						try {
							this.save(conf, post_path_available);
							res.json(post_val);
						}
						catch(e){
							res.status(500).json({error: e.message});
						}
					}.bind(this));


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
				debug('DELETE: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				res.status(500).json({error: 'URI/server_name not specified.'});
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'DELETE'){
				debug('DELETE: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				if(cfg instanceof Array){

					var vhosts= [];
					Array.each(cfg, function(vhost, index){

						this.save(null, read_vhosts[index]['file'], read_vhosts[index]['index']);
						vhosts.push(cfg[index]);

					}.bind(this));

					if(vhosts.length == 0){
						res.status(500).json({error: 'Problem deleting URI/server_name vhosts'});
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
				debug('DELETE: ON_VHOST_INDEX_FOUND');
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
				debug('GET: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				var vhosts = [];
				var send = [];

				var URI = req.protocol+'://'+req.hostname+':'+process.env.PORT+this.express().mountpath+'/';

				var status = 206; //206 partial list | 200 full list

				var links = {};
				links.first = URI+'?first';
				links.last = URI+'?last';

				links.next = null;
				links.prev = null;

				var range_start = 0;
				var range_end = 0;

				for(var i = 0; i < scaned_vhosts.length; i++){
					//doesn't add duplicates
					if(vhosts.indexOf(scaned_vhosts[i].uri) == -1)//not found
						vhosts.push(scaned_vhosts[i].uri);
				}

				if(req.query.first != undefined){

					if(req.query.first == '' || !(req.query.first > 0)){

						links.next = URI+'?start=1&end=2';
						links.prev = links.last;

						range_start = 0;
						range_end = 0;

						send.push(vhosts[0]);


					}
					else{
						var first = (new Number(req.query.first) < vhosts.length) ? new Number(req.query.first) : vhosts.length - 1;

						for(var i = 0; i < first; i++){
							send[i] = vhosts[i];
						}

						var next = {};
						next.start = first;

						var next_end = next.start + next.start - 1;
						next.end = (next_end < vhosts.length) ? next_end : vhosts.length - 1;


						links.next = URI+'?start='+next.start+'&end='+next.end;
						links.prev = links.last+'='+req.query.first;

						range_start = 0;
						range_end = send.length - 1;

					}
				}
				else if(req.query.last != undefined){

					if(req.query.last == '' || !(req.query.last > 0)){
						//debug('LAST');

						var prev = {};
						prev.start = prev.end = vhosts.length - 2;

						links.next = links.first;
						links.prev = URI+'?start='+prev.start+'&end='+prev.end;

						send.push(vhosts[vhosts.length - 1]);

						range_start = vhosts.length - 1;
						range_end = vhosts.length - 1;

					}
					else{
						var last = (new Number(req.query.last) < vhosts.length) ? new Number(req.query.last) : vhosts.length - 1;

						for(var i = vhosts.length - last; i <= vhosts.length - 1; i++){
							send.push(vhosts[i]);
						}

						var prev = {};
						prev.end = vhosts.length - last - 1 ;
						prev.start = ((prev.end - last + 1) > 0) ? (prev.end - last + 1) : 0;

						links.next = links.first+'='+last;
						links.prev = URI+'?start='+prev.start+'&end='+prev.end;

						range_start = vhosts.length - last;
						range_end = vhosts.length - 1;

					}

				}
				else if(req.query.start != undefined && req.query.start >= 0){
					var end = null;
					var start = (new Number(req.query.start) < vhosts.length) ? new Number(req.query.start) : vhosts.length - 1;

					if(req.query.end != undefined && new Number(req.query.end) >= start){
						end = (new Number(req.query.end) < vhosts.length) ? new Number(req.query.end) : vhosts.length -1;
					}
					else{
						end = vhosts.length - 1;
					}

					for(var i = start; i <= end; i++){
						send.push(vhosts[i]);
					}

					var next = {};
					next.start = ((end + 1) < vhosts.length) ? (end + 1) : 0;
					next.end = (next.start + (end - start) < vhosts.length) ? next.start + (end - start) : vhosts.length -1;

					var prev = {};
					prev.end = start - 1;
					prev.start = (prev.end - (end - start) > 0) ? prev.end - (end - start) : 0;


					links.next = URI+'?start='+next.start+'&end='+next.end;
					links.prev = URI+'?start='+prev.start+'&end='+prev.end;

					range_start = start;
					range_end = end;
				}
				else{

					links.next = links.last;
					links.prev = links.first;

					status = 200;
					send = vhosts;
				}

				if(send.length == vhosts.length)//when 'start=0&end=vhosts.length'
					status = 200;

				if(status != 200){//set range Header
					res.set('Content-Range', range_start+'-'+range_end+'/'+vhosts.length);
				}

				res.status(status).links(links).json(send);
				//res.json(send);
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_PROP_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				debug('GET: ON_VHOST_INDEX_PROP_FOUND');
				var cfg = params[0];
				var index = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				res.json(cfg[index][prop]);
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_PROP_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				debug('GET: ON_VHOST_INDEX_PROP_NOT_FOUND');
				var cfg = params[0];
				var index = params[1];
				var prop = params[2];
				var read_vhosts = params[3];


				res.status(404).json({error: 'Property: '+prop+' not found on URI/server_name: '+req.params.uri+' at index: '+index});
			}

		}.bind(this));

		this.addEvent(this.ON_VHOST_PROP_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				debug('GET: ON_VHOST_PROP_FOUND');
				var cfg = params[0];
				var props = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				res.json(props);
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_PROP_NOT_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				debug('GET: ON_VHOST_PROP_NOT_FOUND');
				var cfg = params[0];
				var props = params[1];
				var prop = params[2];
				var read_vhosts = params[3];


				res.status(404).json({error: 'Property: '+prop+' not found on URI/server_name: '+req.params.uri});
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_INDEX_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				debug('GET: ON_VHOST_INDEX_FOUND');
				var cfg = params[0];
				var index = params[1];
				var read_vhosts = params[2];

				/*debug('index: '+index);
				debug('cfg:');
				debug(read_vhosts);*/

				res.json(cfg[index]);
			}
		}.bind(this));

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'GET'){
				debug('GET: ON_VHOST_FOUND');
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
				debug('PUT: ON_NO_VHOST');
				var scaned_vhosts = params[0];

				res.status(500).json({error: 'URI/server_name not specified.'});
			}

		}.bind(this));

		var save_index_property = function(req, res, next, params){
			if(req.method == 'PUT'){
				debug('PUT: ON_VHOST_INDEX_PROP_FOUND || ON_VHOST_INDEX_PROP_NOT_FOUND');
				var cfg = params[0];
				var index = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				var put_val = this.put_value(req);

				/**
				 * convert prop to nginx.conf and save
				 * */
				//if(cfg[index][prop]){
				//if property is found, check that put_val doens't include it
				put_val = (put_val[prop]) ? put_val[prop] : put_val;
				//}

				var value = {};
				value[prop] = put_val;

				debug(cfg);
				debug(value);

				cfg[index] = this.cfg_merge(cfg[index], value);

				var conf = this.obj_to_conf(cfg[index], function (conf){
					this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
				}.bind(this));

				res.json(value);
			}
		}.bind(this);

		this.addEvent(this.ON_VHOST_INDEX_PROP_FOUND, save_index_property);
		this.addEvent(this.ON_VHOST_INDEX_PROP_NOT_FOUND, save_index_property);


		this.addEvent(this.ON_VHOST_INDEX_FOUND, function(req, res, next, params){
			if(req.method == 'PUT'){
				debug('PUT: ON_VHOST_INDEX_FOUND');
				var cfg = params[0];
				var index = params[1];
				var read_vhosts = params[2];

				/**
				 * convert prop to nginx.conf and save
				 * */
				cfg[index] = this.cfg_merge(cfg[index], this.put_value(req));

				var conf = this.obj_to_conf(cfg[index], function (conf){
					this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
				}.bind(this));

				res.json(cfg[index]);
			}
		}.bind(this));

		var save_property = function(req, res, next, params){
			if(req.method == 'PUT'){
				debug('PUT: ON_VHOST_PROP_FOUND || ON_VHOST_PROP_NOT_FOUND');
				var cfg = params[0];
				var props = params[1];
				var prop = params[2];
				var read_vhosts = params[3];

				var props = [];
				var put_val = this.put_value(req);

				if(cfg instanceof Array){
					Array.each(cfg, function(vhost, index){

						/**
						 * convert prop to nginx.conf and save
						 * */
						 //if(vhost[prop]){
						 //if property is found, check that put_val doens't include it
						 put_val = (put_val[prop]) ? put_val[prop] : put_val;
						 //}

						var value = {};
						value[prop] = put_val;

						vhost = this.cfg_merge(vhost, value)

						var conf = this.obj_to_conf(vhost,  function (conf){
							this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
						}.bind(this));

						props[index] = value;

					}.bind(this));

					res.json(props);
				}
				else{
					/**
					 * convert prop to nginx.conf and save
					 * */

					//if(cfg[prop]){
					//if property is found, check that put_val doens't include it
					put_val = (put_val[prop]) ? put_val[prop] : put_val;
					//}

					var value = {};
					value[prop] = put_val;

					cfg = this.cfg_merge(cfg, value);

					var conf = this.obj_to_conf(cfg,  function (conf){
						this.save(conf, read_vhosts['file'], read_vhosts['index']);
					}.bind(this));

					res.json(value);
				}
			}
		}.bind(this);

		this.addEvent(this.ON_VHOST_PROP_FOUND, save_property);
		this.addEvent(this.ON_VHOST_PROP_NOT_FOUND, save_property);

		this.addEvent(this.ON_VHOST_FOUND, function(req, res, next, params){
			if(req.method == 'PUT'){
				debug('PUT: ON_VHOST_FOUND');
				var cfg = params[0];
				var read_vhosts = params[1];

				var vhosts = [];
				var put_val = this.put_value(req);

				debug(put_val);

				if(cfg instanceof Array){

					Array.each(cfg, function(vhost, index){
						/**
						 * convert prop to nginx.conf and save
						 * */
						if(!put_val['_value'] && put_val instanceof Object){
							cfg[index] = this.cfg_merge(cfg[index], put_val)
							var conf = this.obj_to_conf(cfg[index],  function (conf){
								this.save(conf, read_vhosts[index]['file'], read_vhosts[index]['index']);
							}.bind(this));

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
					 * convert prop to nginx.conf and save
					 * */

					if(put_val['_value'] && put_val instanceof Object){
						res.status(500).json({error: 'Bad formated property value', value: put_val});
					}
					else{
						cfg = this.cfg_merge(cfg, put_val);

						var conf = this.obj_to_conf(cfg,  function (conf){
							this.save(conf, read_vhosts['file'], read_vhosts['index']);
						}.bind(this));

						res.json(cfg);
					}
				}
			}
		}.bind(this));
		/**
		 *
		 * */

		this.profile('nginx_vhosts_init');//end profiling

		this.log('nginx_vhosts', 'info', 'nginx_vhosts started');
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
	post_path_available: function(req){
		var path_available = this.options.conf_path.available;
		var path = (path_available instanceof Array) ? path_available[0] : path_available;

		var uri = (req.params && req.params.uri) ? req.params.uri : req.body.server_name;

		if(req.query && req.query.dir)
			path+= req.query.dir+'/';

		path+= (req.query && req.query.file) ? req.query.file : uri;

		return path;
	},
	/**
	 * conf = null to delete vhost
	 * */
  save: function(conf, file, index){
		var original_file = path.posix.basename(file);
		var original_path = path.dirname(file);
		var lock = os.tmpdir()+ '/.' + original_file + '.lock';

		//test
		//file = os.tmpdir()+ '/.' + original_file + '_' + new Date().getTime();


		fs.open(file, 'wx', (err, fd) => {

			lockFile.lock(lock, {wait: 1000} ,function (lock_err) {

				if(lock_err)
					throw lock_err;


				if (err) {
					if(err.code === 'EEXIST'){
						debug('exists....');
						debug(file);
						//debug(conf.nginx.server);

							//var server = null;
							try{
								nginx.create(file, function(err, original_conf) {
									if (err) {
										//debug(err);
										//return err;
										throw err;
									}

									//don't write to disk when something changes
									//original_conf.die(file);

									if(original_conf.nginx.server){

										if(original_conf.nginx.server instanceof Array){
											//debug('original_conf.nginx.server instanceof Array');
											if(original_conf.nginx.server[index]){
												if(conf == null){//delete the vhost

													original_conf.nginx._remove('server', index);
												}
												else{
													original_conf.nginx.server[index] = conf.nginx.server;
												}
											}
											else{
												throw new Error('Bad index['+index+'], somthing went wrong!');
											}
										}
										else{
											//debug('original_conf.nginx.server NO Array');
											if(conf == null){//delete the vhost
												debug('deleting....');
												original_conf.nginx._remove('server');
											}
											else{

												if(index == 0){
													original_conf.nginx.server = conf.nginx.server;
												}
												else{
													original_conf.nginx._add('server');
													original_conf.nginx.server[1] = conf.nginx.server;
												}
											}

										}


									}
									else{//empty file...and maybe where vhosts are on original_conf.nginx.http....
										original_conf.nginx._add('server');
										original_conf.nginx.server = conf.nginx.server;
									}

									original_conf.flush();

								});
							}
							catch(err){
								throw err;
							}

					}
					else{
						throw err;
					}
				}
				else{//if no exist, it's safe to write
					fs.close(fd);

					fs.writeFile(file, '', (err) => {//create empty

								conf.live(file);
								conf.flush();

					});


				}

			lockFile.unlock(lock, function (lock_err) {
					if(lock_err)
					throw lock_err;

				});
			});

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

				//debug('this.scan_vhosts dir: '+dir);

				this.scan_vhosts(
					dir,
					this.options.conf_ext[sync],
					function(cfg){

						/*debug('this.scan_vhosts cfg: ');
						debug(cfg);*/

						vhosts = vhosts.concat(cfg);

						tmp.push(dir);

						if(tmp.length == this.options.conf_path[sync].length){
							/**
							 * sort vhosts by URI alphabetically [&& file [ && index]], to ensure same order always
							 * */
							vhosts.sort(function(a, b){
								if(a.uri < b.uri) return -1;
								if(a.uri > b.uri) return 1;

								if(a.file < b.file) return -1;
								if(a.file > b.file) return 1;

								if(a.index < b.index) return -1;
								if(a.index > b.index) return 1;

								return 0;
							});

							/*debug('this.scan_vhosts vhosts');
							debug(vhosts);*/

							callback(vhosts);
						}
					}.bind(this)
				);


			}.bind(this));

		}
		else{
			////debug(this.options.conf_path[sync]);
			this.scan_vhosts(
				this.options.conf_path[sync],
				this.options.conf_ext[sync],
				callback
			);
		}
	},
	scan_vhosts: function(conf_path, ext, callback){

		//debug('----conf_path---');
		//debug(conf_path);

		//try{
		if(fs.statSync(conf_path).isDirectory() == true){

			if(!this[conf_path] || this[conf_path].expire < Date.now()) {
				this[conf_path] = {files: fs.readdirSync(conf_path), expire: Date.now() + 10000}
			}

			var files = this[conf_path].files
			var vhosts_full_conf_path = [];

			////debug('----FILES-----');
			////debug(files);

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
						( ext == null || path.extname(file).match(ext)) &&
						file.charAt(0) != '.'
					)
					{
						//debug('---full_conf_path---');
						//debug(full_conf_path);

						vhosts_full_conf_path.push(full_conf_path);


					}

					if(index == files.length - 1){

						this.read_vhosts_simple(vhosts_full_conf_path, function(cfg){
							/*debug('----this.read_vhosts_simple----');
							debug(vhosts_full_conf_path);
							debug(cfg);*/

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
	read_vhosts_simple: function(files, callback){
		var vhosts = [];

		if(files instanceof Array){
			var tmp_cfg = [];
			var tmp_files = [];

			files.sort();//ensure always the same order

			Array.each(files, function(file, index){

				this.read_vhosts_simple(file, function(cfg){
					////debug('---recursive----');


					tmp_cfg = tmp_cfg.concat(cfg);

					tmp_files.push(file);

					////debug('----tmp_cfg-----');
					////debug(tmp_cfg);

					//if(index == files.length - 1){
					if(tmp_files.length == files.length){
						//debug(cfg);
						callback(tmp_cfg);
					}
				});

			}.bind(this));

		}
		else{
			var file = files;
			nginx.create(file, function(err, conf) {
				if (err) {
					//debug(err);
					return;
				}

				//don't write to disk when something changes
				conf.die(file);

				var all_uris = [];

				if(conf.nginx.server instanceof Array){
					Array.each(conf.nginx.server, function(server, index){
						if(server.server_name._value == undefined){
							Array.each(server.server_name,function(server_name){

								var tmp_uris = server_name._value.clean().split(" ");
								all_uris = all_uris.concat(tmp_uris);

							}.bind(this));
						}
						else{
							all_uris = server.server_name._value.clean().split(" ");
						}

						Array.each(all_uris, function(uri){

							vhosts.push({
								uri: uri,
								file: file,
								index: index
							});

						});

					});
				}
				else if(conf.nginx.server){
					if(conf.nginx.server.server_name instanceof Array){
						Array.each(conf.nginx.server.server_name,function(server_name){
							var tmp_uris = server_name._value.clean().split(" ");
							all_uris = all_uris.concat(tmp_uris);
						}.bind(this));
					}
					else{
						all_uris = conf.nginx.server.server_name._value.clean().split(" ");
					}

					Array.each(all_uris, function(uri){

						vhosts.push({
							uri: uri,
							file: file,
							index: 0
						});

					});

				}

				/**
				 * sort vhosts by index, to ensure same order always
				 * */
				vhosts.sort(function(a, b){
					if(a.index < b.index) return -1;
					if(a.index > b.index) return 1;
					return 0;
				});

				/*debug('this.read_vhosts_simple vhosts');
				debug(vhosts);*/

				callback(vhosts);

			}.bind(this));
		}
	},
	read_vhosts_full: function(vhosts, callback){
		var cfg = null;

		if(vhosts && vhosts.file){//one vhost only
			var file = vhosts.file;
			var vhost = vhosts.uri;
			var index = vhosts.index;

			nginx.create(file, function(err, conf) {
				if (err) {
					//debug(err);
					return;
				}

				//don't write to disk when something changes
				conf.die(file);

				////debug('read_vhost');
				////debug(conf.nginx.server);

				//Array.each(conf.nginx.server, function(server){
					////debug(server.server_name._value.clean().split(" "));
				//});

				var all_uris = [];

				if(conf.nginx.server instanceof Array && index == undefined){
					cfg = [];

					Array.each(conf.nginx.server, function(server){
						all_uris = server.server_name._value.clean().split(" ");


						//var tmp_cfg = {};

						Array.each(all_uris, function(uri){

							if(vhost == uri){
								//tmp_cfg = {
									//server_name: uri,
									//listen: server.listen._value,
								//};

								cfg.push(this.conf_to_obj(server));

							}



						}.bind(this));

					}.bind(this));
				}
				else{
					if(conf.nginx.server instanceof Array){
						var server = (index != undefined) ? conf.nginx.server[index] : conf.nginx.server;
					}
					else{
						var server = conf.nginx.server;
					}

					if(server.server_name instanceof Array){
						Array.each(server.server_name, function(server_name){
							var tmp_uris = server_name._value.clean().split(" ");
							all_uris = all_uris.concat(tmp_uris);
						}.bind(this));
					}
					else{
						all_uris = server.server_name._value.clean().split(" ");
					}


					Array.each(all_uris, function(uri){

						if(vhost == uri){
							cfg = this.conf_to_obj(server);
						}

					}.bind(this));

					//debug('---NO ARRAY----');
					//debug(server.server_name._value);
				}

				////debug(cfg);
				callback(cfg, vhosts);

			}.bind(this));

		}
		else {//multiple vhosts
		// if(vhosts instanceof Array){
			// var tmp_cfg = [];
			var tmp_cfg = {};
			// for(var i = 0; i < vhosts.length; i++){
				// var vhost = vhosts[i];
			// debug('read_vhosts_full %o ', vhosts);
			// process.exit(1)
			let self = this

			async.eachOf(vhosts, function (vhost, uri, async_eachof_vhost_callback) {

				async.eachOf(vhost, function (real_vhost, index, async_eachof_real_vhost_callback) {
					self.read_vhosts_full(real_vhost, function(cfg, _vhost){
						if(!tmp_cfg[uri]) tmp_cfg[uri] = []

						let index = vhost.indexOf(_vhost);

						tmp_cfg[uri][index] = cfg

						async_eachof_real_vhost_callback()

					});
				}, function (err) {
					if(err) debug('async_eachof_real_vhost_callback ERROR %o', err)

			    async_eachof_vhost_callback()
				});

			}, function (err) {
				if(err) debug('async_eachof_vhost_callback ERROR %o', err)

				debug('FINISH %o', tmp_cfg)
		    callback(tmp_cfg)
			});

			// let count_vhosts = 0
			// Object.each(vhosts, function(vhost, uri){
			//
			// 	Array.each(vhost, function(real_vhost, i){
			//
			// 		this.read_vhosts_full(real_vhost, function(cfg, _vhost){
			// 			if(!tmp_cfg[uri]) tmp_cfg[uri] = []
			//
			//
			//
			// 			let index = vhost.indexOf(_vhost);
			// 			//debug('---recursive----');
			// 			//debug(vhost);
			// 			//debug(index);
			//
			// 			//tmp_cfg = tmp_cfg.concat(cfg);
			// 			// tmp_cfg[index] = Object.clone(cfg);
			// 			// tmp_cfg[uri][index] = Object.clone(cfg);
			// 			tmp_cfg[uri][index] = cfg
			//
			// 			//debug(tmp_cfg);
			//
			// 			//not_full_array = tmp_cfg.contains(undefined);
			//
			// 			// if(tmp_cfg.clean().length == vhosts.length){
			//
			// 			// process.exit(1)
			// 			if(Object.getLength(tmp_cfg) == Object.getLength(vhosts)){
			// 				let finish = 0
			// 				// let count_cfg = 0
			// 				Object.each(tmp_cfg, function(vhost, uri){
			//
			//
			// 					if(vhosts[uri].length !== vhost.clean().length){
			// 						finish = false
			// 					}
			// 					else if(finish !== false){
			// 						finish++
			// 					}
			//
			// 					if(finish === Object.getLength(tmp_cfg) - 1){
			// 						callback(tmp_cfg)
			// 					}
			//
			// 					debug('-----')
			// 					// if(count_cfg === Object.getLength(tmp_cfg) - 1 && finish === true)
			// 					// 	callback(tmp_cfg)
			// 					//
			// 					// count_cfg++
			// 				})
			// 				// debug('read_vhosts_full %o %o', tmp_cfg);
			//
			// 				// if(finish === true)
			// 				// if(finish === false){
			// 				// 	process.exit(1)
			// 				// 	callback(tmp_cfg);
			// 				// }
			// 			}
			// 		});
			//
			// 	}.bind(this))
			//
			// 	count_vhosts++
			// }.bind(this))



			// }
			//}.bind(this));

		}


	},
  conf_to_obj: function(conf){
		////debug('---conf_to_obj----');
		////debug(conf);

		var cfg = {};
		Object.each(conf, function(value, prop){
			////debug('prop: '+prop);
			if(prop.charAt(0) != '_' && prop != 'toString'){
				////debug('prop: '+prop);
				////debug('value: '+value._comments);

				if(value instanceof Array){
					cfg[prop] = [];

					Array.each(value, function(val){

						//cfg[prop].push(val._value);
						var propertys = this.conf_to_obj(val);

						if(Object.getLength(propertys) > 0){
							var obj = {
								'_value' : val._value
							};

							if(val._comments && this.comments)
								obj['_comments'] = val._comments;

							cfg[prop].push(
								Object.merge(
									obj,
									propertys
								)
							);

						}
						else{
							cfg[prop].push(val._value);
						}

					}.bind(this));
				}
				//else if(!value._value){
					//cfg[prop] = this.conf_to_obj(value);
				//}
				else{
					var propertys = this.conf_to_obj(value);

					////debug(propertys);

					//if(Object.getLength(propertys) > 0){
						cfg[prop] = Object.merge({
							'_value' : value._value
						},
						propertys);

						if(this.comments && value._comments && value._comments.length > 0)//if there are comments, attach it
							cfg[prop]['_comments'] = value._comments;

						if(Object.getLength(cfg[prop]) == 1)//if there are no other keys, except "_value", return it as property = value
							cfg[prop] = cfg[prop]['_value'];

					//}
					//else{
						//cfg[prop] = value._value;
					//}

					////debug(this.conf_to_obj(value));
				}
			}

		}.bind(this));

		return cfg;
	},

	obj_to_conf: function(obj, callback){

		//debug('obj_to_conf');
		//debug(obj);

		fs.writeFile(os.tmpdir()+'/nginx-conf', '', (err) => {
			if (err) throw err;

			nginx.create(os.tmpdir()+'/nginx-conf', function(err, conf) {
				if (err) {
					//debug(err);
					return;
				}

				conf.die(os.tmpdir()+'/nginx-conf');

				////debug(conf.toString());
				conf.nginx._add('server');

				Object.each(obj, function(value, prop){


					if(value instanceof Array){
						Array.each(value, function(val, index){


							if(val instanceof Object){//ex: 'location' Array

								conf.nginx.server._add(prop, val['_value']);//add, ex: "location /"

								if(this.comments && val['_comments']){
									Object.each(val['_comments'], function(comment){
										if(conf.nginx.server[prop] instanceof Array){//if we added the key before, now is an array ex: multiple "location"
											var last = conf.nginx.server[prop].length - 1;
											conf.nginx.server[prop][last]._comments.push(comment);
										}
										else{
											conf.nginx.server[prop]._comments.push(comment);
										}
									});
								}

								Object.each(val, function(item, key){//add, ex: "location / {proxy_pass: "$proxy"}"

									var comments = null;

									debug('--item--');
									debug(item);

									if(item instanceof Object){//it shouldn't, unless it has comments
										comments = item['_comments'];
										item = item['_value'];
									}

									if(key != '_value' && key != '_comments'){
										if(conf.nginx.server[prop] instanceof Array){//if we added the key before, now is an array ex: multiple "location"
											var last = conf.nginx.server[prop].length - 1;
											conf.nginx.server[prop][last]._add(key, item);

											if(this.comments && comments){
												Array.each(comments, function(comment){
													conf.nginx.server[prop][last][key]._comments.push(comment);
												}.bind(this));
											}

										}
										else{
											conf.nginx.server[prop]._add(key, item);

											if(this.comments && comments){
												Array.each(comments, function(comment){
													conf.nginx.server[prop][key]._comments.push(comment);
												}.bind(this));
											}
										}
									}

								}.bind(this));

							}
							else{
								conf.nginx.server._add(prop, val);
							}
						}.bind(this));
					}
					else if(value instanceof Object){
						//debug('OBJECT');
						//debug(value);

						conf.nginx.server._add(prop);

						Object.each(value, function(val, key){
							if(key == '_value'){
								conf.nginx.server[prop]._value = val;
							}
							else if(key == '_comments' && this.comments){
								Array.each(val, function(comment){
									conf.nginx.server[prop]._comments.push(comment);
								});
							}
							else{
								var comments = null;

								//debug('--VAL--');
								//debug(val);

								if(val instanceof Object){//it shouldn't, unless it has comments
									comments = val['_comments'];
									val = val['_value'];
								}

								conf.nginx.server[prop]._add(key, val);

								if(this.comments && comments){
									Array.each(comments, function(comment){
										conf.nginx.server[prop][key]._comments.push(comment);
									}.bind(this));
								}
							}
						}.bind(this));
					}
					else{
						if(prop == '_value'){
							conf.nginx.server._value = value;
						}
						else if(prop == '_comments' && this.comments){
							conf.nginx.server._comments = value;
						}
						else{
							conf.nginx.server._add(prop, value);
						}
					}
				}.bind(this));

				////debug(conf);

				callback(conf);
			}.bind(this));

		});



	},
	/**
	* change "location /" on Array: location[][_value]=/&location[][limit_req]=zone=default burst=5
	* , and with a comment: location[][_value]=/&location[][limit_req]=zone=default burst=5&location[][_comments][]=a comment
	* add "location /colo" on Array: location[][_value]=/colo&location[][limit_req]=zone=default burst=5
	* change include Array order: include[1]=/etc/nginx/conf.d/no_log.conf&include[0]=/etc/nginx/conf.d/errors.conf
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
	// search_vhost: function(vhosts, uri){
	// 	var read_vhosts = [];
	//
	// 	if(!Array.isArray(uri))
	// 		uri = [uri]
	//
	// 	for(var i = 0; i < vhosts.length; i++){//search uri on all vhosts, there may be multiple matchs on same or diferent files
	// 		for(var j = 0; j < uri.length; j++){
	// 			if(vhosts[i].uri == uri[j]){//found
	// 				read_vhosts.push(vhosts[i]);
	// 			}
	// 		}
	//
	//
	// 	}
	//
	// 	return read_vhosts;
	// },
	search_vhost: function(vhosts, uri){
		var read_vhosts = {};

		if(!Array.isArray(uri))
			uri = [uri]

		for(var i = 0; i < vhosts.length; i++){//search uri on all vhosts, there may be multiple matchs on same or diferent files
			for(var j = 0; j < uri.length; j++){
				if(vhosts[i].uri == uri[j]){//found
					if(!read_vhosts[vhosts[i].uri]) read_vhosts[vhosts[i].uri] = []
					// read_vhosts.push(vhosts[i]);
					read_vhosts[vhosts[i].uri].push(vhosts[i])
				}
			}


		}

		return read_vhosts;
	},
});
