const domParser = new DOMParser();

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

worker.onmessage = async ({ data }) => {
  console.log("data:", data);

  // if (data.event === "insert_media") {
  //   for (const { iFrameSrc, mediaRefId } of data.msg) {
  //     if (!iFrameSrc) {
  //       await fetch(`https://${window.location.hostname}/media/${mediaRefId}`)
  //         .then((res) => res.text())
  //         .then((domString) => {
  //           const document = domParser.parseFromString(domString, "text/html");
  //           const script = document.querySelector("script[src]");
  //           console.log("script:", script);
  //           // sendMessageToTabs(tabs, { precedingParagraphId, src: script.src });
  //         });
  //     }
  //   }
  // }
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

  extensionApi.runtime.onMessage.addListener(({ event, msg }) => {
    if (event === "get_article_model") {
      worker.postMessage({ msg, hostname: window.location.hostname });
    }
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
