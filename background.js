"use strict";

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

// credit: https://stackoverflow.com/a/8747184/73323
function walkDOM(main) {
  var arr = [];
  var loop = function (main) {
    do {
      arr.push(main);
      if (main.hasChildNodes()) {
        loop(main.firstChild);
      }
    } while ((main = main.nextSibling));
  };
  loop(main);
  return arr;
}

function unwrapImg(dom) {
  // get the element's parent node
  const img = dom.querySelector("img");
  const div = dom.firstChild;
  if (div.nodeName === "DIV") {
    dom.removeChild(div);
  }
  dom.insertBefore(img, dom.firstChild);
}

const domParser = new DOMParser();
const decoder = new TextDecoder();
const encoder = new TextEncoder();
// Disable javascript for these sites
extensionApi.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (!/.+(?<!\.ico)$/.test(details.url)) {
      return { cancel: true };
    }
    console.log("details:", details);

    if (/miro.medium.com.+/.test(details.url)) {
      return;
    }
    let filter = extensionApi.webRequest.filterResponseData(details.requestId);
    // filter.onstart = (event) => {
    //   console.log("started");
    // };

    let string = "";
    filter.ondata = (event) => {
      console.log("event:", event);
      let str = decoder.decode(event.data, { stream: true });
      string += str;
    };

    const sanitizedHtml = [];
    filter.onstop = (event) => {
      const html = domParser.parseFromString(string, "text/html");
      const article = html.getElementsByTagName("article")[0];
      const allImages = article.querySelectorAll("img:not([srcset]");
      for (const img of allImages) {
        img.parentNode.removeChild(img);
      }
      const allImagesWithSrcSet = article.querySelectorAll("figure");

      for (const img of allImagesWithSrcSet) {
        unwrapImg(img);
      }
      if (article) {
        filter.write(encoder.encode(article.innerHTML));
      }
      console.log("finished");
      filter.disconnect();
    };
  },
  {
    urls: ["https://medium.com/*", "https://*.medium.com/*"],
  },
  ["blocking"]
);
