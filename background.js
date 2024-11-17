chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkMessage") {
      chrome.storage.sync.get('rules', function(data) {
        const rules = data.rules || [];
        const matchedRule = rules.find(rule => request.message.toLowerCase().includes(rule.trigger.toLowerCase()));
        if (matchedRule) {
          sendResponse({ response: matchedRule.response });
        } else {
          sendResponse({ response: null });
        }
      });
      return true; // Indica que la respuesta será asíncrona
    }
  });