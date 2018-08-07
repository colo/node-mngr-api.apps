'use strict'

var path = require('path'),
		exec = require('child_process').exec,
		Q = require('q');

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,

  //procs: [],
  command: "ps -eo pid",

  options: {

		id: 'procs',
		path: '/os/procs',

		params: {
			//prop: /fs|type|bloks|used|available|percentage|proc_point/
		},

		api: {

			version: '1.0.0',

			routes: {
				get: [
					{
						path: ':proc',
						callbacks: ['get_proc'],
						version: '',
					},
					{
						path: ':proc/:prop',
						callbacks: ['get_proc'],
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
  get_proc: function (req, res, next){
	//console.log('procs param:');
	//console.log(req.params);
	//console.log('procs query:');
	//console.log(req.query);

	if(req.params.proc){
		this._procs(req.params.proc, req.query.format)
		.then(function(result){
			////console.log(result);
			if(!(typeof(req.params.prop) == 'undefined')){

				if(result[req.params.prop]){
					res.json(result[req.params.prop]);
				}
				else{
					res.status(500).json({error: 'bad proc property'});
				}

			}
			else{
				res.json(result);
			}

		}, function (error) {
			////console.log('error');
			////console.log(error);
			res.status(500).json({error: error.message});
		})
		.done();
	}
	else{
		res.status(500).json({error: 'bad proc param'});
	}
  },
  get: function (req, res, next){
		//console.log('procs query:');
		//console.log(req.query);

		this._procs(null, req.query.format)
		.then(function(result){
			res.json(result);
		})
		.done();

  },
  _procs: function(pid, format){
		var deferred = Q.defer();

		var command = this.command;
		if(format){
			var cond = new RegExp('args|command|comm');

			if(cond.test(format)){//command (comm, args alias) should be at the end as may have spaces in the column
				format = format.replace(cond, '');
				format += ',args';
				format = format.replace(',,', ',');
			}

			command += ','+format;
		}
		else{
			command += ',args';
		}

		//console.log('full command');
		//console.log(command);

		var procs = {}
		var child = exec(
			command,
			function (err, stdout, stderr) {

				if (err) deferred.reject(err);

				var data = stdout.split('\n');


				var proc = {};
				var saved_proc = null;
				try{//just to break the "each" if proc is found
					data.each(function(item, index){
						////console.log('item');
						////console.log(item);
						////console.log(item.clean());
						////console.log(item.split());
						//if(index != 0 && index != data.length -1 ){
						if(index != data.length -1 ){
							console.log(item)
							var tmp = item.clean().split(' ');

							if(index == 0){//use first line columns names as object keys
								tmp.each(function(column){
									proc[column.toLowerCase()] = null;
								});
							}
							else{
								var i = 0;
								Object.each(proc, function(value, column){
									////console.log(column);
									////console.log(tmp[i]);

									if(column != 'command' && column != 'cmd'){//exclude command column
										proc[column] = tmp[i];
									}
									else{//as may be split in morearray items
										proc[column] = [];

										for(var j = i; j < tmp.length; j++){
											proc[column].push(tmp[j]);
										}
									}

									i++;
								});
								////console.log(item.clean().split(' '));

								if(pid && proc['pid'] == pid){
									saved_proc = Object.clone(proc);
									throw new Error('Found');//break the each loop
									//break;
								}

								// procs.push(Object.clone(proc));
								procs[proc.pid] = Object.clone(proc)
							}

						}
					}.bind(this));
				}
				catch(e){
					////console.log(e);
				}

				if(pid){//retrive one proc
					if (saved_proc == null){
						deferred.reject(new Error('Not found'));
					}
					else {
						deferred.resolve(saved_proc);
					}
				}
				else{
					deferred.resolve(procs);
				}

			}.bind(this)
		);


    return deferred.promise;
  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-procs', 'info', 'os-procs started');
  },

});
