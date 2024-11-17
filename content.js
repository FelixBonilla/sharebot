// Ejemplo para un campo de texto genérico
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
      chrome.runtime.sendMessage({ action: "checkMessage", message: e.target.value }, function(response) {
        if (response.response) {
          e.target.value = response.response;
        }
      });
    }
  });