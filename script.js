const scanButton = document.querySelector("#scan-now");
const menu = document.querySelector(".menu");
const scanProgress = document.querySelector("#scan-progress");
const scanProgressLabel = document.querySelector("#scan-progress-label");

function createScanId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

scanButton?.addEventListener("click", async () => {
  scanButton.disabled = true;
  scanButton.textContent = "Scanning...";
  menu?.classList.add("is-scanning");
  menu?.setAttribute("aria-busy", "true");
  scanProgress?.removeAttribute("hidden");
  if (scanProgressLabel) {
    scanProgressLabel.textContent = "Reading page text...";
  }

  try {
    const tab = await queryActiveTab();
    if (!tab?.id) {
      throw new Error("Could not find the active tab to scan.");
    }

    const page = await readActiveTab(tab.id);
    if (!page?.text.trim()) {
      throw new Error("No readable page text was found.");
    }

    if (scanProgressLabel) {
      scanProgressLabel.textContent = "Analyzing terms with Legal-BERT and Qwen...";
    }
    const settings = await readSettings();
    let response;
    const requestController = new AbortController();
    const requestTimeout = setTimeout(() => requestController.abort(), 300000);
    try {
      response = await fetch("http://127.0.0.1:8080/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title,
          url: page.url,
          text: page.text.slice(0, 250000),
          threshold: settings.threshold,
          qwen_analysis: settings.qwenAnalysis,
        }),
        signal: requestController.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The AI analysis timed out; try scanning a shorter page or disable Qwen explanations in Settings.");
      }
      throw new Error(`Could not reach the AI service at 127.0.0.1:8080. Start the Docker stack and try again: ${error.message}`);
    } finally {
      clearTimeout(requestTimeout);
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail ?? `AI service returned HTTP ${response.status}.`);
    }

    const historyItem = {
      id: createScanId(),
      name: page.title?.trim() || new URL(page.url).hostname,
      url: page.url,
      scannedAt: new Date().toISOString(),
      result,
    };

    if (settings.saveHistory) {
      const history = await readHistory();
      await writeHistory([historyItem, ...history].slice(0, 100));
      await openExtensionPage(`history-detail.html?id=${encodeURIComponent(historyItem.id)}`);
    } else {
      await writeStoredValue(TOS_FLAGGER_LATEST_SCAN_KEY, historyItem);
      await openExtensionPage(`history-detail.html?id=${encodeURIComponent(historyItem.id)}&latest=1`);
    }
  } catch (error) {
    window.alert(error.message);
  } finally {
    scanButton.disabled = false;
    scanButton.textContent = "Scan Now";
    menu?.classList.remove("is-scanning");
    menu?.removeAttribute("aria-busy");
    scanProgress?.setAttribute("hidden", "");
  }
});
