const historyList = document.querySelector("#history-list");
const historyStatus = document.querySelector("#history-status");

async function renderHistory() {
  try {
    const history = await readHistory();
    if (history.length === 0) {
      historyStatus.textContent = "No saved scans yet. Scan a page to see its findings here.";
    } else {
      for (const item of history) {
        const row = document.createElement("div");
        row.className = "his-div";
        const link = document.createElement("a");
        link.className = "history-obj";
        link.href = `history-detail.html?id=${encodeURIComponent(item.id)}`;
        link.target = "_blank";
        link.rel = "noopener";

        const name = document.createElement("span");
        name.className = "history-name";
        name.textContent = item.name || item.url || "Untitled scan";

        const details = document.createElement("span");
        details.className = "history-date";
        const date = new Date(item.scannedAt);
        details.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();

        const arrow = document.createElement("span");
        arrow.className = "history-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";

        link.append(name, details, arrow);
        row.append(link);
        historyList.append(row);
      }
    }
  } catch (error) {
    historyStatus.textContent = `Could not load scan history: ${error.message}`;
  }
}

renderHistory();
