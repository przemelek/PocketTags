var consumer_key = "<put your key here - you may obtain it at https://getpocket.com/developer/apps/>";

function fetch(url,method,headers,body,callback,async,returnAsXML) {

    var xhr = new XMLHttpRequest();
    if (async) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    callback(xhr.responseText);
                } else {
                    callback(null);
                }
            }
        }
    }
    xhr.open(method, url, async);
    if (headers!==null) {
        for (var i=0; i<headers.length; i++) {
            xhr.setRequestHeader(headers[i].name,headers[i].value);
        }
    }
    if (body!==null) {
        xhr.send(body);
    } else {
        xhr.send();
    }
    if (!async) {
        if (returnAsXML) {
            //alert(xhr.responseText);
            return xhr.responseXML;
        } else {
            return xhr.responseText;
        }
    }
};


// function fetch(url,method,headers,body,callback,async,returnAsXML)
function retrieve(since, auth) {
    var url = "https://getpocket.com/v3/get";
    var bodyObj = {"consumer_key":consumer_key,"access_token":auth,"contentType":"article","sort":"oldest","detailType":"complete"};

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

function modify(rules, articles, tagToRemove, auth) {
    var bodyObj = {"consumer_key":consumer_key,"access_token":auth};
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

function addTagsToAllNewPosts(tagToRemove, auth, rules, since) {
    var list = JSON.parse(retrieve(since,auth));
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
        if (articles.length==1500) {
            canUpdateSince&=modify(rules,articles,tagToRemove,auth);
            needToUpdateSince = true;
            articles = [];
        }
    }
    if (articles.length!=0) {
        canUpdateSince&=modify(rules,articles,tagToRemove,auth);
        needToUpdateSince = true;
    }

    var response = {};

    if (needToUpdateSince && canUpdateSince) {
        // OK, may make problems...
        var response = JSON.parse(retrieve(Math.floor(new Date().getTime()/1000),auth));
    }

    console.log("count="+count);
    console.log("wordsCount="+wordsCount);
    return response;
}



onmessage = function(msg) {
    console.log("[Worker] got message "+msg.data);
    console.log(msg);
    var cmd = msg.data;
    var response = addTagsToAllNewPosts(cmd.tagToRemove,cmd.auth, cmd.rules, cmd.since);
    postMessage(response)
}