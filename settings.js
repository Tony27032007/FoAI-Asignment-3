const settingsForm = document.querySelector("#settings-form");
const thresholdInput = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#threshold-value");
const qwenInput = document.querySelector("#qwen-analysis");
const saveHistoryInput = document.querySelector("#save-history");
const settingsStatus = document.querySelector("#settings-status");

thresholdInput.addEventListener("input", () => {
  thresholdValue.value = Number(thresholdInput.value).toFixed(2);
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settingsStatus.textContent = "";
  try {
    await writeStoredValue(TOS_FLAGGER_SETTINGS_KEY, {
      threshold: Number(thresholdInput.value),
      qwenAnalysis: qwenInput.checked,
      saveHistory: saveHistoryInput.checked,
    });
    settingsStatus.textContent = "Settings saved on this device.";
  } catch (error) {
    settingsStatus.textContent = `Could not save settings: ${error.message}`;
  }
});

async function loadSettings() {
  try {
    const settings = await readSettings();
    thresholdInput.value = String(settings.threshold);
    thresholdValue.value = Number(settings.threshold).toFixed(2);
    qwenInput.checked = settings.qwenAnalysis;
    saveHistoryInput.checked = settings.saveHistory;
  } catch (error) {
    settingsStatus.textContent = `Could not load settings: ${error.message}`;
  }
}

loadSettings();
