'use strict'

var debug = require('debug')('api:apps:os:procs');
var debug_internals = require('debug')('api:apps:os:procs:Internals')

// var path = require('path'),
// 		exec = require('child_process').exec,
// 		Q = require('q');

var chokidar = require('chokidar')
var watch = require('node-watch')

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,

  // command: "ps -eo pid",
	proc_watcher: null,
	procs: {},

  options: {

		id: 'procs',
		path: '/os/procs_new',

		params: {
			//prop: /fs|type|bloks|used|available|percentage|proc_point/
      proc: /^\d+$/
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
      let proc = req.params.proc
      if(this.procs[req.params.proc]){

      }
      else{
        res.status(404).json({error: 'proc '+proc+' not found'});
      }
			// this._procs(req.params.proc, req.query.format)
			// .then(function(result){
			// 	////console.log(result);
			// 	if(!(typeof(req.params.prop) == 'undefined')){
      //
			// 		if(result[req.params.prop]){
			// 			res.json(result[req.params.prop]);
			// 		}
			// 		else{
			// 			res.status(500).json({error: 'bad proc property'});
			// 		}
      //
			// 	}
			// 	else{
			// 		res.json(result);
			// 	}
      //
			// }, function (error) {
			// 	////console.log('error');
			// 	////console.log(error);
			// 	res.status(500).json({error: error.message});
			// })
			// .done();
		}
		else{
			res.status(500).json({error: 'bad proc param'});
		}
  },
  get: function (req, res, next){
		// //console.log('procs query:');
		// //console.log(req.query);
    //
		// this._procs(null, req.query.format)
		// .then(function(result){
		// 	res.json(result);
		// })
		// .done();
    res.json(this.procs)
  },
  _procs: function(pid, format){
		// var deferred = Q.defer();
    //
		// var command = this.command;
		// if(format){
		// 	var cond = new RegExp('args|command|comm');
    //
		// 	if(cond.test(format)){//command (comm, args alias) should be at the end as may have spaces in the column
		// 		format = format.replace(cond, '');
		// 		format += ',args';
		// 		format = format.replace(',,', ',');
		// 	}
    //
		// 	command += ','+format;
		// }
		// else{
		// 	command += ',args';
		// }
    //
		// //console.log('full command');
		// //console.log(command);
    //
		// var procs = []
		// var child = exec(
		// 	command,
		// 	function (err, stdout, stderr) {
    //
		// 		if (err) deferred.reject(err);
    //
		// 		var data = stdout.split('\n');
    //
    //
		// 		var proc = {};
		// 		var saved_proc = null;
		// 		try{//just to break the "each" if proc is found
		// 			data.each(function(item, index){
		// 				////console.log('item');
		// 				////console.log(item);
		// 				////console.log(item.clean());
		// 				////console.log(item.split());
		// 				//if(index != 0 && index != data.length -1 ){
		// 				if(index != data.length -1 ){
		// 					var tmp = item.clean().split(' ');
    //
		// 					if(index == 0){//use first line columns names as object keys
		// 						tmp.each(function(column){
		// 							proc[column.toLowerCase()] = null;
		// 						});
		// 					}
		// 					else{
		// 						var i = 0;
		// 						Object.each(proc, function(value, column){
		// 							////console.log(column);
		// 							////console.log(tmp[i]);
    //
		// 							if(column != 'command'){//exclude command column
		// 								proc[column] = tmp[i];
		// 							}
		// 							else{//as may be split in morearray items
		// 								proc['command'] = [];
    //
		// 								for(var j = i; j < tmp.length; j++){
		// 									proc['command'].push(tmp[j]);
		// 								}
		// 							}
    //
		// 							i++;
		// 						});
		// 						////console.log(item.clean().split(' '));
    //
		// 						if(pid && proc['pid'] == pid){
		// 							saved_proc = Object.clone(proc);
		// 							throw new Error('Found');//break the each loop
		// 							//break;
		// 						}
    //
		// 						procs.push(Object.clone(proc));
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
    //
    //
    // return deferred.promise;
  },
  initialize: function(options){

		this.parent(options);//override default options

    let self = this

    //https://www.npmjs.com/package/node-watch
    //try:  https://github.com/bevry/watchr
    chokidar.watch('/proc', {
    	// cwd: '/proc/',
      // ignored: /(^|[\/\\])\..|[A-Za-z]+$/,
      ignored: /(^|[\/\\])\..|^\/[A-Za-z]+\/[a-zA-Z|\.|\-|\_]+$/,
      // ignored: /([^0-9]*)/g,
    	depth: 0,
      // usePolling: true,
      // ignored: /(^|[\/\\])\..|[A-Za-z]+/,

    })
    .on('all', (event, path) => {
      // path = path * 1

      // if(!isNaN(path))
        console.log(event, path);
    })
    .on('error',
			error => debug_internals(`Watcher error: ${error}`)
		)

		// this.proc_watcher = chokidar.watch('/proc/', {
		// 	cwd: '/proc/',
    //   followSymlinks: false,
		//   // ignored: /(^|[\/\\])\..|[A-Za-z]+$/, //ignore everyting that is not an int
    //   ignored: /(^|[\/\\])\..|[A-Za-z]+$/,
		// 	persistent: true,
		// 	depth: 2,
    //   usePolling: true
		// })
    //
		// this.proc_watcher
		// .on('change', path => debug_internals(`Directory ${path} has changed`))
		// // .on('add', path => debug_internals(`file ${path} has been added`))
	  // .on('addDir', path => {//procs are int dirs only
		// 	debug_internals(`Directory ${path} has been added`)
    //   path = path * 1
    //   if(!isNaN(path))
    //     self.procs[path] = null
    //
		// })
	  // .on('unlinkDir', path => {
    //   debug_internals(`Directory ${path} has been removed`)
    //
    //   delete self.procs[path]
    // })
    // .on('unlink', path => {
    //   debug_internals(`file ${path} has been removed`)
    //
    //   // delete self.procs[path]
    // })
	  // .on('error',
    //   // () => {}
		// 	error => debug_internals(`Watcher error: ${error}`)
		// )
	  // .on('ready', () => debug_internals('Initial scan complete. Ready for changes'))
	  // .on('raw', (event, path, details) => {
	  //   debug_internals('Raw event info:', event, path, details);
	  // })

    // try{
    //   let watcher = watch('/proc/', {
    //     // recursive: true,
    //     filter: /\d$/
    //   })
    //
    //   watcher.on('change', function(evt, path) {
    //    debug_internals(`Directory ${path} has changed`)
    //   })
    //
    //   watcher.on('error', error => debug_internals(`Watcher error: ${error}`));
    //
    // }
    // catch(e){}

		this.log('os-procs', 'info', 'os-procs started');
  },

});
