const scanButton = document.querySelector("#scan-now");

scanButton?.addEventListener("click", async () => {
  scanButton.disabled = true;
  scanButton.textContent = "Scanning...";

  try {
    if (!globalThis.chrome?.tabs || !globalThis.chrome?.scripting) {
      throw new Error("Open T&C Flagger from its Chrome extension button to scan the current page.");
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error("Could not find the active tab to scan.");
    }

    const [page] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        url: location.href,
        text: (document.querySelector("main, article, [role='main']") ?? document.body)?.innerText ?? "",
      }),
    });
    if (!page?.result?.text.trim()) {
      throw new Error("No readable page text was found.");
    }

    const settings = await readSettings();
    let response;
    try {
      response = await fetch("http://127.0.0.1:8080/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.result.title,
          url: page.result.url,
          text: page.result.text.slice(0, 250000),
          threshold: settings.threshold,
          qwen_analysis: settings.qwenAnalysis,
        }),
        signal: AbortSignal.timeout(300000),
      });
    } catch (error) {
      throw new Error(`Could not reach the AI service at 127.0.0.1:8080. Start the Docker stack and try again: ${error.message}`);
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail ?? `AI service returned HTTP ${response.status}.`);
    }

    const historyItem = {
      id: crypto.randomUUID(),
      name: page.result.title?.trim() || new URL(page.result.url).hostname,
      url: page.result.url,
      scannedAt: new Date().toISOString(),
      result,
    };

    if (settings.saveHistory) {
      const history = await readHistory();
      await writeHistory([historyItem, ...history].slice(0, 100));
      window.location.href = `history-detail.html?id=${encodeURIComponent(historyItem.id)}`;
    } else {
      sessionStorage.setItem("tosFlaggerLatestScan", JSON.stringify(historyItem));
      window.location.href = `history-detail.html?id=${encodeURIComponent(historyItem.id)}&latest=1`;
    }
  } catch (error) {
    window.alert(error.message);
  } finally {
    scanButton.disabled = false;
    scanButton.textContent = "Scan Now";
  }
});
