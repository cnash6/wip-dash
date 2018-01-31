

// DEPRECATED /////////////////


'use strict';

angular.module('elliotdashboardApp')
.factory('SlackFeedService', function($http, $q, $websocket) {

	return {
		getWsUrl: getWsUrl
	};

	function getWsUrl(scope) {
		$http.get('https://slack.com/api/rtm.start?token='+ scope.AUTH_TOKEN)
		.success(function(successCb) {
			scope.wsUrl = successCb.url;
			getMessages(scope);
		})
		.error(function (error, status){
	        scope.error = { message: error, status: status};
	        console.log('HTTP Status: ' + scope.error.status);
	        console.log('Message: ' + scope.error.message);
	  	});
	}

	function getMessages(scope) {
		scope.messages = new Array(5);
		var ws = $websocket(scope.wsUrl);

		ws.onOpen( function() {
			console.log('========== Slack Feed WebSocket Open ==========');
		});

		ws.onMessage( function(message) {
			var messageJson = JSON.parse(message.data);

			if(messageJson.type === 'message'){
				getUserInfo(scope, messageJson.user,
											messageJson.channel,
											messageJson.text,
											messageJson.ts);
			}
		});
	}

	function addMessage(messagesArray, message) {
		var i;
		for(i = messagesArray.length-1; i > 0; i--) {
			messagesArray[i] = messagesArray[i-1];
		}
		messagesArray[0] = message;
	};

	function acceptedChannel(channel){
		var acceptedChannels = ['general', 'random', 'technical', 'ux', 'dashing-test'];
		return (acceptedChannels.indexOf(channel) > -1);
	};

	function getColor(channelName) {
		switch(channelName) {
			case 'general':
				return {"background-color": "rgba(255, 255, 255, 1)"};
			case 'random':
				return {"background-color": "rgba(27, 133, 184, 0.2)"};
			case 'technical':
				return {"background-color": "rgba(85, 158, 131, 0.2)"};
			case 'ux':
				return {"background-color": "rgba(174, 90, 65, 0.2)"};
			case 'dashing-test':
				return {"background-color": "rgba(195, 203, 113, 0.2)"};
			default:
				return {"background-color": "cyan"};
		}
	}

	function getUserInfo(scope, userId, channelId, text, ts){
		var user = $http.get('https://slack.com/api/users.info?token='+ scope.AUTH_TOKEN + '&user=' + userId),
			channel = $http.get('https://slack.com/api/channels.info?token='+ scope.AUTH_TOKEN + '&channel=' + channelId),
			group = $http.get('https://slack.com/api/groups.info?token='+ scope.AUTH_TOKEN + '&channel=' + channelId);

		$q.all([user, channel, group]).then( function(array) {
			var channelName;
			if(!array[1].data.ok) {
				channelName = array[2].data.group.name;
			} else {
				channelName = array[1].data.channel.name;
			}

			if(acceptedChannel(channelName)){
				addMessage(scope.messages, {
					ts: ts,
					channel: '#'+channelName,
					user: '@'+array[0].data.user.name,
					text: text,
					color: getColor(channelName),
					img: "url(../images/defaultUser.jpg)"
				});
			}

			var i;
			for(i = 0; i < scope.messages.length; i++) {
				console.log("message " + i + ": ");
				console.log(JSON.stringify(scope.messages[i]));
			}
		});
	};
});



