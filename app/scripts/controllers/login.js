(function () {
	'use strict';

	angular
	.module('elliotdashboardApp')
	.controller('LoginCtrl', LoginCtrl);

	LoginCtrl.inject = ['$scope', 'ApiService', '$location', 'toastr'];

	function LoginCtrl($scope, ApiService, $location, toastr) {

		ApiService.init();

		$scope.working = false;

		$scope.submit = function(username, password) {
			$scope.working = true;

			var data = {
				"username": $scope.username,
				"password": $scope.password
			}
			ApiService.authenticate(data).then(function(response) {
				console.log(response);
				if(response.success) {
					toastr.success("Success");
					setTimeout(function() {
						$scope.working = false;
						$location.path('/');
					}, 900)

				} else {
					toastr.error("Invalid Credentials");
					$scope.working = false;
				}
			})
		}

	}
})();