PocketTags
==========
 
Chrome Extension which tags items in your Pocket base on set of user defined rules.

**How it works?**
Quiet simple. We have here 2 main parts, first is "engine" which calculate tags for posts base on rules, this lives in worker.js, second we have UI to create/edit/delete rules.
Rule is build from words which should be present in title of article, words which should not be present, and the same for original url of article. If we have fit (so assuming that given thing exists, if in title we have at least one of "present" words, and do not have any from "not present" words, and url fits "present url" and don't fit "not present") we will apply our tag.
Rules are kept in localStorage, but its content is synced with cloud (thanks to this all computers where you are using extension have the same set of rules). Sync happens in background.js (in part of code starting from chrome.storage.onChanged.addListener), and uploading/downloading rules to cloud happens in js/rules.js.
UI part uses AngularJS (version which is bower_components - yeah I didn't put bower.json and done it deliberate).
 
You may download Extension from Chrome WebStore:
https://chrome.google.com/webstore/detail/pockettags/pajmfleghibikehgnindbajeiffijlgd
