

function storeRules(rules) {
    //localStorage["rules"]=JSON.stringify(rules);
    chrome.storage.sync.set({"rules":rules});
}

function _getRules() {
    var rulesStr = localStorage["rules"];

    if (!rulesStr) rulesStr="[]";
    return JSON.parse(rulesStr);
}

function getRules(callback) {
    chrome.storage.sync.get("rules", function (rules) {
        if (!rules.rules) {
            callback(_getRules());
        } else {
            callback(rules.rules);
        }
    });
}


