'use strict';

/**
 * @ngdoc function
 * @name elliotdashboardApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the elliotdashboardApp
 */
angular.module('elliotdashboardApp')
  	.controller('MainCtrl', ['$http', '$scope', 'ApiService', function ($http, $scope, ApiService) {

  		ApiService.init();


  		ApiService.get('api/logo', {"project": "myCricket"}).then(function(response) {
  			$scope.myCricketLogo = response.data;
  		});

  		ApiService.get('api/ngrok').then(function(res) {
  			console.log(res.data);
  			$scope.ngrokUrl = res.data;
  			 $(".dash-tab").attr('title', $scope.ngrokUrl);
  		});



		$scope.iosRepo = "slalomatldev/MyCricket-iOS";
		$scope.iosDrawOrder = 1;
		$scope.androidRepo = "slalomatldev/MyCricket-Android";
		$scope.androidDrawOrder = 2;

  }]);