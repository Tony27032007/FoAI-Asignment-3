const TOS_FLAGGER_SETTINGS_KEY = "tosFlaggerSettings";
const TOS_FLAGGER_HISTORY_KEY = "tosFlaggerHistory";
const TOS_FLAGGER_LATEST_SCAN_KEY = "tosFlaggerLatestScan";

const TOS_FLAGGER_DEFAULTS = Object.freeze({
  threshold: 0.5,
  qwenAnalysis: true,
  saveHistory: true,
});

async function readStoredValue(key, fallback) {
  const safariStorage = globalThis.browser?.storage?.local;
  if (safariStorage) {
    const values = await safariStorage.get(key);
    return values[key] ?? fallback;
  }

  const chromeStorage = globalThis.chrome?.storage?.local;
  if (chromeStorage) {
    const values = await new Promise((resolve, reject) => {
      chromeStorage.get(key, (result) => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(result);
      });
    });
    return values[key] ?? fallback;
  }

  const stored = localStorage.getItem(key);
  return stored === null ? fallback : JSON.parse(stored);
}

async function writeStoredValue(key, value) {
  const safariStorage = globalThis.browser?.storage?.local;
  if (safariStorage) {
    await safariStorage.set({ [key]: value });
    return;
  }

  const chromeStorage = globalThis.chrome?.storage?.local;
  if (chromeStorage) {
    await new Promise((resolve, reject) => {
      chromeStorage.set({ [key]: value }, () => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

async function removeStoredValue(key) {
  const safariStorage = globalThis.browser?.storage?.local;
  if (safariStorage) {
    await safariStorage.remove(key);
    return;
  }

  const chromeStorage = globalThis.chrome?.storage?.local;
  if (chromeStorage) {
    await new Promise((resolve, reject) => {
      chromeStorage.remove(key, () => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
    return;
  }

  localStorage.removeItem(key);
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
