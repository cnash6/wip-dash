(function () {
	'use strict';

	angular.module('elliotdashboardApp')
	.directive('gitWebUi', function () {
		return {
			restrict: 'E',
			controller: 'GitWebUICtrl',
			scope: {
				repo: '=',
				order: '=',
				logo: '='
			},
			link: function (scope, element, attrs) {
			},
			templateUrl: 'scripts/directives/widgets/gitWebUi/gitWebUi.html'
		};
	})
}());
