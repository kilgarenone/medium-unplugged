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

window.addEventListener("message", (message) => {
  console.log("message:", message);
  // if (message.source !== childWindow) {
  //   return; // Skip message in this event listener
  // }

  // ...
});
worker.onmessage = async ({ data }) => {
  console.log("data:", data);

  const paragraphs = Array.from(
    document.getElementsByClassName("mu-paragraph")
  );

  data.forEach(({ iFrameSrc, order }) => {
    const iframe = document.createElement("iframe");
    iframe.src = iFrameSrc;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.setAttribute("frameborder", 0);
    paragraphs[order].appendChild(iframe);
    iframe.addEventListener("load", function () {});
  });
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

function initOnDomReady() {
  extensionApi.runtime.sendMessage({
    event: "dom_loaded",
  });

  extensionApi.runtime.onMessage.addListener(({ event, msg }) => {
    if (event === "get_article_model") {
      worker.postMessage({ msg, hostname: window.location.hostname });
    }
  });
}
