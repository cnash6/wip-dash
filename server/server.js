var express = require('express');
var app = express();
var http_server = require('http').Server(app);
var https_server = require('https').Server(app);
var http = require('http');
var rp = require('request-promise');
var _ = require('lodash');
var moment = require('moment');
var deferred = require('deferred');
var io = require('socket.io')(http_server);
var io_https = require('socket.io')(https_server);
var spawn = require('child_process').spawn;
var bodyParser = require('body-parser');
var WebSocketClient = require('websocket').client;
var fs = require('fs');
var https = require('https');
var jwt = require('jsonwebtoken'); 
var expressJwt = require('express-jwt');
var os = require('os');

var config = require('./config.json');
app.set('apiSecret', config.globalConfig.secret);

////////////////// CONTSTANTS /////////////////////

var USERNAME = 'admin';
var PASSWORD = 'slalom123';

var IOS_REPO = "slalomatldev/MyCricket-iOS";
var ANDROID_REPO = "slalomatldev/MyCricket-Android";
var TEST_REPO = "cnashslalom/testrepo"
var NGROK_TUNNEL;

var HEROKU_HOST = "https://slalomatldash.herokuapp.com"

var projects = config.projects;
var globalConfig = config.globalConfig;

// For now...
var myCricket = config.projects[0];

var port = process.env.PORT || 9003;
var https_port = process.env.SSLPORT || 9004;

////////////////// HEADERS /////////////////////

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Access-Control-Allow-Headers, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST","PUT");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

////////////////// SERVER CONFIG ////////////////

app.use(express.static('dist'));

app.use('/api', expressJwt({secret: app.get('apiSecret')}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

var jsonParser = bodyParser.json()

// var apiRoutes = express.Router(); 

///// AUTHENTICATION

app.post('/authenticate', function(req, res) {
	// console.log(req);
	if (req.body.username != USERNAME || req.body.password != PASSWORD) {
		res.json({ success: false, message: 'Authentication failed' });
	} else {
		var token = jwt.sign(req.body, app.get('apiSecret'), {
          	expiresIn: '12h' // expires in 12 hours
        });
        res.json({
			success: true,
			message: 'Enjoy your token!',
			token: token
        });
	}
});

// All routes below this protected
// app.use(function(req, res, next) {
// 	console.log(req.url);
// 	var token = req.body.token || req.query.token || req.headers['x-access-token'];
// 	if (req.url == '/authenticate') {
// 		next();
// 	} else {
// 		if(token) {
// 			jwt.verify(token, app.get('apiSecret'), function(err, decoded) {      
// 				if (err) {
// 					return res.json({ success: false, message: 'Failed to authenticate token.' });    
// 				} else {
// 					// if everything is good, save to request for use in other routes
// 					req.decoded = decoded;    
// 					next();
// 				}
// 			});
// 		} else {
// 			return res.status(403).send({ 
// 			    success: false, 
// 			    message: 'No token provided.' 
// 			});
// 		}
// 	}
// });



//// GETS

app.get('/api/jira', function(req, res){
	console.log("Jira Board data requested");
	getJiraIssueCounts().then(function(result) {
		res.send(result);
	})
});

app.get('/api/recent', function(req, res){
  	console.log("Jira Board Recent Changes data requested");
  	getRecentUpdates().then(function(result) {
  		res.send(result);
  	})
});

app.get('/api/github', function(req, res){
	console.log("Github data requested for " + req.query.repo);
	getGithubRepoData(req.query.repo).then(function(result) {
		res.send(result);
	});
});

app.get('/api/test', function(req, res) {
	res.send("api test");
});

app.get('/api/ngrok', function(req, res) {
	res.send(NGROK_TUNNEL);
})

app.get('/api/logo', function(req, res) {
	console.log("logo request for " + req.query.project);
	var proj = _.find(projects, function(p) { return p.id == req.query.project});
	if(proj) {
		res.send(proj.iconURL);
	}
})

app.get('/api/', function (req, res) {
	res.send('What you want');
});



// app.use('/api', apiRoutes);

//// POSTS

app.post('/githubpayload*', jsonParser, function(req, res) {
	console.log("Github data recieved");
	mySocket.emit('reloadrepo', {
      	repo: req.body.repository.full_name
    });
	res.send("A-Ok");
});

app.post('/jirapayload*', jsonParser, function(req, res) {
	console.log("Jira data recieved");
	mySocket.emit('reloadjira');
	res.send("A-Ok");
});

app.post('/*', function(req, res) {
	console.log("got some random stuff:");
	console.log(req);
	res.send("Bad Request");
})

/// SOCKET

var mySocket = io;

io.on('connection', function(socket) {
  	console.log('New socket connection to front end (http)');
});

io_https.on('connection', function(socket) {
  	console.log('New socket connection to front end (https)');
  	mySocket = io_https;
});

startServer();

////////////////// FUNCTIONS /////////////////////

function startServer() {
	startWebhookRegistration();
	http_server.listen(port, function(){
	  	console.log('listening on ' + port);
	});

	https.createServer({
	 	key: fs.readFileSync('server/key.pem'),
	   	cert: fs.readFileSync('server/cert.pem')
	}, app).listen(https_port);
}

function startWebhookRegistration() {
	var hostname = os.hostname();
	if (hostname.includes('local')) {
		console.log("Getting Ngrok Tunnel to localhost url")
		getTunnel().then(function(res) {
			registerGithubWebhooks(res).then(function(res) {
				console.log("success registering all Github webhooks");
			},	
			function(err) {
				console.log(err)
			});

			registerJiraWebhooks(res).then(function(res) {
				console.log("success registering all jira webhooks");
			},	
			function(err) {
				console.log(err)
			});
		},
		function(err) {
			console.log("No Ngrok server running, starting new instance");
			var ngrok = spawn('./server/ngrok', ['http', '9003', ]);
			setTimeout(function(){ 
				getTunnel().then(function(res) {
					console.log("got tunnel");
					registerGithubWebhooks(res).then(function(res) {
						console.log("success registering all github webhooks");
					},	
					function(err) {
						console.log(err)
					});

					registerJiraWebhooks(res).then(function(res) {
						console.log("success registering all jira webhooks");
					},	
					function(err) {
						console.log(err)
					});
				},
				function(err) {
					console.log(err);
				})
			}, 5000);
		})
	} else {
		registerGithubWebhooks(HEROKU_HOST).then(function(res) {
			console.log("success registering all github webhooks");
		},	
		function(err) {
			console.log(err)
		});

		registerJiraWebhooks(HEROKU_HOST).then(function(res) {
			console.log("success registering all jira webhooks");
		},	
		function(err) {
			console.log(err)
		});
	}

	
	

	// ngrok.stdout.on('data', function (data) {    // register one or more handlers
	// 	var thing = data;
	//   	console.log('stdout: ' + thing);
	// });

	// ngrok.stderr.on('data', function (data) {
	//   	console.log('stderr: ' + data);
	// });

	// ngrok.on('exit', function (code) {
	//   	console.log('child process exited with code ' + code);
	// });
}

function getTunnel() {
	var d = deferred();

	rp({url: "http://localhost:4040/api/tunnels"}).then(function(res) {
		var json = JSON.parse(res)
		var tunnels = json.tunnels;
		var tunnel = _.find(tunnels, function(tunnel) {
			return (tunnel.proto == "http");
		})
		if (tunnel) {
			console.log("Tunnel found: " + tunnel.public_url);
			NGROK_TUNNEL = tunnel.public_url;
			d.resolve(tunnel.public_url);
		} else {
			d.reject("no tunnel");
		}
		
	}, function(err) { 
		console.log(err);
		d.reject(err);
	});
	return d.promise();
}

function registerJiraWebhooks(url) {
	console.log("Start jira webhook register");
	var d = deferred();

	// var p1 = registerGithubWebhook(url, IOS_REPO);
	// var p2 = registerGithubWebhook(url, ANDROID_REPO);
	var p1 = registerJiraWebhook(url);
	Promise.all([p1]).then(function(res) {
		d.resolve();
	},
	function(err) {
		d.reject(err);
	});

	return d.promise();
}

function registerJiraWebhook(url) {
	var d = deferred();

	rp({
		url: "https://slalomatl.atlassian.net/rest/webhooks/1.0/webhook",
		headers: {
		 	'Authorization': 'Basic ' + myCricket.credentials.jira.token
		}
	}).then(function(res) {
		var json = JSON.parse(res);
		var hook = _.find(json, function(hook) {
			return (hook.name == "MyCricketWebhook_"+globalConfig.uniqId);
		});
		if (hook) {
			var hookUrl = hook.self;
			rp({
				url: hookUrl,
				method: 'PUT',
				headers: {
				 	'Authorization': 'Basic ' + myCricket.credentials.jira.token
				},
				body: {
					name: "MyCricketWebhook_"+globalConfig.uniqId,
					url: url+"/jirapayload",
					events: [
						"jira:issue_updated",
						"worklog_created",
						"comment_created",
						"jira:issue_created",
						"comment_updated",
						"jira:issue_deleted",
						"jira:worklog_updated",
						"worklog_deleted",
						"worklog_updated",
						"comment_deleted"
					],
					jqlFilter: "Project=CM",
					excludeIssueDetails : false
				},
				json: true
			}).then(function(res) {
				console.log("Webhook for " + url + " registered  with Jira");
				d.resolve(res);
			}).catch(function(err) {
				console.log("Error registering webhook for " + url + " with Jira");
				d.reject(err);
			});
		} else {
			rp({
				url: "https://slalomatl.atlassian.net/rest/webhooks/1.0/webhook",
				method: 'POST',
				headers: {
				 	'Authorization': 'Basic ' + myCricket.credentials.jira.token
				},
				body: {
					name: "MyCricketWebhook_"+globalConfig.uniqId,
					url: url+"/jirapayload",
					events: [
						"jira:issue_updated",
						"worklog_created",
						"comment_created",
						"jira:issue_created",
						"comment_updated",
						"jira:issue_deleted",
						"jira:worklog_updated",
						"worklog_deleted",
						"worklog_updated",
						"comment_deleted"
					],
					jqlFilter: "Project=CM",
					excludeIssueDetails : false
				},
				json: true
			}).then(function(res) {
				console.log("Webhook for " + url + " registered  with Jira");
				d.resolve(res);
			}).catch(function(err) {
				console.log("Error registering webhook for " + url + " with Jira");
				d.reject(err);
			});
		}

	}).catch(function(err) {
		console.log("Error connecting to Jira");
		d.reject(err);
	});

	return d.promise();
}

function registerGithubWebhooks(url) {
	console.log("start github webhook register");
	var d = deferred();

	var p1 = registerGithubWebhook(url, IOS_REPO);
	var p2 = registerGithubWebhook(url, ANDROID_REPO);
	// var ptest = registerGithubWebhook(url, TEST_REPO);
	Promise.all([p1, p2]).then(function(res) {
		d.resolve();
	},
	function(err) {
		d.reject(err);
	});

	return d.promise();
}

function registerGithubWebhook(url, repo) {
	var d = deferred();

	rp({
		url: "https://api.github.com/repos/" + repo + "/hooks",
		headers: {
		 	'Authorization': 'Basic ' + myCricket.credentials.github.token,
		 	'User-Agent': 'slalomatldev'
		}
	}).then(function(res) {
		var json = JSON.parse(res);
		var hook = _.find(json, function(hook) {
			return hook.config.url.includes("/githubpayload_"+globalConfig.uniqId);
		});
		if (hook) {
			var hookId = hook.id;
			rp({
				url: "https://api.github.com/repos/" + repo + "/hooks/"+hookId,
				method: 'PATCH',
				headers: {
				 	'Authorization': 'Basic ' + myCricket.credentials.github.token,
				 	'User-Agent': 'slalomatldev'
				},
				body: {
				    active: true,
				    events: [
				        "push",
				        "pull_request"
				    ],
				    config: {
				        url: url+"/githubpayload_"+globalConfig.uniqId,
				    	content_type: "json"
				    }
				},
				json: true
			}).then(function(res) {
				console.log("Webhook for " + url + " registered  with " + repo);
				d.resolve(res);
			}).catch(function(err) {
				console.log("Error registering webhook for " + url + " registered  with " + repo);
				d.reject(err);
			});
		} else {
			rp({
				url: "https://api.github.com/repos/" + repo + "/hooks",
				method: 'POST',
				headers: {
				 	'Authorization': 'Basic ' + myCricket.credentials.github.token,
				 	'User-Agent': 'slalomatldev'
				},
				body: {
				    name: "web",
				     active: true,
				     events: [
				        "push",
				        "pull_request"
				    ],
				    config: {
				        url: url+"/githubpayload_"+globalConfig.uniqId,
				    	content_type: "json"
				    }
				},
				json: true
			}).then(function(res) {
				console.log("Webhook for " + url + " registered  with " + repo);
				d.resolve(res);
			}).catch(function(err) {
				console.log("Error regidtering webhook for " + url + " registered  with " + repo);
				d.reject(err);
			});
		}

	}).catch(function(err) {
		d.reject("Error Connecting to repo");
	});

	return d.promise();
}


function getJiraIssueCounts() {
	var d = deferred()

	var DESIRED_ORDERS = [
		"Backlog",
		"Selected for Development",
		"In Progress",
		"Done"
	];

	rp({
		url: "https://slalomatl.atlassian.net/rest/api/2/project/CM/statuses", 
		headers: {'Authorization': 'Basic ' + myCricket.credentials.jira.token}
	}).then(function(res){
		var json = JSON.parse(res);

		var categories = {};
		for (var i = 0; i < json.length; i++) {
			var issuetype = json[i]
			for (var j = 0; j < issuetype.statuses.length; j++) {
				var status = issuetype.statuses[j];
				if (!categories[status.id]) {
					categories[status.id] = {
						name : status.name,
						issues : {},
						totalIssues: 0
					}
					categories[status.id].issues[issuetype.name] = 0
				} else {
					categories[status.id].issues[issuetype.name] = 0;
				}
			};
		};
		rp({
		    url: "https://slalomatl.atlassian.net/rest/api/2/search?maxResults=1000&jql=project='CM'",
		    headers: {
		     	'Authorization': 'Basic ' + myCricket.credentials.jira.token
		    }
		}).then(function(res) {
			var issues = JSON.parse(res).issues;
			for (var i = 0; i < issues.length; i++) {
				var status = issues[i].fields.status.id;
				var issue_type = issues[i].fields.issuetype.name;
				if (categories[status]) {
					categories[status].issues[issue_type]++;
					categories[status].totalIssues++;
				}
			};

			var ordered_cats = [];
			var cat_keys = Object.keys(categories);

			for (var i = 0; i < DESIRED_ORDERS.length; i++) {
				var stat = DESIRED_ORDERS[i];
				for (var j = 0; j < cat_keys.length; j++) {
					if (categories[cat_keys[j]].name == stat) {
						ordered_cats.push(categories[cat_keys[j]]);
						cat_keys.splice(j, 1);
					}
				};
			};
			for (var i = 0; i < cat_keys.length; i++) {
				ordered_cats.push(categories[cat_keys[i]]);
			};
			d.resolve(ordered_cats);
		})
	})
	return d.promise() 
}

function getRecentUpdates() {
	var d = deferred();
	rp({
	    url: "https://slalomatl.atlassian.net/rest/api/2/search?maxResults=10&jql=project='CM'%20ORDER%20BY%20updated%20DESC",
	    headers: {
	     	'Authorization': 'Basic ' + myCricket.credentials.jira.token
	    }
	}).then(function(res) {
		var issues = JSON.parse(res).issues;
		var ids = [];
		_.forEach(issues,function(issue) {
		  	ids.push(issue.id);
		});
		ids.reverse()
		var issues = [];
		var promises = [];

		_.forEach(ids, function(id) {
			var req = rp({
				url: "https://slalomatl.atlassian.net/rest/api/2/issue/" + id + "?expand=changelog",
			    headers: {
			     	'Authorization': 'Basic ' + myCricket.credentials.jira.token
			    }
			})
			req.then(function(res) {
				var json = JSON.parse(res);
				if (json.changelog.histories.length > 0) {
					var change = json.changelog.histories[json.changelog.histories.length-1]
					var item = change.items[change.items.length -1];
					var issue = {
						id: json.id,
						key: json.key,
						isnew: 0,
						summary: json.fields.summary,
						createdts: json.fields.created,
						author: json.fields.creator.displayName,
						status: json.fields.status.name,
						changelog: {
							id: change.id,
							author: change.author.displayName,
							ts: change.created,
							field: item.field,
							from: item.fromString,
							to: item.toString
						}

					};
					issues.push(issue);
				} else {
					var issue = {
						id: json.id,
						key: json.key,
						isnew: 1,
						summary: json.fields.summary,
						createdts: json.fields.created,
						author: json.fields.creator.displayName,
						status: json.fields.status.name,
						changelog: {}

					}
					issues.push(issue);
				}
				
			});
			promises.push(req.promise());
		});
		Promise.all(promises).then(function(result) {
			d.resolve(issues);
		})
		
	})
	return d.promise();
}

function getGithubRepoData(repoName) {
	var d = deferred();

	var responseData = {
		branches: { values: [] },
		tags: { values: [] },
		commits: [{ values: [] }]
	}

	deferred(getGithubRepoBranches(repoName), getGithubRepoTags(repoName))(function(result) {
		responseData.branches.values = result[0];
		responseData.tags.values = result[1];
		getGithubRepoCommits(repoName, result[0]).then(function(result) {
			responseData.commits[0].values = result;
			d.resolve(responseData);
		})
	})

	return d.promise();

}

function getGithubRepoBranches(repoName) {
	// console.log("branches");
	////////////// branch:
	// { 
	// 	"id": "refs/heads/develop", 
	// 	"displayId": "develop", 
	// 	"latestChangeset": "611d320cd97e40871a557fbb4308b9b1762b1f8f"
	// }
	var d = deferred();

	var branchesreq = rp({
		url: "https://api.github.com/repos/" + repoName + "/branches",
	    headers: {
	     	'Authorization': 'Basic ' + myCricket.credentials.github.token,
	     	'User-Agent': 'slalomatldev'
	    }
	})
	branchesreq.then(function(res) {
		var json = JSON.parse(res);
		var branches = [];
		_.forEach(json, function(branch) {
			branches.push({
				id: "refs/heads/" + ((branch.name == "dev") ? "develop" : branch.name),
				// id: "refs/heads/" + branch.name,
				displayId: branch.name,
				latestChangeset: branch.commit.sha,
				isDefault: (branch.name == 'master') ? true : false
			});
		});
		d.resolve(branches);
	});
	return d.promise();
}

function getGithubRepoTags(repoName) {
	// console.log("tags");
	var d = deferred();
	////////////// tag: 
	// { 
	// 	"id": "refs/tags/r1", 
	// 	"displayId": "r1", 
	// 	"latestChangeset": "d3a4299520bc9e5b76ecec831553737982dd1b37"
	// }
	var tagsreq = rp({
		url: "https://api.github.com/repos/" + repoName + "/tags",
	    headers: {
	     	'Authorization': 'Basic ' + myCricket.credentials.github.token,
	     	'User-Agent': 'slalomatldev'
	    }
	})
	tagsreq.then(function(res) {
		var json = JSON.parse(res);
		var tags = [];
		_.forEach(json, function(tag) {
			tags.push({ 
				id: tag.name, 
				displayId: tag.name, 
				latestChangeset: tag.commit.sha
			});
		});
		d.resolve(tags);
	});
	
	return d.promise();
}

function getGithubRepoCommits(repoName, branches) {
	// console.log("getcommits");
	var d = deferred();

	var promises = [];

	_.forEach(branches, function(branch) {
		var promise = getBranchCommits(repoName, branch.latestChangeset);
		promises.push(promise);
	})
	// deferred(promises)(function(result) {
	// 	console.log(result);
	// });
	Promise.all(promises).then(function(results) {
		var allcommits = [].concat.apply([], results);
		allcommits = _.uniqBy(allcommits, 'id');
		allcommits = _.sortBy(allcommits, function(commit) {
			return -commit.authorTimestamp;
		})
		// allcommits = _.take(allcommits, 38);
		d.resolve(allcommits);
	}).catch(function(err) {
		console.log(err);
	})
	
	return d.promise();
}

function getBranchCommits(repoName, branchId) {
	////////////// commit:
	// { 
	// 	"id": "c7c09e5378cae08a4c52107ba58c0318577cf557", 
	// 	"displayId": "c7c09e5", 
	// 	"author": { 
	// 		"emailAddress": "github@duynstee.com", 
	// 		"displayName": "Teun Duynstee"
	// 	}, 
	// 	"authorTimestamp": 1405595690000, 
	// 	"message": "Merge branch 'release/r2'\n\nConflicts:\n\ttest.txt", 
	// 	"parents": [
	// 		{ 
	// 			"id": "d3a4299520bc9e5b76ecec831553737982dd1b37", 
	// 			"displayId": "d3a4299" 
	// 		}, 
	// 		{ 
	// 			"id": "0aabee3cc5a668e1dffd3c464b18890caf98e6e9", 
	// 			"displayId": "0aabee3" 
	// 		}
	// 	]
	// } 
	var d = deferred();
	var commitsreq = rp({
		url: "https://api.github.com/repos/" + repoName + "/commits?sha="+branchId,
	    headers: {
	     	'Authorization': 'Basic ' + myCricket.credentials.github.token,
	     	'User-Agent': 'slalomatldev'
	    }
	})
	commitsreq.then(function(res) {
		var json = JSON.parse(res);
		var commits = [];
		_.forEach(json, function(commit) {
			var newcom = { 
				id: commit.sha, 
				displayId: commit.sha.substr(0, 6), 
				author: { 
					emailAddress: commit.commit.author.email, 
					displayName: commit.commit.author.name
				}, 
				authorTimestamp: moment(commit.commit.committer.date).valueOf(), 
				message: commit.commit.message, 
				parents: []
			}
			_.forEach(commit.parents, function(parent) {
				newcom.parents.push({
					id: parent.sha,
					displayId: parent.sha.substr(0, 6)
				});
			});
			commits.push(newcom);
		});
		d.resolve(commits);
	});

	return d.promise();
}

getSlackWebSocketUrl()

function getSlackWebSocketUrl() {

	// var d = deferred();

	var slackFeed;

	rp({url: 'https://slack.com/api/rtm.start?token='+ myCricket.credentials.slack.token}).then(function(res) {
		var json = JSON.parse(res)
		var wsUrl = json.url;

		// console.log(json.bots);

		var team = {};
		var users = {};
		var channels = {};
		var groups = {};
		var bots = {};

		team = {
			name: json.team.name,
			icon: json.team.icon.image_original
		};

		_.forEach(json.users, function(user) {
			users[user.id] ={
				name: user.name,
				pic: user.profile.image_72
			};
		});

		_.forEach(json.channels, function(channel) {
			if (!channel.is_archived) {
				channels[channel.id] = {
					name: channel.name,
					members: channel.members
				};
			}
		});

		_.forEach(json.groups, function(group) {
			if (!group.is_archived) {
				groups[group.id] = {
					name: group.name,
					members: group.members
				};
			}
		});

		_.forEach(json.bots, function(bot) {
			if (!bot.deleted) {
				bots[bot.id] = {
					name: bot.name,
					pic: bot.icons ? bot.icons.image_72 : ""
				}
			}
		});
		slackFeed = {
			team: team,
			users: users,
			channels: channels,
			groups: groups,
			bots: bots
		}

		// console.log(slackFeed);

		var client = new WebSocketClient();
		client.connect(wsUrl);
		 
		client.on('connectFailed', function(error) {
		    console.log('Connect Error: ' + error.toString());
		});
		 
		client.on('connect', function(connection) {

		    console.log('WebSocket Client Connected');

		    connection.on('error', function(error) {
		        console.log("Connection Error: " + error.toString());
		    });
		    connection.on('close', function() {
		        console.log('echo-protocol Connection Closed');
		    });
		    connection.on('message', function(message) {
				if (message.type == 'utf8') {
					var data = JSON.parse(message.utf8Data);

					// {
					// 	ts: ts,
					// 	channel: '#'+channelName,
					// 	user: '@'+array[0].data.user.name,
					// 	text: text,
					// 	color: getColor(channelName),
					// 	img: "url(../images/defaultUser.jpg)"
					// }

					// { type: 'message',
					//   channel: 'G12BGPYQ6',
					//   user: 'U0YPB6023',
					//   text: 'test',
					//   ts: '1463413731.000010',
					//   team: 'T0YPFL2JV' }

					if (data.type == 'message') {
						var user = '';
						if (slackFeed.users[data.user]) {
							user = slackFeed.users[data.user].name;
						} else if (slackFeed.bots[data.bot_id]) {
							user = slackFeed.bots[data.bot_id].name;
						}

						var channel = '';
						if (slackFeed.channels[data.channel]) {
							channel = slackFeed.channels[data.channel].name;
						} else if (slackFeed.groups[data.channel]) {
							channel = slackFeed.groups[data.channel].name;
						}

						mySocket.emit('slack', {
							user: user,
							channel: channel,
							text: data.text,
							ts: data.ts,
							img: slackFeed.users[data.user] ? slackFeed.users[data.user].pic : ""
						});
					}
					
					// console.log(data);
					// console.log(data.type);
				}
			});
		    
		});
	}, function(err) { 
		console.log(err);
		// d.reject(err);
	});
	// return d.promise();
}







