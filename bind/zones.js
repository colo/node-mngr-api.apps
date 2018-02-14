'use strict'

var App = require('node-express-app'),
	fs = require('fs'),
	path = require('path'),
	os  = require('os');
	
	
//zonefile = require('dns-zonefile'); not working....colliding with mootools??


//command line zonefile works
var sys = require('sys'),
	exec = require('child_process').exec,
	zonefile_bin = path.join(__dirname,'./node_modules/dns-zonefile/bin/zonefile'),
	lockFile = require('lockfile');
	


module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
	options: {
		
		zones_dir: path.join(__dirname,'./../../devel/var/bind/domains'),
		zone_file_filter: /^[a-zA-Z0-9_\.-]+$/,
		zone_file_extension: '.hosts',
		
		//https://stackoverflow.com/questions/3026957/how-to-validate-a-domain-name-using-regex-php/16491074#16491074
		//zone_validation: /^(?!\-)(?:[a-zA-Z\d\-]{0,62}[a-zA-Z\d]\.){1,126}(?!\d+)[a-zA-Z\d]{1,63}$/,
		
		id: 'bind',
		path: '/bind/zones',
		
		//authorization: {
			//config: path.join(__dirname,'./config/rbac.json'),
		//},
		
		params: {
			//zone: /^[a-zA-Z0-9_\.-]+$/,
			zone: /^(?!\-)(?:[a-zA-Z\d\-]{0,62}[a-zA-Z\d]\.){1,126}(?!\d+)[a-zA-Z\d]{1,63}$/,
			prop: /soa|origin|ttl|ns|a|aaaa|cname|mx|txt|srv/,
		},
		
		routes: {
			
			/*all: [
				{
				path: '',
				callbacks: ['get']
				},
			]*/
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				post: [
						{
							path: ':zone',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['add'],
							version: '',
						},
						{
							path: '',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['add'],
							version: '',
						},
					],
					put: [
						{
							path: ':zone',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['update'],
							version: '',
						},
						{
							path: ':zone/:prop',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['update'],
							version: '',
						},
						{
							path: '',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['update'],
							version: '',
						},
					],
					delete: [
						{
							path: ':zone',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['remove'],
							version: '',
						},
						{
							path: '',
							//callbacks: ['check_authentication', 'add'],
							callbacks: ['remove'],
							version: '',
						},
					],
				all: [
					{
						path: ':zone',
						callbacks: ['get_zone'],
						version: '',
					},
					{
						path: ':zone/:prop',
						callbacks: ['get_zone'],
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
  add: function (req, res, next){
		var zone = req.params.zone;
		var zone_content = req.body;
		
		console.log(zone_content);
		
		this.save_zone(zone, zone_content, false, function(err, file){
				
			if(err){
				res.status(500).json(err);
			}
			else{
				//console.log('---FILE---');
				//console.log(file);
				//res.json(json);
				this.read_zone_file(file, function(err, json){
					if(err){
						res.status(500).json(err);
					}
					else{
						res.json(json);
					}
					
				});
			}
		}.bind(this));
		
		
	},
	update: function (req, res, next){
		var zone = req.params.zone;
		var zone_content = req.body;
		var prop = req.params.prop;
		
		console.log('req.params.prop');
		console.log(prop);
		
		var response = function(err, file){
				
			if(err){
				res.status(500).json(err);
			}
			else{
				//console.log('---FILE---');
				//console.log(file);
				//res.json(json);
				this.read_zone_file(file, function(err, json){
					if(err){
						res.status(500).json(err);
					}
					else{
						res.json(json);
					}
					
				});
			}
		}.bind(this);
		
		if(prop){
			//already on save_zone...refactor this
			if(!zone && zone_content.soa.name){
				zone = zone_content.soa.name.slice(0, -1);//removes last '.'
			}
			
			this.read_zone(zone, function(err, json){
				if(err){
					res.status(500).json(err);
				}
				else{
					var tmp = zone_content;
					zone_content = json;
					zone_content[prop] = tmp;
					
					this.save_zone(zone, zone_content, true, response);
				}
			}.bind(this));
		}
		else {
			this.save_zone(zone, zone_content, true, response);
		}
		
		
		
		
	},
	remove: function (req, res, next){
		var zone = req.params.zone;
		
		if(zone){
			var full_path = path.join(this.options.zones_dir, zone + this.options.zone_file_extension);
			
			fs.unlink(full_path, (err) => {
				if (err){
					//throw err;
					res.status(500).json(err);
				}
				else{
					res.json({msg: 'zone '+zone+' deleted'});
				}
			});
		}
		else{  
			res.json({err: 'wrong zone param'});
		}
	},
	/**
	 * 
	 * */
	save_zone: function(zone, zone_content, rewrite, callback){
		if(!zone && zone_content.soa.name){
			zone = zone_content.soa.name.slice(0, -1);//removes last '.'
		}
		
		if(zone){
			if(zone.test(this.options.params.zone)){
				var full_path = path.join(this.options.zones_dir, zone + this.options.zone_file_extension);
				
				this.write_zone_file(zone_content, full_path, rewrite, callback);
				
			}
			else{
			 callback({err: 'wrong zone param'});
			}
		}
		else{
			 callback({err: 'wrong zone param'});
		}
	},
	/**
	 * rewrite optional, default: false
	 * */ 
  write_zone_file: function(json, file, rewrite, callback){
		var original_file = path.posix.basename(file);
		var original_path = path.dirname(file);
		var lock = os.tmpdir()+ '/.' + original_file + '.lock';
		var json_file = os.tmpdir()+ '/.' + original_file + '.json';
		
		console.log('---REWRITE----');
		console.log(rewrite);
		
		if(rewrite instanceof Function){
			callback = rewrite;
			rewrite = false;
		}
		else if(rewrite !== true){
			rewrite = false;
		}
		
		console.log('---REWRITE----');
		console.log(rewrite);
		
		//test
		//file = os.tmpdir()+ '/.' + original_file + '_' + new Date().getTime();
		var write_zone =  function(json_file, file){
			console.log('writing zone to: '+file);
			console.log(fs.existsSync(file));
			
			//if file exist we allow "update" but not "add"
			if((fs.existsSync(file) && rewrite == true) || (!fs.existsSync(file) && rewrite == false)){
				// executes `zonefile`
				var child = exec(zonefile_bin + ' -g '+json_file+ ' > '+file, function (err, stdout, stderr) {
					
					//remove json file 
					fs.unlink(json_file, (err) => {
						if (err) throw err;
						//console.log('successfully deleted'+json_file);
					});
					
					if(err){
						callback(err);
					}
					else{
						//var json = JSON.decode(stdout);
						callback(null, file);
					}
					
					
				});
				
			}
			else{
				if(fs.existsSync(file)){
					callback({ err: "Operation not permited: "+original_file+" file exists"});
				}
				else{
					callback({ err: "Operation not permited: "+original_file+" file doens't exists"});
				}
				
			}
		}
		
		var write_json = function(json, json_file){
			console.log('writing json stream to: '+json_file);
			console.log(json);
			
			var wstream = fs.createWriteStream(json_file);
			
			wstream.on('finish', function(){
				write_zone(json_file, file);
			});
			
			wstream.on('error', function(err){
				callback(err);
			});
			
			
			
			wstream.write(JSON.stringify(json));
			wstream.end();
		}
				
		//fs.open(file, 'wx', (err, fd) => {
		
			lockFile.lock(lock, {wait: 1000} ,function (lock_err) {
				
				if(lock_err)
					callback(lock_err);
					//throw lock_err;
					
		
				//if (err) {
					//if(err.code === 'EEXIST'){
						//console.log('exists....');
						//console.log(file);
						
						//write_json(json, json_file);
						
					//}
					//else{
						////throw err;
						//callback(lock_err);
					//}
				//}
				//else{//if no exist, it's safe to write
					//fs.close(fd);
					
					write_json(json, json_file);
					
					
				//}

			lockFile.unlock(lock, function (lock_err) {
					if(lock_err)
						callback(lock_err);
						//throw lock_err;
					
				});
			});
			
		//});//open
		
	},
	read_zone_file: function(file, callback){
		try{
				
			if(fs.statSync(file).isFile()){
				// executes `zonefile`
				var child = exec(zonefile_bin + ' -p '+file, function (err, stdout, stderr) {
					
					if(err){
						callback(e);
					}
					else{
						
						callback(null, JSON.decode(stdout));
						
					}
				});
				
				
			}
		}
		catch (e){
			callback(e);
		}
	},
	read_zone: function(zone, callback){
		var full_path = path.join(this.options.zones_dir, zone + this.options.zone_file_extension);
			
		this.read_zone_file(full_path, callback);
	},
  get_zone: function (req, res, next){
	
		if(req.params.zone){
			
			this.read_zone(req.params.zone, function(err, json){
				if(err){
					res.status(500).json(err);
				}
				else{
					if(req.params.prop){
						if(!json[req.params.prop])
							json[req.params.prop] = {};
							
						res.json(json[req.params.prop]);
					}
					else{
						res.json(json);
					}
				}
				
			});
			
		}
		else{  
			res.json({err: 'wrong zone param'});
		}
  },
  /**
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
	 * */
  get: function (req, res, next){
	  
	  fs.readdir(this.options.zones_dir, function(err, files){
		  if(err){
			  res.json({err: err});
		  }
		  else{
			  var zones_files= [];
			  var count = 0;
			  files.forEach(function(file) {
					if(! (file.charAt(0) == '.')){//ommit 'hiden' files
						
						var full_path = path.join(this.options.zones_dir, file);
						
						if(fs.statSync(full_path).isFile() == true && this.options.zone_file_filter.exec(file) != null){
							
							if(this.options.zone_file_extension && path.extname(file) == this.options.zone_file_extension){
								file = file.replace(this.options.zone_file_extension, '');
								zones_files.push(file);
								//console.log('file: '+file);
							}
							else if(!this.options.zone_file_extension){
								zones_files.push(file);
								//console.log('file: '+file);
							}
				
							
							
						}
						
					}
					
					
					//res.status(201).links({ next: req.protocol+'://'+req.hostname+':8080/'}).json({'status': 'ok'});
					
					if(count == files.length - 1 ){//finish loading files
						
						var URI = req.protocol+'://'+req.hostname+':'+process.env.PORT+this.express().mountpath+'/';
						
						var status = 206; //206 partial list | 200 full list
						
						var result = [];
						var links = {};
						links.first = URI+'?first';
						links.last = URI+'?last';
						
						links.next = null;
						links.prev = null;
						
						var range_start = 0;
						var range_end = 0;
						
						if(req.query.first != undefined){
							
							
							//console.log(req.baseUrl);
							//console.log(this.express().mountpath);
							
							if(req.query.first == '' || !(req.query.first > 0)){
								
								links.next = URI+'?start=1&end=2';
								links.prev = links.last;
								
								range_start = 0;
								range_end = 0;
						
								result.push(zones_files[0]);
								
								
							}
							else{
								var first = (new Number(req.query.first) < zones_files.length) ? new Number(req.query.first) : zones_files.length - 1;
								
								for(var i = 0; i < first; i++){
									result[i] = zones_files[i];
								}
								
								var next = {};
								next.start = first;
								
								var next_end = next.start + next.start - 1;
								next.end = (next_end < zones_files.length) ? next_end : zones_files.length - 1;
								
								
								links.next = URI+'?start='+next.start+'&end='+next.end;
								links.prev = links.last+'='+req.query.first;
								
								range_start = 0;
								range_end = result.length - 1;
								
							}
						}
						else if(req.query.last != undefined){
							
							if(req.query.last == '' || !(req.query.last > 0)){
								//console.log('LAST');
								
								var prev = {};
								prev.start = prev.end = zones_files.length - 2;
								
								links.next = links.first;
								links.prev = URI+'?start='+prev.start+'&end='+prev.end;
								
								result.push(zones_files[zones_files.length - 1]);
								
								range_start = zones_files.length - 1;
								range_end = zones_files.length - 1;
								
							}
							else{
								var last = (new Number(req.query.last) < zones_files.length) ? new Number(req.query.last) : zones_files.length - 1;
								
								for(var i = zones_files.length - last; i <= zones_files.length - 1; i++){
									result.push(zones_files[i]);
								}
								
								var prev = {};
								prev.end = zones_files.length - last - 1 ;
								prev.start = ((prev.end - last + 1) > 0) ? (prev.end - last + 1) : 0;
								
								links.next = links.first+'='+last;
								links.prev = URI+'?start='+prev.start+'&end='+prev.end;
								
								range_start = zones_files.length - last;
								range_end = zones_files.length - 1;
								
							}
							
						}
						else if(req.query.start != undefined && req.query.start >= 0){
							var end = null;
							var start = (new Number(req.query.start) < zones_files.length) ? new Number(req.query.start) : zones_files.length - 1;
							
							if(req.query.end != undefined && new Number(req.query.end) >= start){
								end = (new Number(req.query.end) < zones_files.length) ? new Number(req.query.end) : zones_files.length -1;
							}
							else{
								end = zones_files.length - 1;
							}
							
							for(var i = start; i <= end; i++){
								result.push(zones_files[i]);
							}
							
							var next = {};
							next.start = ((end + 1) < zones_files.length) ? (end + 1) : 0;
							next.end = (next.start + (end - start) < zones_files.length) ? next.start + (end - start) : zones_files.length -1;
							
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
							result = zones_files;
						}
						
						if(result.length == zones_files.length)//when 'start=0&end=zones_files.length'
							status = 200;
						
						if(status != 200){//set range Header
							res.set('Content-Range', range_start+'-'+range_end+'/'+zones_files.length);
						}
						
						res.status(status).links(links).json(result);
					}
						
					count++;
				
			  }.bind(this));
			  
			  
		  }
	  }.bind(this));
	  
  },
  initialize: function(options){
	
		this.parent(options);//override default options
		
		this.log('bind', 'info', 'bind started');
  },
	
});

