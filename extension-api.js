function getExtensionApi() {
  return globalThis.browser ?? globalThis.chrome ?? null;
}

function invokeChromeApi(api, method, args) {
  return new Promise((resolve, reject) => {
    api[method](...args, (result) => {
      const error = globalThis.chrome?.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

async function queryActiveTab() {
  if (globalThis.browser?.tabs?.query) {
    const [tab] = await globalThis.browser.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  if (globalThis.chrome?.tabs?.query) {
    const tabs = await invokeChromeApi(globalThis.chrome.tabs, "query", [
      { active: true, currentWindow: true },
    ]);
    return tabs[0];
  }
  throw new Error("Open T&C Flagger from its browser extension button to scan the active tab.");
}

async function readActiveTab(tabId) {
  const api = getExtensionApi();
  if (!api?.scripting?.executeScript) {
    throw new Error("This browser does not provide the scripting API required to scan tabs.");
  }
  const options = {
    target: { tabId },
    func: () => ({
      title: document.title,
      url: location.href,
      text: (document.querySelector("main, article, [role='main']") ?? document.body)?.innerText ?? "",
    }),
  };
  if (globalThis.browser?.scripting?.executeScript) {
    const [page] = await globalThis.browser.scripting.executeScript(options);
    return page?.result;
  }
  const pages = await invokeChromeApi(globalThis.chrome.scripting, "executeScript", [options]);
  return pages[0]?.result;
}

async function openExtensionPage(path) {
  const api = getExtensionApi();
  if (!api?.tabs?.create || !api?.runtime?.getURL) {
    window.location.href = path;
    return;
  }

  const url = api.runtime.getURL(path);
  if (globalThis.browser?.tabs?.create) {
    await globalThis.browser.tabs.create({ url });
    window.close();
    return;
  }
  await invokeChromeApi(globalThis.chrome.tabs, "create", [{ url }]);
  window.close();
}
