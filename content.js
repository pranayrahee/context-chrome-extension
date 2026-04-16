let timeoutId = null;
let lastSentKey = "";

function getText(node) {
  return (node?.innerText || node?.textContent || "").trim();
}

function makeId(prompt, response) {
  const raw = prompt + "||" + response;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return "chatgpt_" + Math.abs(hash);
}

function extractChatGPT() {
  const userNodes = document.querySelectorAll('[data-message-author-role="user"]');
  const assistantNodes = document.querySelectorAll('[data-message-author-role="assistant"]');

  if (!userNodes.length || !assistantNodes.length) {
    console.log("AI Logger: no ChatGPT nodes yet");
    return { prompt: "", response: "" };
  }

  const prompt = getText(userNodes[userNodes.length - 1]);
  const response = getText(assistantNodes[assistantNodes.length - 1]);

  return { prompt, response };
}

function extractAndSend() {
  try {
    const { prompt, response } = extractChatGPT();

    if (!prompt || !response) {
      console.log("AI Logger: prompt or response empty");
      return;
    }

    const key = prompt + "::" + response;
    if (key === lastSentKey) {
      return;
    }
    lastSentKey = key;

    const payload = {
      id: makeId(prompt, response),
      platform: "chatgpt",
      timestamp: new Date().toISOString(),
      pageUrl: location.href,
      prompt,
      response,
      status: "logged"
    };

    console.log("AI Logger: sending payload", payload);

    chrome.runtime.sendMessage({ type: "LOG_INTERACTION", payload }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("AI Logger: sendMessage error", chrome.runtime.lastError.message);
        return;
      }
      console.log("AI Logger: background replied", result);
    });
  } catch (err) {
    console.error("AI Logger: extractAndSend failed", err);
  }
}

function start() {
  console.log("AI Logger: content script loaded on", location.href);

  if (!document.body) {
    setTimeout(start, 500);
    return;
  }

  const observer = new MutationObserver(() => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(extractAndSend, 2000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  extractAndSend();
}

start();