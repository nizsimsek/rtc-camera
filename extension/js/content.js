const injectScript = async () => {
  return fetch(chrome.runtime.getURL('js/injected.js'))
    .then((response) => response.text())
    .then((scriptText) => {
      const script = document.createElement('script');
      script.textContent = scriptText.replace(
        `const runtimeId = null;`,
        `const runtimeId = '${chrome.runtime.id}';`
      );
      script.onload = () => document.head.removeChild(this);
      (document.head || document.documentElement).appendChild(script);
    });
};

injectScript();
