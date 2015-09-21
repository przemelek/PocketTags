
// build rules....
//storeRules([
//    {url_present: ["lifehack"], tag: "hack"},
//    {present: ["how", "you"], tag: "self improve"},
//    {present: ["can", "you"], tag: "self improve"},
//    {present: ["android"], not_present: ["real"], tag: "android"},
//    {present: ["google"], tag: "google"},
//    {present: ["apple"], tag: "apple"},
//    {present: ["amazon"], tag: "amazon"},
//    {present: ["ocado"], tag: "ocado"},
//    {present: ["facebook"], tag: "facebook"},
//    {present: ["deep","learn"], tag: "deep learning"},
//    {present: ["machine","learning"], tag: "machine learning"},
//    {present: ["java"], tag: "java"}
//]);

// use it to "zero" since parameter, when added new tags, or other things cause that you want to perform all operations for all articles.
var sinceKey = "since2";
if (!localStorage[sinceKey]) {
	localStorage[sinceKey]="0";
}
var redirect_url = window.location.href.replace("background.html","oauth.html");

var oauth = new OAuth({
	'request_url': 'https://getpocket.com/v3/oauth/request',
	'authorize_url': 'https://getpocket.com/auth/authorize',
	'access_url': 'https://getpocket.com/v3/oauth/authorize',
	'redirect_url': redirect_url,
	'consumer_key': consumer_key,
});

// function fetch(url,method,headers,body,callback,async,returnAsXML)
function retrieve(since) {
	var url = "https://getpocket.com/v3/get";
	var bodyObj = {"consumer_key":consumer_key,"access_token":oauth.getAuthToken(),"contentType":"article","sort":"oldest","detailType":"complete"};

	if (since) {
		bodyObj.since=since;
	}
	var body = JSON.stringify(bodyObj);
	var headers = [];
	headers.push({"name":"Content-Type","value":"application/json; charset=UTF8"});
	try {
		var response = fetch(url,"POST",headers,body,null,false,false);
		return response;
	} catch (e) {
		// OK, something went wrong, proceed
		return '{"list":{}}';
	}
}

function getTagsFromRules(rules, article) {
	var currentTags = article.tags;
	var tagsToAdd = [];

	var title = article.given_title + " " + article.resolved_title;
	if (!title) title = "";
	var url = article.given_url;
	if (!url) url = "";

	title = title.toLowerCase();
	url = url.toLowerCase();
	for (var rIdx = 0; rIdx < rules.length; rIdx++) {
		var rule = rules[rIdx];
		if (rule.isInactive) continue;
		var apply = true;
		if (rule.present) {
			for (var wIdx = 0; wIdx < rule.present.length; wIdx++) {
				apply &= (title.indexOf(rule.present[wIdx]) >= 0);
			}
		}
		if (rule.not_present) {
			for (var wIdx = 0; wIdx < rule.not_present.length; wIdx++) {
				apply &= (title.indexOf(rule.not_present[wIdx]) < 0);
			}
		}
		if (rule.url_present) {
			for (var wIdx = 0; wIdx < rule.url_present.length; wIdx++) {
				apply &= (url.indexOf(rule.url_present[wIdx]) >= 0);
			}
		}
		if (rule.url_not_present) {
			for (var wIdx = 0; wIdx < rule.url_not_present.length; wIdx++) {
				apply &= (url.indexOf(rule.url_not_present[wIdx]) < 0);
			}
		}
		if (apply) {
			tagsToAdd.push(rule.tag);
		}
	}
	return tagsToAdd;
}

function modify(rules, articles, tagToRemove) {
	var bodyObj = {"consumer_key":consumer_key,"access_token":oauth.getAuthToken()};
	bodyObj.actions=new Array();
    for (var i=0; i<articles.length; i++) {
		var article = articles[i];

		var itemId = article.item_id;

		var tagsToAdd = getTagsFromRules(rules, article);

		var apiUrl = "https://getpocket.com/v3/send";

		var addTagAction = {"action": "tags_add", "tags": tagsToAdd, "item_id": itemId};
		if (tagToRemove && tagsToAdd.indexOf(tagToRemove) < 0 && article.tags && article.tags[tagToRemove]) {
			removeTagsAction = {"action": "tags_remove", "tags": tagToRemove, "item_id": itemId};
			bodyObj.actions.push(removeTagsAction);
		}
		if (tagsToAdd.length != 0) {
			if (addTagAction) {
				bodyObj.actions.push(addTagAction);
			}
		}
	}
	if (bodyObj.actions.length>0) {
		var body = JSON.stringify(bodyObj);
		var headers = [];
		headers.push({"name":"Content-Type","value":"application/json; charset=UTF8"});
		try {
			var response = fetch(apiUrl,"POST",headers,body,null,false,false);
			// OK, here we should pass value calculated from response....
			return true;
		} catch(e) {
			return false;
		}
	}
	return true;
}

function addTagsToAllNewPosts(tagToRemove) {
	getRules(function(rules) {
		var list = JSON.parse(retrieve(localStorage[sinceKey]));
		var count = 0;
		var wordsCount = 0;
		var articles = [];
		var canUpdateSince = true;
		var needToUpdateSince = false;
		for (var key in list.list) {
			var article = list.list[key];
			if (article.status!="0") {
				console.log("skip "+article.item_id);
				continue;
			}
			count++;
			wordsCount+=article.word_count*1;
			articles.push(article);
			if (articles.length==100) {
				canUpdateSince&=modify(rules,articles,tagToRemove);
				needToUpdateSince = true;
				articles = [];
			}
		}
		if (articles.length!=0) {
			canUpdateSince&=modify(rules,articles,tagToRemove);
			needToUpdateSince = true;
		}
		if (needToUpdateSince && canUpdateSince) {
			// OK, may make problems...
			updateSince();
		}

		console.log("count="+count);
		console.log("wordsCount="+wordsCount);

	});
}

function addTagsLoop() {
    addTagsToAllNewPosts();
    setTimeout(addTagsLoop,5*60*1000);
}

function updateSince() {
	var list2 = JSON.parse(retrieve(Math.floor(new Date().getTime()/1000)));
	if (list2.since) {
		if (list2.since>localStorage[sinceKey]*1) {
			localStorage[sinceKey]=list2.since;
			// publish since
			var sinceObj = {};
			sinceObj[sinceKey]=list2.since;
			chrome.storage.sync.set(sinceObj);
		}
	}
}

function init() {
	if (!oauth.isAuthorized()) {
		oauth.authorize();
		return;
	}
	console.log("authorized");
	console.log(localStorage[sinceKey]);
	setTimeout(addTagsLoop,1*1000);
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
	if (namespace=='sync') {
		var obj = changes[sinceKey];
		if (obj) {
			var sinceVal = obj.newValue;
			if (sinceVal) {
				var localSinceVal = localStorage[sinceKey];
				if (localSinceVal) {
					if (localSinceVal*1<sinceVal*1) {
						localStorage[sinceKey]=sinceVal;
					}
				} else {
					localStorage[sinceKey]=sinceVal;
				}
			}
		}
	}
});

chrome.storage.sync.get(function(items) {
	if (items[sinceKey]) {
		localStorage[sinceKey]=items[sinceKey];
	}
	init();
});


chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
		chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
	    // With a new rule ...
	    chrome.declarativeContent.onPageChanged.addRules([
	      {
	        conditions: [
	          new chrome.declarativeContent.PageStateMatcher({
	            pageUrl: { urlContains: 'getpocket' },
	          })
	        ],
	        // And shows the extension's page action.
	      actions: [ new chrome.declarativeContent.ShowPageAction() ]
	      }
	    ]);
	  });
});


chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
		console.log("request cmd="+request.cmd);
		console.log(request);
        if ("added"==request.cmd) {
            localStorage[sinceKey]="0";
            setTimeout(addTagsToAllNewPosts,500);
            sendResponse({resp:"OK"});
        } else if ("modified"==request.cmd) {
			localStorage[sinceKey]="0";
			setTimeout(function() {
				addTagsToAllNewPosts(request.tag);
			},500);
			sendResponse({resp:"OK"});
		} else if ("getRules"==request.cmd) {
			getRules(function(rules) {
				sendResponse({
					"rules":rules
				});
			});
		} else if ("storeRules"==request.cmd) {
			storeRules(request.rules);
		};
    }
)