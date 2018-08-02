'use strict'

var debug = require('debug')('api:apps:os:procs');
var debug_internals = require('debug')('api:apps:os:procs:Internals')

var fs = require('fs')
var procfs = require('procfs-stats'),
    Q = require('q');

// var path = require('path'),
// 		exec = require('child_process').exec,
// 		Q = require('q');

// var chokidar = require('chokidar')
// var watch = require('node-watch')
// var watchr = require('watchr')

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,

  // command: "ps -eo pid",
	proc_watcher: null,
	procs: {},

  /**
  * for some reason the array must be sorted alphabetically descending,
  * or the proc {} won't have all the requested properties
  **/
  default_props: [
    'stat',
    'statm',
    'status',
    'env',
    'argv',
    'threads',
    'fds',
    'cwd',
    'io',
    //'tcp' doens't work (not a func)

  ].sort().reverse(),

  options: {

		id: 'procs',
		path: '/os/procs_new',

		params: {
			//prop: /fs|type|bloks|used|available|percentage|proc_point/
      pid: /^\d+$/
		},

		api: {

			version: '1.0.0',

			routes: {
				get: [
					{
						path: ':pid',
						callbacks: ['get_proc'],
						version: '',
					},
					{
						path: ':pid/:prop',
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
    if(!procfs.works)
      res.status(500).json({error: "can't access proc fs"})


		if(req.params.pid){
      let pid = req.params.pid

      this._procs(pid, req.query.format)
  		.then(procs => res.json(procs))
      .fail(err => res.status(500).json(err))
  		.done();

      // if(this.procs[req.params.proc]){
      //
      // }
      // else{
      //   res.status(404).json({error: 'proc '+proc+' not found'});
      // }

		}
		else{
			res.status(500).json({error: 'bad proc param'});
		}
  },
  get: function (req, res, next){
		if(!procfs.works)
      res.status(500).json({error: "can't access proc fs"})

		this._procs(null, req.query.format)
		.then(procs => res.json(procs))
    .fail(err => res.status(500).json(err))
		.done();

  },
  // // _prop: function(procs, pid, prop, cb){
  _proc_props(pid, props){
    props = (Array.isArray(props)) ? props : [props]

    let deferred = Q.defer()

    let proc = {}
    Array.each(props, function(prop, index){
      this._proc_prop(pid, prop).then(function(data){
        proc[prop] = data

        if(index == props.length - 1)
          deferred.resolve(proc)
      })
      // .fail(err => deferred.reject(err))
      .fail(function(err){
        proc[prop] = err

        // if(index == props.length - 1)
        //   deferred.resolve(proc)
      })
      .done()

    }.bind(this))

    return deferred.promise
  },
  _proc_prop: function(pid, prop){
    let deferred = Q.defer()
    let ps = procfs(pid)
    try{
      ps[prop](function(err, data){
        if(err){
          deferred.reject(err)
        }
        else{
          deferred.resolve(data)
        }
      })
    }
    catch(e){
      console.log('err', prop, e)
      // deferred.reject(e)
      throw e
    }

    return deferred.promise
  },
  _procs: function(pid, props){
    props = props || this.default_props

    props = (Array.isArray(props)) ? props : [props]
    let deferred = Q.defer()

    fs.readdir('/proc/', function(err, files){

      if(err){
        deferred.reject(err)
      }
      else{
        let procs = {}

        Array.each(files, function(file, index){
          let proc_pid = file * 1//type cast
          if(!isNaN(proc_pid)){

            if(pid && proc_pid == pid){
              procs[pid] = {}

            }
            else if(!pid){
              procs[proc_pid] = {}
              // this._proc_props(proc_pid, props).then(function(data){
              //   procs[proc_pid] = data
              //
              // }).done()
            }
          }

          // if(index == files.length -1)


        }.bind(this))

        let counter = 1
        Object.each(procs, function(proc, pid){
          this._proc_props(pid, props)
          .then(function(data){
            procs[pid] = data


            console.log('counter...', counter, Object.getLength(procs))
            if(counter == Object.getLength(procs))
              deferred.resolve(procs)

            counter++
          })
          .fail(err => deferred.reject(err))
          .done()


        }.bind(this))

      }
        // debug_internals(files)

      // cb(procs)
    }.bind(this))

    return deferred.promise

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


    // return deferred.promise;
  },
  initialize: function(options){

		this.parent(options);//override default options

    let self = this

    //https://www.npmjs.com/package/node-watch
    //try:  https://github.com/bevry/watchr
    // chokidar.watch('/proc', {
    // 	// cwd: '/proc/',
    //   // ignored: /(^|[\/\\])\..|[A-Za-z]+$/,
    //   ignored: /(^|[\/\\])\..|^\/[A-Za-z]+\/[a-zA-Z|\.|\-|\_]+$/,
    //   // ignored: /([^0-9]*)/g,
    // 	depth: 0,
    //   // usePolling: true,
    //   // ignored: /(^|[\/\\])\..|[A-Za-z]+/,
    //
    // })
    // .on('all', (event, path) => {
    //   // path = path * 1
    //
    //   // if(!isNaN(path))
    //     console.log(event, path);
    // })
    // .on('error',
		// 	error => debug_internals(`Watcher error: ${error}`)
		// )

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


    // // setInterval(function(){
    //   fs.readdir('/proc/', function(err, files){
    //     if(!err)
    //       debug_internals(files)
    //
    //   })
    // // }, 100)
		this.log('os-procs', 'info', 'os-procs started');
  },

});
