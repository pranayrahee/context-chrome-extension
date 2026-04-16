console.log("AI Prompt Logger background loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "LOG_INTERACTION") {
    return;
  }

  fetch("http://127.0.0.1:3000/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message.payload)
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Logged to backend:", data);
      sendResponse({ ok: true });
    })
    .catch((error) => {
      console.error("Fetch failed:", error);
      sendResponse({ ok: false, error: error.message });
    });

  // Keep the message channel open for async sendResponse
  return true;
});