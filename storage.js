const TOS_FLAGGER_SETTINGS_KEY = "tosFlaggerSettings";
const TOS_FLAGGER_HISTORY_KEY = "tosFlaggerHistory";

const TOS_FLAGGER_DEFAULTS = Object.freeze({
  threshold: 0.5,
  qwenAnalysis: true,
  saveHistory: true,
});

async function readStoredValue(key, fallback) {
  const extensionStorage = globalThis.chrome?.storage?.local;
  if (extensionStorage) {
    const values = await extensionStorage.get(key);
    return values[key] ?? fallback;
  }

  const stored = localStorage.getItem(key);
  return stored === null ? fallback : JSON.parse(stored);
}

async function writeStoredValue(key, value) {
  const extensionStorage = globalThis.chrome?.storage?.local;
  if (extensionStorage) {
    await extensionStorage.set({ [key]: value });
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

async function readSettings() {
  const saved = await readStoredValue(TOS_FLAGGER_SETTINGS_KEY, {});
  return { ...TOS_FLAGGER_DEFAULTS, ...saved };
}

async function readHistory() {
  return readStoredValue(TOS_FLAGGER_HISTORY_KEY, []);
}

async function writeHistory(history) {
  return writeStoredValue(TOS_FLAGGER_HISTORY_KEY, history);
}
