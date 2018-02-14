'use strict'

var path = require('path'),
		fs = require('fs'),
		BlockDevice = require('blockdevice');
	
	
const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');

module.exports = new Class({
  Extends: App,
  
  DEVICE_CLOSED: 'deviceClosed',
  ALL_DEVICES_CLOSED: 'allDevicesClosed',
  
  
  devices: {},
  _scaned_devices: [],
  
  stats_info: {
		read_ios: null,        //requests      number of read I/Os processed
		read_merges: null,     //requests      number of read I/Os merged with in-queue I/O
		read_sectors: null,    //sectors       number of sectors read
		read_ticks: null,      //milliseconds  total wait time for read requests
		write_ios: null,      	//requests      number of write I/Os processed
		write_merges: null,    //requests      number of write I/Os merged with in-queue I/O
		write_sectors: null,   //sectors       number of sectors written
		write_ticks: null,     //milliseconds  total wait time for write requests
		in_flight: null,       //requests      number of I/Os currently in flight
		io_ticks: null,        //milliseconds  total time this block device has been active
		time_in_queue: null   //milliseconds  total wait time for all requests
	},
	
	_stats_info_order: [
		'read_ios',
		'read_merges',
		'read_sectors',
		'read_ticks',
		'write_ios',
		'write_merges',
		'write_sectors',
		'write_ticks',
		'in_flight',
		'io_ticks',
		'time_in_queue'
	],
  
  options: {
	  
		id: 'blockdevices',
		path: '/os/blockdevices',
		
		//scan_dirs: ['/dev/', '/dev/vol0'],
		//scan: /^(hd|sd|xvd)([^0-9]*)$/,
		scan: /hd|sd|xvd/,
		//([^0-9]*)
		
		
		params: {
			device: /^\w+$/,
			prop: /size|blockSize|partitions|stats/
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: ':device',
						callbacks: ['get'],
						version: '',
						},
					{
					path: ':device/:prop',
					callbacks: ['get'],
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
  
  get: function (req, res, next){
		//console.log('req.query');
		//console.log(req.query);
		
		if(req.query && req.query.updated != null){
			this._update_devices(true, req, res, next);//will follow events and return data on "ALL_DEVICES_CLOSED
		}
		else{
			this._return_data(req, res, next);
		}
  },
  initialize: function(options){
		
		this.parent(options);//override default options
		
		this._update_devices();
		
		this.log('os-blockdevices', 'info', 'os-blockdevices started');
  },
  _return_stats: function(device){
		var stats_info = Object.clone(this.stats_info);
		//console.log('path /sys/block/'+device+'/stat');
		//console.log(fs.readFileSync('/sys/block/'+device+'/stat', 'ascii').clean().split(' '));
		
		var device_stats = fs.readFileSync('/sys/block/'+device+'/stat', 'ascii').clean().split(' ');
		
		Array.each(this._stats_info_order, function(key, index){
			stats_info[key] = device_stats[index];
		}.bind(this));
		
		return stats_info;
	},
  _return_data: function(req, res, next){
		
		//stats are always updated on request, with a blocking fileRead
		Object.each(this.devices, function(data, dev){
			
			Object.each(data.partitions, function(info, part){
				//console.log(this._return_stats(dev+'/'+part));
				this.devices[dev].partitions[part].stats = this._return_stats(dev+'/'+part);
			}.bind(this));
			
			//console.log(this._return_stats(dev));
			this.devices[dev].stats = this._return_stats(dev);
		}.bind(this));
		
		if(req.params.device){
			
			if(!this.devices[req.params.device]){
				res.status(500).json({error: 'Wrong device'});
			}
			
			if(req.params.prop){
				if(!this.devices[req.params.device][req.params.prop]){
					res.status(500).json({error: 'Wrong property'});
				}
				else{
					res.json(this.devices[req.params.device][req.params.prop]);
				}
			}
			else{
				res.json(this.devices[req.params.device]);
			}
		}
		else{
			res.json(this.devices);
		}
	},
  _update_devices: function(events, req, res, next){
		
		this.addEvent(this.DEVICE_CLOSED, function(dev, req, res, next){
			console.log('device closed: ' + dev);
			//console.log(req);
			
			//will return the "devices" array reduces, without the closed dev
			this._scaned_devices = this._scaned_devices.filter(function(item){
				if(item != dev){
					return true;
				}
				else{
					return false;
				}
			});
			
			console.log(this._scaned_devices);
			//console.log(this.devices);
			
			if(this._scaned_devices.length == 0){
				this.fireEvent(this.ALL_DEVICES_CLOSED, [req, res, next]);
			}
			
		});
		
		/**
		 * when all devices are close, we can return the information
		 * */
		this.addEvent(this.ALL_DEVICES_CLOSED, function(req, res, next){
			console.log('all device closed');
			//console.log(arg);
			
			this._return_data(req, res, next);
			
			this.removeEvents();//remove all events to avoid duplication on next req
			
			
		}.bind(this));
		
		fs.readdir('/dev', function(err, files){
			if( err != null )
				throw err;
			
			this._scaned_devices = [];
			this.devices = {};
			/**
			 * add all matching devices to "devices" array, so "on close" we know beforehand the complete list
			 * **/
			Array.each(files, function(file){
				if(this.options.scan.test(file)){
					this._scaned_devices.push(file);
				}
			}.bind(this));
			
			if(this._scaned_devices.length == 0 && events)//no matching devices, just go and return {}
				this.fireEvent(this.ALL_DEVICES_CLOSED);
				
			Array.each(files, function(file){
				
				
				if(this.options.scan.test(file)){
					//this.devices[file] = {};
					
					var device = new BlockDevice({
						path: '/dev/'+file,
						// also, we only want to read
						mode: 'r',
					});
					
					device.open( function( error ) {
						
						var info = {};
						
						// You should do proper error handling
						// here, but for the sake of simplicity
						// in an example, we'll just throw
						if( error != null )
							throw error;
							
						device.detectSize( null, function( err, size ){
							if( err != null )
								throw err;
								
							//console.log('size: ' + size);
							info['size'] = size;
						
							info['blockSize'] = device.blockSize;
						
							if(/([0-9])+$/.test(file)){//partition number
								//console.log('block device string: '+/[A-Za-z]*/.exec(file));
								//console.log('block device: '+file);
								
								var disk = /[A-Za-z]*/.exec(file);//return string device only
								//this.devices[disk]['partitions'] = {};
								if(!this.devices[disk]){
									this.devices[disk] = {};
								}
								//console.log(this.devices);
								if(!this.devices[disk]['partitions'])
									this.devices[disk]['partitions'] = {};
									
								this.devices[disk]['partitions'][file] = info;
							}
							else{
								info.partitions = {};
								if(!this.devices[file])
									this.devices[file] = {};
									
								this.devices[file] = Object.merge(this.devices[file], info);
							}
							
							if(events)
								this.fireEvent(this.DEVICE_CLOSED, [file, req, res, next]);	
								
						}.bind(this));
						
						
						
					
					}.bind(this));
					
					device.close(function( err ){ if( err != null ) throw err; });
					
				}
				
			}.bind(this));
			
			
		}.bind(this));
	}
});

