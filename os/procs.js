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
  * or the proc {} won't have all the requested stats
  'statm',
  'status',
  'env',
  'argv',
  'threads',
  'fds',
  'cwd',
  'io',
  ->fd(fdPath,cb) not implemented yet
  **/
  // _all_stats: [
  //   'stat',
  //   'statm',
  //   'status',
  //   'env',
  //   'argv',
  //   'threads',
  //   'fds',
  //   'cwd',
  //   'io',
  // ].sort().reverse(),
  // default_stats: [
  //   'stat',
  // ].sort().reverse(),
  default_stats: {
    'stat': [],
  },
  /**
  * not implemented:
  * net && wifi (already on os module)
  * disk (already on apps/os/blokdevices)
  **/
  // _static_stats:['tcp', 'udp', 'unix'],

  options: {

    id: 'procs',
		path: '/os/procs',

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
					// {
					// 	path: ':pid/:prop',
					// 	callbacks: ['get_proc'],
					// 	version: '',
					// },
					{
						path: '',
						callbacks: ['get'],
						version: '',
					},
				]
			},

		},
  },
  /**
  * ex: ?stat&statm=["size","resident"]
  **/
  _query_to_stats: function(query){
    // //console.log(query.statm)
    // //console.log(JSON.parse(query.statm))

    let stats = undefined
    if(query && Object.getLength(query) > 0){
      stats = {}
      Object.each(query, function(props, stat){

        // console.log(props, stat)

        if(props){
          stats[stat] = JSON.parse(props)
        }
        else{
          stats[stat] = []
        }
      })

    }

    debug_internals('_query_to_stats %o', stats)
    return stats
  },
  get_proc: function (req, res, next){
    if(!procfs.works)
      res.status(500).json({error: "can't access proc fs"})


		if(req.params.pid){
      let pid = req.params.pid

      this._procs(pid, this._query_to_stats(req.query))
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

    // procfs.tcp(function(err, data){//console.log(data)})
  },
  get: function (req, res, next){
		if(!procfs.works)
      res.status(500).json({error: "can't access proc fs"})

		this._procs(null, this._query_to_stats(req.query))
		.then(procs => res.json(procs))
    .fail(err => res.status(500).json(err))
		.done();


  },
  _proc_stats(pid, stats){
    // stats = (Array.isArray(stats)) ? stats : [stats]

    let deferred = Q.defer()

    let proc = {}
    let counter = 0
    // Array.each(this._all_stats, function(stat, index){
    Object.each(stats, function(props, stat){

      // console.log('stat', stat)

      // if(stats[stat]){
      //   let props = stats[stat]

        this._proc_stat(pid, stat).then(function(data){
          // console.log(counter, data)

          if(props && props.length > 0){
            Object.each(props, function(prop){
              if(data[prop]){
                if(!proc[stat]) proc[stat] = {}

                proc[stat][prop] = (isNaN(data[prop] * 1)) ? data[prop] : data[prop] * 1
              }
            })
          }
          else{
            proc[stat] = (isNaN(data * 1)) ? data : data * 1
          }

          // //console.log('resolving...', Object.getLength(stats))
          if(counter == Object.getLength(stats) - 1){

            deferred.resolve(proc)
          }

          counter++
        })
        // .fail(err => deferred.reject(err))
        .fail(function(err){
          proc[stat] = err

          // if(index == stats.length - 1)
          //   deferred.resolve(proc)

          // //console.log('resolving...', err)
          if(counter == Object.getLength(stats) - 1){

            deferred.resolve(proc)
          }

          counter++
        })
        .done()

      // }


    }.bind(this))

    return deferred.promise
  },
  _proc_stat: function(pid, stat){
    let deferred = Q.defer()
    // if(this._static_stats.contains(stat)){
    //   try{
    //     procfs[stat](function(err, data){
    //       // Array.each(data, function(val){
    //       //
    //       // })
    //       if(err){
    //         deferred.reject(err)
    //       }
    //       else{
    //         deferred.resolve(data)
    //       }
    //     })
    //   }
    //   catch(e){
    //     //console.log('err', stat, e)
    //     // deferred.reject(e)
    //     throw e
    //   }
    // }
    // else{
      let ps = procfs(pid)
      try{
        ps[stat](function(err, data){
          if(err){
            deferred.reject(err)
          }
          else{
            deferred.resolve(data)
          }
        })
      }
      catch(e){
        //console.log('err', stat, e)
        // deferred.reject(e)
        throw e
      }
    // }

    return deferred.promise
  },
  _procs: function(pid, stats){
    stats = stats || this.default_stats

    debug_internals('_procs stats %o', stats)

    // stats = (Array.isArray(stats)) ? stats : [stats]
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
              // this._proc_stats(proc_pid, stats).then(function(data){
              //   procs[proc_pid] = data
              //
              // }).done()
            }
          }

          // if(index == files.length -1)


        }.bind(this))

        let counter = 1
        Object.each(procs, function(proc, pid){
          this._proc_stats(pid, stats)
          .then(function(data){
            procs[pid] = data


            // //console.log('counter...', counter, Object.getLength(procs))
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


  },
  initialize: function(options){

		this.parent(options);//override default options

    this.log('os-procs', 'info', 'os-procs started');
  },

});
