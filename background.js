console.log("AI Prompt Logger background loaded");

function generateClientId() {
  return "client_" + Math.random().toString(36).slice(2, 10);
}

function getClientId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["clientId"], (result) => {
      if (result.clientId) {
        resolve(result.clientId);
        return;
      }

      const newId = generateClientId();
      chrome.storage.local.set({ clientId: newId }, () => {
        resolve(newId);
      });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "LOG_INTERACTION") {
    return;
  }

  getClientId().then((clientId) => {
    const payload = {
      ...message.payload,
      clientId
    };

    fetch("https://context-chrome-extension.onrender.com/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Logged to backend:", data, "clientId:", clientId);
        sendResponse({ ok: true, data, clientId });
      })
      .catch((error) => {
        console.error("Fetch failed:", error);
        sendResponse({ ok: false, error: error.message });
      });
  });

  return true;
});
