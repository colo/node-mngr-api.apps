'use strict'

const path = require('path'),
		// exec = require('child_process').exec,
		spawn = require('child_process').spawn,
		Q = require('q');

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,

	UCMD: new RegExp('ucmd|ucomm'),
	ARGS: new RegExp('args|command|comm'),

  //procs: [],
  // command: "ps -eo pid",
	ps_args: ['-ww', '-eo', 'pid'],

  options: {

		id: 'procs',
		path: '/os/procs',

		logs: undefined,

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
		let deferred = Q.defer();

		// let command = this.command;
		let command = ''
		if(format){
			// let ucmd = new RegExp('ucmd|ucomm');

			if(this.UCMD.test(format)){//ucmd (ucomm alias) should be at the end as may have spaces in the column
				format = format.replace(this.UCMD, '');
				format += ',ucmd';
				format = format.replace(',,', ',');
			}

			// let args = new RegExp('args|command|comm');

			if(this.ARGS.test(format)){//command (comm | args alias) should be at the end as may have spaces in the column
				format = format.replace(this.ARGS, '');
				// format += ',args';
				// format += ' -o "|%a"'; //with exec
				format += ' -o |%a';//spawn
				format = format.replace(',,', ',');
			}

			command += ','+format;
		}
		else{
			//command += ',args';//exec
			command += ' -o |%a'; //spawn

		}

		command = command.split(' ')
		//console.log('full command');
		// console.log(command);

		let procs = {}
		// let child = exec(
		// 	command,
		// 	function (err, stdout, stderr) {
    //
		// 		if (err) deferred.reject(err);
    //
		// 		let data = stdout.split('\n');
    //
    //
		// 		let proc = {};
		// 		let saved_proc = null;
		// 		try{//just to break the "each" if proc is found
		// 			data.each(function(line, index){
		// 				// console.log('Line:', line);
		// 				// console.log(line);
		// 				////console.log(line.clean());
		// 				////console.log(line.split());
		// 				//if(index != 0 && index != data.length -1 ){
		// 				if(index != data.length -1 ){
		// 					// console.log(line)
		// 					let tmp_line = line.clean().split('|')
		// 					line = tmp_line[0]
		// 					let command = tmp_line[1]
    //
		// 					// console.log('Line:', line)
		// 					// console.log('Comm', command)
    //
		// 					let tmp = line.clean().split(' ');
    //
		// 					if(index == 0){//use first line columns names as object keys
		// 						tmp.each(function(column){
		// 							proc[column.toLowerCase()] = null;
		// 						});
		// 						if(command)
		// 							proc['command'] = null;
		// 					}
		// 					else{
		// 						let i = 0;
		// 						Object.each(proc, function(value, column){
		// 							////console.log(column);
		// 							////console.log(tmp[i]);
    //
		// 							if(column != 'command' && column != 'cmd'){//exclude command column
		// 								proc[column] = tmp[i];
		// 							}
		// 							else if(column == 'command'){
		// 								proc[column] = command.split(' ')
		// 							}
		// 							else{//as may be split in morearray items
		// 								proc[column] = '';
    //
		// 								for(let j = i; j < tmp.length; j++){
		// 									// proc[column].push(tmp[j]);
		// 									proc[column] += tmp[j]+' '
		// 								}
    //
		// 								proc[column] = proc[column].clean()
		// 							}
    //
		// 							i++;
		// 						});
		// 						////console.log(line.clean().split(' '));
    //
		// 						if(pid && proc['pid'] == pid){
		// 							saved_proc = Object.clone(proc);
		// 							throw new Error('Found');//break the each loop
		// 							//break;
		// 						}
    //
		// 						// procs.push(Object.clone(proc));
		// 						procs[proc.pid] = Object.clone(proc)
    //
		// 					}
    //
		// 				}
		// 			}.bind(this));
		// 		}
		// 		catch(e){
		// 			////console.log(e);
		// 		}
    //
		// 		if(pid){//retrive one proc
		// 			if (saved_proc == null){
		// 				deferred.reject(new Error('Not found'));
		// 			}
		// 			else {
		// 				deferred.resolve(saved_proc);
		// 			}
		// 		}
		// 		else{
		// 			deferred.resolve(procs);
		// 		}
    //
		// 	}.bind(this)
		// );

		let ps_args = Array.clone(this.ps_args)
		ps_args[ps_args.length - 1] += command[0]//format is in last position of ps_args

		for(let i = 1; i <= command.length -1; i++){
			ps_args[ps_args.length] = command[i]
		}

		// console.log(ps_args)
		// console.log(command)
		const ps = spawn('ps', ps_args);
		let ps_data = ''
		ps.stdout.on('data', (data) => {
		  // console.log(`stdout: ${data}`);
			ps_data += data
		});

		ps.stderr.on('data', (data) => {
		  // console.log(`stderr: ${data}`);
			deferred.reject(data);
		});

		ps.on('close', (code) => {
		  // console.log(`child process exited with code ${code}`);
			// console.log(ps_data)

			let data = ps_data.split('\n');


			let proc = {};
			let saved_proc = null;
			try{//just to break the "each" if proc is found
				data.each(function(line, index){
					// console.log('Line:', line);
					// console.log(line);
					////console.log(line.clean());
					////console.log(line.split());
					//if(index != 0 && index != data.length -1 ){
					if(index != data.length -1 ){
						// console.log(line)
						let tmp_line = line.clean().split('|')
						line = tmp_line[0]
						let command = tmp_line[1]

						// console.log('Line:', line)
						// console.log('Comm', command)

						let tmp = line.clean().split(' ');

						if(index == 0){//use first line columns names as object keys
							tmp.each(function(column){
								proc[column.toLowerCase()] = null;
							});
							if(command)
								proc['command'] = null;
						}
						else{
							let i = 0;
							Object.each(proc, function(value, column){
								////console.log(column);
								////console.log(tmp[i]);

								if(column != 'command' && column != 'cmd'){//exclude command column
									proc[column] = tmp[i];
								}
								else if(column == 'command'){
									proc[column] = command.split(' ')
								}
								else{//as may be split in morearray items
									proc[column] = '';

									for(let j = i; j < tmp.length; j++){
										// proc[column].push(tmp[j]);
										proc[column] += tmp[j]+' '
									}

									proc[column] = proc[column].clean()
								}

								i++;
							});
							////console.log(line.clean().split(' '));

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
				// console.log(e);
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

		});

    return deferred.promise;
  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-procs', 'info', 'os-procs started');
  },

});
