'use strict'

const path = require('path'),
		passwd = require('etc-passwd');

const App =  process.env.NODE_ENV === 'production'
      ? require('./config/prod.conf')
      : require('./config/dev.conf');


module.exports = new Class({
  Extends: App,


  options: {

		id: 'groups',
		path: '/os/groups',

		params: {
			uid: /^\w+$/,
			prop: /groupname|password|gid|users/
		},

		api: {

			version: '1.0.0',

			routes: {
				get: [
					{
						path: ':gid',
						callbacks: ['get_group'],
						version: '',
					},
					{
						path: ':gid/:prop',
						callbacks: ['get_group'],
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
  get_group: function (req, res, next){

	if(req.params.gid){
		passwd.getGroup({'groupname': req.params.gid}, function(err, group){
			if(err){
				//console.error(err);
				res.status(500).json({error: err.message});
			}
			else{
				if(req.params.prop){
					res.json(group[req.params.prop]);
				}
				else{
					res.json(group);
				}
			}
		});
	}
	else{
		//next();
		res.status(500).json({error: 'Bad group gid param'});
	}
  },
  get: function (req, res, next){

		////console.log('get groups');
		let groups = passwd.getGroups();
		let groups_data = [];

		groups.on('group', function(group) {
			////console.log('user');
			////console.log(JSON.stringify(user));
			groups_data.push(group);
		});

		groups.on('end', function() {
			res.json(groups_data);
		});
  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-groups', 'info', 'os-groups started');
  },

});
