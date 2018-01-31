'use strict';

angular.module('elliotdashboardApp')
.factory('ApiService', function ($http, $location, $q, $window) {

   
    return {
    	init: init,
    	get: get,
    	post: post,
    	authenticate: authenticate,
    	getDomain: getDomain
    }

    var domain = '';
    var token = '';
    $window.sessionStorage.token = token;

    function init() {
    	if ($location.absUrl().includes("localhost")) {
    		domain = "http://localhost:9003/"
    	}
    }

    function getDomain() {
    	return domain;
    }

    function authenticate(user) {
    	var d = $q.defer();
		var data = JSON.stringify(user);

    	$http({
    		method: 'POST',
    		url: domain ? domain+'authenticate' : 'authenticate',
    		data: data,
    		headers: {'Content-Type': 'application/json'}
    	}).then(function(response) {
    		$window.sessionStorage.token = response.data.token;
    		token = response.data.token;
    		d.resolve(response.data);
    	});
    	return d.promise;
    }

    function get(url, params) {
    	var d = $q.defer();

    	$http({
    		method: "GET",
    		url: domain ? domain+url : url,
    		params: params
    	}).then(function(response) {
    		d.resolve(response);
    	}, function(err) {
            if(err.status == 401) {
                goToLogin();
            }
            d.reject(err);
    	})

    	return d.promise;
    }

    function post(url, data) {
    	var d = $q.defer();

    	$http({
    		method: "POST",
    		url: domain ? domain+url : url,
    		params: params,
    		data: data
    	}).then(function(response) {
            if(err.status == 401) {
                goToLogin();
            }
    		d.resolve(response);
    	}, function(err) {

    		d.reject(err);
    	})

    	return d.promise;
    }

    function goToLogin() {
    	$location.path('/login');
    }

});