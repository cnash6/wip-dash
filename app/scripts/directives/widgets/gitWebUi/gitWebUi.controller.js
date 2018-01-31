(function () {
	'use strict';

	angular
	.module('elliotdashboardApp')
	.controller('GitWebUICtrl', GitWebUICtrl);

	GitWebUICtrl.inject = ['$scope', '$http', 'mySocket', 'ApiService'];

	function GitWebUICtrl($scope, $http, mySocket, ApiService) {
		$scope.divId = $scope.repo;

		$scope.loading = true;

		drawRepo($scope.order);

		mySocket.on('reloadrepo', function(data) {
			if (data.repo == $scope.repo) {
				drawRepo(0);
				console.log("repo " + $scope.repo + "updated");
			}
		});

		function drawRepo(drawOrder) {
			// Timeouts used to avoid drawing 2 graphs at once. It's Hacky
			setTimeout(function(){ 
				ApiService.get('api/github', {"repo": $scope.repo}).then(function(response) {
					$scope.githubdata = response.data;
					var element = document.getElementById($scope.divId);
					var dataCallback = function (done) { 
					    window.setTimeout(function () { 
					    	console.log("drawing " + $scope.repo);
					        done($scope.githubdata);
					        $scope.loading = false;
					    }, 100); 
					};
					var moreDataCallback = function (from, done) {
						console.log(from);
					    done(from, null);
					}
					var options = {
					    dataCallback: dataCallback,
					    moreDataCallback: moreDataCallback
					};
					GitFlowVisualize.draw(element, options);
				});
			}, (drawOrder-1)*4000);
		}
	}
})();