'use strict'

var path = require('path'),
		exec = require('child_process').exec,
		Q = require('q');
	
const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,
  
  command: "df -akT",
  mounts: [],
  
  options: {
	  
		id: 'mounts',
		path: '/os/mounts',
		
		params: {
			prop: /fs|type|bloks|used|available|percentage|mount_point/
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: ':mount',
						callbacks: ['get_mount'],
						version: '',
					},
					{
						path: ':mount/:prop',
						callbacks: ['get_mount'],
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
  /**
   * searchs by "fs", need to send encoded "/" (%2F)
   * @example: mounts/%2Fdev%2Fsdb3
   * */
  get_mount: function (req, res, next){
		//console.log('mounts param:');
		//console.log(req.params);
		
		if(req.params.mount){
			this._mounts(req.params.mount)
			.then(function(result){
				////console.log(result);
				if(!(typeof(req.params.prop) == 'undefined')){
					
					if(result[req.params.prop]){
						res.json(result[req.params.prop]);
					}
					else{
						res.status(500).json({error: 'bad mount property'});
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
			res.status(500).json({error: 'bad mount param'});
		}
  },
  get: function (req, res, next){
		this._mounts()
		.then(function(result){
			res.json(result);
		})
		.done();
		
  },
  _mounts: function(mount){
		var deferred = Q.defer();
		
		if(mount){//if mount param
			if(this.mounts.length == 0){//if mounts[] empty, call without params
				this._mounts()
				.then(function(){
					deferred.resolve(this._mounts(mount));
				}.bind(this), function (error) {
					deferred.reject(error);
				})
				.done();
			}
			else{
				this.mounts.each(function(item, index){
					if(item.fs == mount){
						deferred.resolve(item);
					}
				});
				
				deferred.reject(new Error('Mount not found'));
			}
			
			
		}
		else{
			this.mounts = [];
			var child = exec(
				this.command,
				function (err, stdout, stderr) {
					
					if (err) deferred.reject(err);
					
					var data = stdout.split('\n');

					//drives.splice(0, 1);
					//drives.splice(-1, 1);
					//var mounts = [];
					data.each(function(item, index){
						if(index != 0 && index != data.length -1 ){
							////console.log(item.clean().split(' '));
							var tmp = item.clean().split(' ');
							this.mounts.push({
								fs: tmp[0],
								type: tmp[1],
								bloks: tmp[2],
								used: tmp[3],
								availabe: tmp[4],
								percentage: tmp[5].substring(0, tmp[5].length - 1),
								mount_point: tmp[6],
							})
						}
					}.bind(this));
					
					deferred.resolve(this.mounts);
				}.bind(this)
			);
		}
	
    return deferred.promise;  
  },
  initialize: function(options){
	
		this.parent(options);//override default options
		
		this.log('os-mounts', 'info', 'os-mounts started');
  },
	
});

