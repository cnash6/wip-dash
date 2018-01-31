(function () {
	'use strict';

	angular.module('elliotdashboardApp')
	.directive('jiraBoard', function () {
		return {
			restrict: 'E',
			controller: 'JiraBoardCtrl',
			scope: {
				url: '=',
				name: '='
			},
			link: function (scope, element, attrs) {
			},
			templateUrl: 'scripts/directives/widgets/jiraBoard/jiraBoard.html'
		};
	})
}());
