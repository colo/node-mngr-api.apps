'use strict'

var App = require('node-express-app');


module.exports = new Class({
  Extends: App,

  app: null,
  logger: null,
  authorization:null,
  authentication: null,

  options: {

		id: 'os',
		path: '/os',

		logs: undefined,

		params: {
			//route: /^(0|[1-9][0-9]*)$/,
		},

		routes: {

		},

		api: {

			version: '1.0.0',

			routes: {
				get: [
					{
					path: '',
					callbacks: ['get'],
					version: '',
					},
				],
				all: [
					{
					path: '',
					callbacks: ['501'],
					version: '',
					},
				]
			},

		},
  },



});
