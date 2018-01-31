(function () {
	'use strict';

	angular
	.module('elliotdashboardApp')
	.controller('JiraBoardCtrl', JiraBoardCtrl);

	JiraBoardCtrl.inject = ['$scope', '$http', 'mySocket', 'ApiService'];

	function JiraBoardCtrl($scope, $http, mySocket, ApiService) {

		var STATUS_COLORS = {
			'Backlog': {
				base: '#1b85b8',
				bg: "rgba(" + hexToRgb("1b85b8") + ", .2)"
			},
			'Selected for Development': {
				base: '#559e83',
				bg: "rgba(" + hexToRgb("559e83") + ", .2)"
			},
			'In Progress': {
				base: '#ae5a41',
				bg: "rgba(" + hexToRgb("ae5a41") + ", .2)"
			},
			'Done': {
				base: '#c3cb71',
				bg: "rgba(" + hexToRgb("c3cb71") + ", .2)"
			}
		}

		setTimeout(function(){ 
			setup();
		}, 500);

		function setup() {
			$scope.loaded = 0;
			getBoardIssues();
			getBoardUpdates();
		}

		mySocket.on('reloadjira', function(data) {
			if($scope.loaded == 2) {
				console.log("Got Jira Update");
				setup();
			}
		});

		function getBoardIssues() {
			ApiService.get('api/jira').then(function(response) {
			    var statuses = response.data;
			    var statusHeight = 100/statuses.length+'%';
			    for (var i = 0; i < statuses.length; i++) {
			    	var status = statuses[i];
			    	status.statusHeight = statusHeight;
			    	status.barchunks = [];
			    	status.baseColor = STATUS_COLORS[status.name].base;
			    	status.bgColor = STATUS_COLORS[status.name].bg;
			    	var statusTotalIssues = status.totalIssues;
			    	var issueKeys =  Object.keys(status.issues);
			    	for (var j = 0; j < issueKeys.length; j++) {
			    		var issueName = issueKeys[j];
			    		var issueNum = status.issues[issueKeys[j]];
			    		var chunkColor = shadeColor(status.baseColor, -.5+(.25*j));
			    		status.barchunks.push({
			    			name : issueName,
			    			num : issueNum,
			    			bar_pct : issueNum/statusTotalIssues*100+'%',
			    			color : chunkColor
			    		})
			    	};
			    };
			    $scope.statuses = statuses;
			    $scope.loaded++;
			});
		}

		function getBoardUpdates() {
			ApiService.get('api/recent').then(function(response) {
			    var updates = response.data;
				for (var i = 0; i < updates.length; i++) {
					var update = updates[i];
					update.color = STATUS_COLORS[update.status].base;
					update.bgcolor = STATUS_COLORS[update.status].bg;
					if(!update.changelog.from) {
						update.changelog.from = "None";
					}
					if(!update.changelog.to) {
						update.changelog.to = "None";
					}
					if(update.isnew == 1) {
						update.moment = moment(update.createdts);
						update.momentformat = moment(update.createdts).calendar();
					} else {
						update.moment = moment(update.changelog.ts);
						update.momentformat =moment(update.changelog.ts).calendar();
					}
				};
				updates.sort(function(a,b){
				  return new Date(b.moment) - new Date(a.moment);
				});

				$scope.updates = updates;
				$scope.loaded++;
			});
		}

		function shadeColor(color, percent) {   
		    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
		    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
		}

		function hexToRgb(hex) {
		    var bigint = parseInt(hex, 16);
		    var r = (bigint >> 16) & 255;
		    var g = (bigint >> 8) & 255;
		    var b = bigint & 255;

		    return r + "," + g + "," + b;
		}
	}
})();