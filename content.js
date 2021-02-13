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

window.addEventListener("DOMContentLoaded", initOnDomReady, false);

function initOnDomReady() {
  browser.runtime.sendMessage({ event: "dom_loaded" });
  browser.runtime.onMessage.addListener((payload) => {
    console.log("Message from the background script:");
    console.log(payload);
    if (payload.event === "insert_media") {
      for (const { precedingParagraphId, mediaRefId } of payload.msg) {
        const iFrame = document.createElement("iframe");
        iFrame.src = `https://yitaek.medium.com/media/${mediaRefId}`;
        iFrame.setAttribute("frameborder", "0");
        iFrame.style.width = "100%";
        iFrame.addEventListener("load", function () {
          // console.log(parent);
          // iFrame.width = iFrame.contentWindow.document.body.scrollWidth;
          // iFrame.height = iFrame.contentWindow.document.body.scrollHeight;
          // iFrame.style.height = "100%";
        });
        const precedingParagraphEle = document.getElementById(
          precedingParagraphId
        );
        if (precedingParagraphEle) {
          precedingParagraphEle.parentNode.insertBefore(
            iFrame,
            precedingParagraphEle.nextSibling
          );
        }
      }
    }
  });
}

window._resizeIframe = function (obj) {
  console.log("obj:", obj);
};
