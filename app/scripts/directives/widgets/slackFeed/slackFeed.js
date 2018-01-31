'use strict';

angular.module('elliotdashboardApp')
	.directive('slackFeed', function() {
		return {
			restrict: 'E',
			controller: 'SlackFeedCtrl',
			// replace: true,
			templateUrl: 'scripts/directives/widgets/slackFeed/slackFeed.html',
			scope: {
				messages: '='
			}
		};
	});