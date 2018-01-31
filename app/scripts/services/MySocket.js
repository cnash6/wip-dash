'use strict';

angular.module('elliotdashboardApp')
.factory('mySocket', function (socketFactory, $rootScope, ApiService) {
  	// var myIoSocket = io.connect('http://localhost:9003');

  	// mySocket = socketFactory({
   //  	ioSocket: myIoSocket
  	// });

  	// return mySocket;
  	var socket = io.connect(ApiService.getDomain());

  	  return {
  	    on: function(eventName, callback){
  	      socket.on(eventName, callback);
  	    },
  	    emit: function(eventName, data) {
  	      socket.emit(eventName, data);
  	    }
  	  };

});