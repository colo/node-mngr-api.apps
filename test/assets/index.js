var loginBodyModel = {};
// var items = [];
// var editable = function(){};

// head.js({ socketio: "/socket.io/socket.io.js" }); //no dependencies
head.js({ mootools: "/public/js/mootools-core-1.4.5-full-nocompat-yc.js" }); //no dependencies)

head.js({ crypto: "/public/crypto/rollups/sha1.js" }); //no dependencies
head.js({ ko: "/public/js/knockout-2.2.1.js" }); //no dependencies
head.js({ jQuery: "/public/js/jquery.js" });

// head.ready('ko', 
//   head.js(
// 	{ koOrderable: "/public/js/knockout.bindings.orderable.js" } //jQuery
//   )
// );

head.ready('jQuery', 
  head.js(
	{ bootstrap: "/public/js/bootstrap.min.js" } //jQuery
  )
);

// head.ready('jQuery', 
//   head.js(
// 	{ bootstrapEditable: "/public/bootstrap-editable/js/bootstrap-editable.js" }, //jQuery
// 	function(){
// 	  
// 	  editable = function(item){
// 		$('#name_'+item.pk).editable({
// 		  mode: "popup",
// 		  placement: "right",
// 		  onblur: "cancel",
// 		//   send: "never",
// 		  display: function(value){
// 			console.log('display: ' + value);
// 		  },
// 		  success: function(response, newValue) {
// 			console.log(newValue);
// 			
// 			item.value(newValue);
// 			
// 		// 	userModel.set('username', newValue); //update backbone model
// 			//$.bootstrapSortable(true);
// 		  }
// 		  
// 		});
// 	  }
// 
// 	  items.forEach(function(item){
// 		
// 		editable(item);
// 
// 	  });
// 
// 	}
//   )
// );


head.ready('jQuery',
  head.js(
	{ pager: "/public/js/pager.js" }, //jQuery + ko
	{ history: "/public/history.js/html4+html5/jquery.history.js" } //use with pager.js
  )
);
 

// head.ready('jQuery', 
//   head.js(
// 	{ sammy: "/public/js/sammy.min.js" } //jQuery
//   )
// );

// head.ready('jQuery', 
//   head.js(
// 	{ amplify: "/public/js/amplify.min.js" } //jQuery
//   )
// );

// head.ready('socketio', function(){
// 
//   var socket = io.connect('/socket/login');
// 	socket.on('connect', function(){
// 	console.log('client: connected');
// 	  socket.emit('info');
//   });
// 
//   socket.on('info', function(msg){
// 	console.log('server:');
// 	console.log(msg);
//   });
// 
//   socket.on('disconnect', function(){ console.log('client: disconnected'); });
// 
// })

head.ready('ko', function(){
  
//   head.ready('amplify', function(){
// 	(function(ko) {
// 		ko.extenders.localStore = function(target, key) {
// 			var value = amplify.store(key) || target();
// 
// 			var result = ko.computed({
// 				read: target,
// 				write: function(newValue) {
// 					amplify.store(key, newValue);
// 					target(newValue);
// 				}
// 			});
// 
// 			result(value);
// 
// 			return result;
// 		};
// 	})(ko);
//   });

  
  var LoginModel = function(){
	// 		Cookie.options = {domain : '192.168.0.80:8080'};
		
		var error = Cookie.read('bad') || false;
// 		console.log('cookie: ');
// 		console.log(error);
// 		console.log(document.cookie);

	self = this;
	
// 	self.clearpasswordname = Math.random().toString(36).substring(7);
	
	self.error = ko.observable(error);
	
	self.clearpassword = ko.observable();
	
	self.password = ko.observable(null);
	
	self.crypt = function(form){
// 	  console.log(form.clearpassword.value);
	  
// 	  console.log(self.clearpassword());
	  
	  var hash = CryptoJS.SHA1(form.clearpassword.value);
// 	  console.log(hash.toString());
	  
	  self.password(hash.toString());
	  
// 	  console.log(self.password());
	  
	  form.clearpassword.value = "";
	  return true;
	};
  };
  
  loginBodyModel = {
	login: new LoginModel()
  }

  
  head.ready('pager',
	head.ready('history',
	  function() {
		
		if(pager.useHTML5history == false){
  // 		// use HTML5 history
		  pager.useHTML5history = true;
  // 		// use History instead of history
		  pager.Href5.history = History;
		  
		  loginBodyModel['base'] = '/';
		  
  // 		// extend your view-model with pager.js specific data
		  pager.extendWithPage(loginBodyModel);
  // 		// apply the view-model using KnockoutJS as normal
		  ko.applyBindings(loginBodyModel, document.getElementById("login-container-fluid"));
		  
  // 		// start pager.js
  // 		// pager.start();
  // 		// start pager.js
		  pager.startHistoryJs();
		}
		else{//inside another page
		  loginBodyModel['base'] = '/login/';
		  var page = new pager.Page();
		  loginBodyModel['$__page__'] = page;
		  ko.applyBindings(loginBodyModel, document.getElementById("login-container-fluid"));
		}
		

	})
  );

  

});

// head.ready('sammy', function(){
//   // Client-side routes    
//   Sammy(function () {
// 
// 	  this.get('/:route', function () {
// // 		  console.log('route: ' + this.params['route']);
// // 		  if(this.params['route'] == 'login'){
// // 			head.js("/public/apps/login/main.js");
// // 		  }
// 		head.js("/public/apps/"+ this.params['route'] +"/index.js");
// 	  });
// 
//   // 	// User - details
//   // 	this.get('/user', function () {
//   // 		console.log('user page');
//   // // 		self.userId = this.params.uid;
//   // // 		self.load(self.userId);
//   // 	});
//   // 	
//   // 	this.get('/login', function () {
//   // 		console.log('login page');
//   // // 		self.userId = this.params.uid;
//   // // 		self.load(self.userId);
//   // 	});
// 	  
//   }).run();
// });

