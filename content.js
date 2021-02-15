"use strict";

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

// https://docs.embed.ly/v1.0/docs/native
window.addEventListener("message", function (e) {
  if (data.context !== "iframe.resize") return false;

  let data;
  try {
    data = JSON.parse(e.data);
  } catch (e) {
    return false;
  }

  const iframe = document.querySelector('iframe[src="' + data.src + '"]');

  if (!iframe || !data.height) return false;

  iframe.height = data.height;

  // Update the responsive div.
  iframe.parentNode.style.paddingBottom =
    ((data.height / iframe.offsetWidth) * 100).toPrecision(4) + "%";
});

const config = {
  root: null, // avoiding 'root' or setting it to 'null' sets it to default value: viewport
  rootMargin: "0px", // no margin around our capturing frame(viewport in this case)
  threshold: 0.5, // when half of a target has intersected
};
const observer = new IntersectionObserver(function (entries, self) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.dataset.isLeaving = true;
      // TODO: add some kinda spinner while loading
      entry.target.src = entry.target.getAttribute("data-src");
    } else if (entry.target.dataset.isLeaving) {
      self.unobserve(entry.target);
    }
  });
}, config);

worker.onmessage = async ({ data }) => {
  console.log("data:", data);

  const paragraphs = Array.from(document.getElementsByClassName("mu-p"));

  data.forEach(({ iFrameSrc, order, height, width }) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-src", iFrameSrc);
    iframe.width = width;
    iframe.height = height;
    iframe.style.position = "absolute";
    iframe.style.width = "100%";

    iframe.style.height = "100%";
    // iframe.style.minHeight = "100px";
    iframe.style.top = 0;
    iframe.style.left = 0;

    paragraphs[order].style.height = 0;
    paragraphs[order].style.position = "relative";
    paragraphs[order].style.overflow = "hidden";
    paragraphs[order].style.paddingBottom = `${(
      (height / width) *
      100
    ).toPrecision(4)}%`;
    iframe.setAttribute("frameborder", 0);

    observer.observe(iframe);

    paragraphs[order].appendChild(iframe);
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
