chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let activeTab = tabs[0];
    chrome.scripting.executeScript({
      target: {tabId: activeTab.id},
      files: ['content.js']
    }, function() {
      chrome.tabs.sendMessage(activeTab.id, {"message": "hello"}, function(response) {
        console.log(response);
      });
    });
  });