'use strict'


const path = require('path'),
		os = require('os'),
		exec = require('child_process').exec,
		Q = require('q'),
		debug = require('debug')('os');


const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');

module.exports = new Class({
  Extends: App,


  get: function (req, res, next){
		this._networkInterfaces()
		.then(function(ifaces){

			let json = {};
			Object.each(os, function(item, key){

				if(key !== 'getNetworkInterfaces' && key !== 'networkInterfaces' && key !== 'getPriority' && key !== 'setPriority')//deprecated func && use internal func
					json[key] = (typeof(item) == 'function') ? os[key]() : os[key];

				if(key == 'networkInterfaces'){
					json[key] = ifaces;
				}

			}.bind(this));

			res.json(json);
		})
		.done();


  },
  initialize: function(options){

		//dynamically create routes based on OS module (ex: /os/hostname|/os/cpus|...)
		Object.each(os, function(item, key){
			if(key != 'getNetworkInterfaces'){//deprecated func
				let callbacks = [];

				if(key == 'networkInterfaces'){//use internal func
					this[key] = function(req, res, next){
						//console.log('params');
						//console.log(req.params);

						this._networkInterfaces()
						.then(function(result){
							////console.log('ifaces');
							////console.log(result);
							if(req.params.prop && result[req.params.prop]){
								res.json(result[req.params.prop]);
							}
							else if(req.params.prop){
								res.status(500).json({ error: 'Bad property'});
							}
							else{
								res.json(result);
							}

						})
						.done();
					}
				}
				else{
					this[key] = function(req, res, next){
						////console.log('params');
						////console.log(req.params);

						let result = (typeof(item) == 'function') ? os[key]() : os[key];

						if(req.params.prop && result[req.params.prop]){
							res.json(result[req.params.prop]);
						}
						else if(req.params.prop){
							res.status(500).json({ error: 'Bad property'});
						}
						else{
							res.json(result);
						}
					}
				}

				this.options.api.routes.all.push({
						path: key,
						callbacks: [key]
				});

				this.options.api.routes.all.push({
						path: key+'/:prop',
						callbacks: [key]
				});
			}
		}.bind(this));

		this.parent(options);//override default options

		this.log('os', 'info', 'os started');
  },
  _networkInterfaces: function(){
		let deferred = Q.defer();
		let ifaces = os.networkInterfaces();

		//console.log(ifaces);

		let child = exec(
			'cat /proc/net/dev',
			function (err, stdout, stderr) {

				if (err) deferred.reject(err);

				let data = stdout.split('\n');

				data.splice(0, 2);
				data.splice(-1, 1);

				data.each(function(item, index){
					//console.log('iface item '+item);
					//if(index != 0 && index != data.length -1 ){
						////console.log(item.clean().split(' '));
						let tmp = item.clean().split(' ');
						tmp[0] = tmp[0].replace(':', ''); //removes : from iface name
						let name = tmp[0];
						//console.log(tmp);

						if(ifaces[name]){
							let tmp_data = ifaces[name];

							ifaces[name] = {
								'if' : tmp_data,
								'recived' : {
									bytes : tmp[1],
									packets : tmp[2],
									errs : tmp[3],
									drop : tmp[4],
									fifo : tmp[5],
									frame : tmp[6],
									compressed : tmp[7],
									multicast : tmp[8]
								},
								'transmited': {
									bytes : tmp[9],
									packets : tmp[10],
									errs : tmp[11],
									drop : tmp[12],
									fifo : tmp[13],
									colls : tmp[14],
									carrier : tmp[15],
									compressed : tmp[16]
								}
							};



						}
				}.bind(this));

				deferred.resolve(ifaces);
			}.bind(this)
		);


    return deferred.promise;
  },

});
