(function () {
	'use strict';

	angular
	.module('elliotdashboardApp')
	.controller('SlackFeedCtrl', SlackFeedCtrl)
	.directive('ngScrollBottom', ngScrollBottom);

	SlackFeedCtrl.inject = ['$scope', '$http', 'mySocket'];

	function SlackFeedCtrl($scope, $http, mySocket) {
		// console.log("========== SlackFeedService - grabbing auth token and WebSocket URL ==========");
		// $http.get('../config.json').then(function(res) {
		// 	$scope.AUTH_TOKEN = res.data.SLACK_AUTH_TOKEN;
		// 	SlackFeedService.getWsUrl($scope, function(){});
		// });

		$scope.messages = [];
		$scope.messageCards = [];
		$scope.currentCard = {};

		mySocket.on('slack', function(data) {
			console.log("test");
			addMessage(data);
			$scope.$apply();
		});

		function addMessage(message) {
			console.log(message);
			if ($scope.currentCard.messages) {
				var previousMessage = $scope.currentCard.messages[$scope.currentCard.messages.length-1];
				message.showUser = true;
				if(previousMessage.channel == message.channel) {
					message.showUser = message.user == previousMessage.user ? false : true;
					$scope.currentCard.messages.push(message);
					$scope.messages.push(message);
				} else {
					var newCard = {};
					newCard.messages = [message];
					newCard.channel = message.channel;
					$scope.currentCard = newCard;
					$scope.messageCards.push(newCard);
					$scope.messages.push(message);
				}
			} else {
				message.showUser = true;
				$scope.currentCard = {
					channel: message.channel,
					messages: [message]
				}
				$scope.messages.push(message);
				$scope.messageCards.push($scope.currentCard);
			}
		}


		/// Testing stuff
		var channels = ['general', 'random', 'technical', 'ux', 'dashing-test'];
		var sampleText = ['Lorem ipsum dolor sit amet, solet intellegebat id usu, quod assueverit adversarium in eam.',
							'Lorem ipsum dolor sit amet, solet intellegebat id usu.',
							'Lorem ipsum dolor sit ametLorem ipsum dolor sit ametLorem ipsum dolor sit ametLorem ipsum dolor sit ametLorem ipsum dolor sit ametLorem ipsum dolor sit ametLorem ipsum dolor sit ametLorem ipsum dolor sit amet'];
		var colors = [{'color':'red'}, {'color':'green'}, {'color':'blue'}];
		var users = ['cnash', 'ahmedi', 'briano'];

		var currentChannel = 0;

		$scope.addTestMessage = function() {
			var mess = {
				ts: new Date(),
				channel: channels[currentChannel],
				user: users[Math.floor(Math.random()*3)],
				text: sampleText[Math.floor(Math.random()*3)],
				// img: "url(../images/defaultUser.jpg)"
				img: 'http://www.outsystems.com/PortalTheme/img/UserImage.png'
			};
			console.log(mess);
			currentChannel = Math.floor(Math.random()*5);
			addMessage(mess);
		}

	}

	// Scroll Bottom Section

	ngScrollBottom.inject = ['$timeout'];

	function ngScrollBottom($timeout) {
		return {
			scope: {
			  	ngScrollBottom: "="
			},
			link: function ($scope, $element) {
			  	$scope.$watchCollection('ngScrollBottom', function (newValue) {
			  		console.log("newValue");
			    	// if (newValue) {
			      		$timeout(function(){
			        		$element.scrollTop($element[0].scrollHeight);
			      		}, 0);
			    	// }
			  	});
			}
		}
	}
})();