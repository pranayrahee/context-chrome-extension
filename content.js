if (window.__aiLoggerInitialized) {
  console.log("AI Logger: already initialized");
} else {
  window.__aiLoggerInitialized = true;

  const DEBOUNCE_MS = 1500;
  let timeoutId = null;
  const sentKeys = new Set();

  function getText(node) {
    return (node?.innerText || node?.textContent || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
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

  function getConversationPairs() {
    const userNodes = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
    const assistantNodes = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));

    const prompts = userNodes.map(getText).filter(Boolean);
    const responses = assistantNodes.map(getText).filter(Boolean);

    const pairCount = Math.min(prompts.length, responses.length);
    const pairs = [];

    for (let i = 0; i < pairCount; i++) {
      const prompt = prompts[i];
      const response = responses[i];

      if (!prompt || !response) continue;

      pairs.push({
        prompt,
        response,
        key: prompt + "::" + response
      });
    }

    return pairs;
  }

  function trimSentKeys() {
    if (sentKeys.size <= 500) return;
    const keys = Array.from(sentKeys);
    for (let i = 0; i < 200; i++) {
      sentKeys.delete(keys[i]);
    }
  }

  function sendPair(prompt, response, key) {
    const payload = {
      id: makeId(prompt, response),
      platform: "chatgpt",
      timestamp: new Date().toISOString(),
      pageUrl: location.href,
      prompt,
      response,
      status: "logged"
    };

    chrome.runtime.sendMessage({ type: "LOG_INTERACTION", payload }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("AI Logger: sendMessage error", chrome.runtime.lastError.message);
        sentKeys.delete(key);
        return;
      }

      console.log("AI Logger: logged", payload);
    });
  }

  function scanAndSendAll() {
    try {
      const pairs = getConversationPairs();

      if (!pairs.length) {
        console.log("AI Logger: no complete pairs found");
        return;
      }

      for (const pair of pairs) {
        if (sentKeys.has(pair.key)) continue;
        sentKeys.add(pair.key);
        sendPair(pair.prompt, pair.response, pair.key);
      }

      trimSentKeys();
    } catch (err) {
      console.error("AI Logger: scanAndSendAll failed", err);
    }
  }

  function scheduleScan() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(scanAndSendAll, DEBOUNCE_MS);
  }

  function hookPromptInput() {
    const textarea = document.querySelector("textarea");
    if (!textarea) {
      setTimeout(hookPromptInput, 1000);
      return;
    }

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        setTimeout(scanAndSendAll, 800);
        setTimeout(scanAndSendAll, 2500);
        setTimeout(scanAndSendAll, 5000);
      }
    });

    console.log("AI Logger: textarea hooked");
  }

  function start() {
    console.log("AI Logger: initialized on", location.href);

    if (!document.body) {
      setTimeout(start, 500);
      return;
    }

    hookPromptInput();

    const observer = new MutationObserver(() => {
      scheduleScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    scanAndSendAll();
    setTimeout(scanAndSendAll, 2000);
    setTimeout(scanAndSendAll, 4000);
  }

  start();
}
