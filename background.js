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

var myWorker = new Worker("worker.js");

// use it to "zero" since parameter, when added new tags, or other things cause that you want to perform all operations for all articles.
var sinceKey = "since2";
if (!localStorage[sinceKey]) {
    localStorage[sinceKey] = "0";
}
var redirect_url = window.location.href.replace("background.html", "oauth.html");

var oauth = new OAuth({
    'request_url': 'https://getpocket.com/v3/oauth/request',
    'authorize_url': 'https://getpocket.com/auth/authorize',
    'access_url': 'https://getpocket.com/v3/oauth/authorize',
    'redirect_url': redirect_url,
    'consumer_key': consumer_key,
});

function addTagsLoop() {
    getRules(function (rules) {
        myWorker.postMessage({
            "auth": oauth.getAuthToken(),
            "rules": rules,
            "since": localStorage[sinceKey]
        });
    });
    setTimeout(addTagsLoop, 5 * 60 * 1000);
}

function updateSince(response) {
    if (response.since) {
        if (response.since > localStorage[sinceKey] * 1) {
            localStorage[sinceKey] = response.since;
            // publish since
            var sinceObj = {};
            sinceObj[sinceKey] = response.since;
            chrome.storage.sync.set(sinceObj);
        }
    }
}

myWorker.onmessage = function (msg) {
    updateSince(msg.data);
}


function init() {
    if (!oauth.isAuthorized()) {
        oauth.authorize();
        return;
    }
    console.log("authorized");
    console.log(localStorage[sinceKey]);
    setTimeout(addTagsLoop, 1 * 1000);
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace == 'sync') {
        var obj = changes[sinceKey];
        if (obj) {
            var sinceVal = obj.newValue;
            if (sinceVal) {
                var localSinceVal = localStorage[sinceKey];
                if (localSinceVal) {
                    if (localSinceVal * 1 < sinceVal * 1) {
                        localStorage[sinceKey] = sinceVal;
                    }
                } else {
                    localStorage[sinceKey] = sinceVal;
                }
            }
        }
    }
});

chrome.storage.sync.get(function (items) {
    if (items[sinceKey]) {
        localStorage[sinceKey] = items[sinceKey];
    }
    init();
});


chrome.runtime.onInstalled.addListener(function () {
    // Replace all rules ...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        // With a new rule ...
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {urlContains: 'getpocket'},
                    })
                ],
                // And shows the extension's page action.
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });
});


chrome.extension.onRequest.addListener(
    function (request, sender, sendResponse) {
        console.log("request cmd=" + request.cmd);
        console.log(request);
        if ("added" == request.cmd) {
            localStorage[sinceKey] = "0";
            //setTimeout(addTagsToAllNewPosts,500);
            getRules(function (rules) {
                myWorker.postMessage(
                    {
                        "auth": oauth.getAuthToken(),
                        "rules": rules,
                        "since": localStorage[sinceKey]
                    }
                );
            });
            sendResponse({resp: "OK"});
        } else if ("modified" == request.cmd) {
            localStorage[sinceKey] = "0";
            //setTimeout(function() {
            //	addTagsToAllNewPosts(request.tag);
            //},500);
            getRules(function (rules) {
                myWorker.postMessage(
                    {
                        "auth": oauth.getAuthToken(),
                        "rules": rules,
                        "since": localStorage[sinceKey],
                        "tagToRemove": request.tag
                    }
                );
            });

            sendResponse({resp: "OK"});
        } else if ("getRules" == request.cmd) {
            getRules(function (rules) {
                sendResponse({
                    "rules": rules
                });
            });
        } else if ("storeRules" == request.cmd) {
            storeRules(request.rules);
        }
        ;
    }
)