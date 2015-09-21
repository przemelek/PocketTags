var app = angular.module("TagsUI", ["ui.bootstrap"]);

app.factory("rulesService",["$q",function($q) {
  return {
    store:function(rules) {
      //storeRules(rules);
      chrome.extension.sendRequest({"cmd":"storeRules","rules":rules});
    },
    get:function() {
      var deferred = $q.defer();
      chrome.extension.sendRequest({"cmd":"getRules"},function(response) {
        deferred.resolve(response.rules);
      });
      return deferred.promise;
    }
  }
}])

app.controller("TagsUIController", ["$scope", "$log", "rulesService", function($scope, $log, rulesService) {
  $scope.mode="list";
  rulesService.get().then(function(rules) {
    var rulesToDisplay = [];
    for (var i=0; i<rules.length; i++) {
      var ruleOrig = rules[i];
      var rule = {tag:ruleOrig.tag};
      if (ruleOrig.present) rule["present"]=ruleOrig.present;
      if (ruleOrig.not_present) rule["not_present"]=ruleOrig.not_present;
      if (ruleOrig.url_present) rule["url_present"]=ruleOrig.url_present;
      rule.type=rule.url_present?"Link":"Title";
      var present = rule.url_present?rule.url_present:rule.present;
      rule.presentString = present?present.toString().replace("[","").replace("]",""):"";
      var not_present = rule.url_present?"":rule.not_present;
      rule.not_presentString = not_present?not_present.toString().replace("[","").replace("]",""):"";
      rulesToDisplay.push(rule);
    }
    $scope.rules = rulesToDisplay;

    $scope.types = [{label:"Link"},{label:"Title"}];
  });

  $scope.modify=function(idx) {
    //var rules = getRules();
    rulesService.get().then(function(rules) {
      var rule = rules[idx];
      $scope.newRule = {"tag":rule.tag};
      $scope.newRule["type"]={"label":rule.url_present?"Link":"Title"};
      var present = rule.url_present?rule.url_present:rule.present;
      $scope.newRule["presentString"]=present?present.toString().replace("[","").replace("]",""):"";
      $scope.newRule["not_presentString"]=rule.not_present?rule.not_present.toString().replace("[","").replace("]",""):"";
      $scope.rules = rules;
      $scope.ruleIdx = idx;
      $scope.mode = "modify";
    });
  };

  $scope.saveExisting=function() {
    var newRule = getRule($scope.newRule);
    var tag = newRule.tag;
    var rules = $scope.rules;
    var idx = $scope.ruleIdx;
    rules[idx]=newRule;
    rulesService.store(rules);
    chrome.extension.sendRequest({"cmd":"modified","tag":tag},function(resp) { $scope.mode="list"});
  }

  $scope.add=function() {
    $scope.newRule = { };
    $scope.mode="add";
  }

  function getRule(newRule) {
    var rule = {"tag": newRule.tag};
    if (newRule.presentString && newRule.presentString.length > 0) {
      if (newRule.type.label == "Title") {
        rule.present = newRule.presentString.trim().split(",");
        if (newRule.not_presentString && newRule.not_presentString.length > 0) {
          rule.not_present = newRule.not_presentString.trim().split(",");
        }
      } else {
        rule.url_present = newRule.presentString.trim().split(",");
      }
    }
    return rule;
  }

  $scope.save=function() {
    var newRule = $scope.newRule;
    var rule = getRule(newRule);
    //var rules = rulesService.get();
    rulesService.get().then(function(rules) {
      rules.push(rule);
      rulesService.store(rules);
      chrome.extension.sendRequest({"cmd":"added"},function(resp) { $scope.mode="list"});
    });
  }

  $scope.deleteRule=function() {
    var removedRuleIdx = $scope.ruleIdx;
    //var rules = rulesService.get();
    rulesService.get().then(function(rules) {
      var tag = rules[removedRuleIdx].tag;
      var newRules = [];
      for (var i=0; i<rules.length; i++) {
        if (i!=removedRuleIdx) {
          newRules.push(rules[i]);
        }
      }
      rulesService.store(newRules);
      chrome.extension.sendRequest({"cmd":"modified","tag":tag},function(resp) { $scope.mode="list"});
    });
  }

}]);

console.log(app);
