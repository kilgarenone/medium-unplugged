const extensionApi =
  typeof browser === "object" &&
  typeof browser.runtime === "object" &&
  typeof browser.runtime.getManifest === "function"
    ? browser
    : typeof chrome === "object" &&
      typeof chrome.runtime === "object" &&
      typeof chrome.runtime.getManifest === "function"
    ? chrome
    : console.log(
        'Cannot find extensionApi under namespace "browser" or "chrome"'
      );

const worker = new Worker(extensionApi.runtime.getURL("worker.js"));
worker.onmessage = (e) => {
  window.console.log(e);
};

window.addEventListener("DOMContentLoaded", initOnDomReady, false);

// extensionApi.runtime.sendMessage({
//   event: "dom_loaded",
//   host: window.location.hostname,
// });

function initOnDomReady() {
  // console.log("tab:");
  // extensionApi.tabs
  //   .getCurrent()
  //   .then((tab) => console.log(tab))
  //   .catch((err) => console.log(err));

  // console.log("tab:", tab);

  extensionApi.runtime.sendMessage({
    event: "dom_loaded",
    // tabId: tab[0].id,
  });

  extensionApi.runtime.onMessage.addListener((payload) => {
    console.log("payload:", payload);
  });
  // extensionApi.runtime.onMessage.addListener((payload) => {
  //   console.log("Message from the background script:");
  //   if (payload.event === "insert_media") {
  //     console.log(payload.msg);
  //     const { precedingParagraphId, src } = payload.msg;

  //     const script = document.createElement("iframe");
  //     script.src = src;
  //     const precedingParagraphEle = document.getElementById(
  //       precedingParagraphId
  //     );
  //     if (precedingParagraphEle) {
  //       precedingParagraphEle.parentNode.insertBefore(
  //         script,
  //         precedingParagraphEle.nextSibling
  //       );
  //     }
  //   }
  // });
}
