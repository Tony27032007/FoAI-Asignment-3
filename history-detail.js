const detailTitle = document.querySelector("#detail-title");
const detailMeta = document.querySelector("#detail-meta");
const detailStatus = document.querySelector("#detail-status");
const findings = document.querySelector("#findings");

function addTextElement(parent, tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

async function renderScanDetails() {
  try {
    const params = new URLSearchParams(window.location.search);
    const history = await readHistory();
    const item = params.get("latest") === "1"
      ? JSON.parse(sessionStorage.getItem("tosFlaggerLatestScan") ?? "null")
      : history.find((entry) => entry.id === params.get("id"));
    if (!item) {
      throw new Error("That scan was not found. Check whether history saving is enabled in Settings.");
    }

    const { result } = item;
    detailTitle.textContent = item.name || "Scan details";
    detailMeta.textContent = `${item.url} · ${new Date(item.scannedAt).toLocaleString()}`;
    if (result.truncated) {
      addTextElement(findings, "p", "warning-message", "The page text exceeded the scan limit; only the first part was analyzed.");
    }
    if (result.summary) {
      addTextElement(findings, "p", "analysis-summary", result.summary);
    }
    if (result.findings.length === 0) {
      addTextElement(findings, "p", "empty-state", "No clauses exceeded the selected confidence threshold.");
    }

    for (const finding of result.findings) {
      const card = document.createElement("article");
      card.className = "finding-card";
      const tags = finding.tags.map((tag) => `${tag.name} (${Math.round(tag.confidence * 100)}%)`).join(", ");
      addTextElement(card, "h2", "finding-heading", `Section ${finding.index + 1}${finding.risk_level ? ` · ${finding.risk_level} risk` : ""}`);
      addTextElement(card, "p", "finding-tags", tags || "No predicted tags");
      addTextElement(card, "blockquote", "finding-text", finding.text);
      if (finding.qwen_suggested_tags?.length) {
        addTextElement(card, "p", "finding-tags", `Qwen review tags: ${finding.qwen_suggested_tags.join(", ")}`);
      }
      if (finding.explanation) {
        addTextElement(card, "p", "finding-explanation", finding.explanation);
      }
      findings.append(card);
    }
  } catch (error) {
    if (!detailStatus.textContent) {
      detailStatus.textContent = error.message;
    }
  }
}

renderScanDetails();
