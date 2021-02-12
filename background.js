"use strict";

const urls = ["https://medium.com/*", "https://*.medium.com/*"];

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

let worker;
if (window.Worker) {
  worker = new Worker(extensionApi.runtime.getURL("worker.js"));

  worker.onmessage = function (msg) {
    console.log("Main Script: Message received", msg.data);
  };

  // let i = 0;
  // setInterval(() => {
  //   worker.postMessage({ num: i++ });
  // }, 500);
} else {
  console.log("Worker's not supported :(");
}

const precedingParagraphIds = [];
function unwrapImg(dom) {
  // get the element's parent node
  const img = dom.querySelector("img");
  // TODO: slot for embed
  if (!img) {
    precedingParagraphIds.push(dom.previousElementSibling.id);
    return;
  }

  const aspectRatio = `${(img.height / img.width) * 100}%`;

  const imgContainer = document.createElement("div");
  // the 'paddingBottom' trick to avoid content shifting when an image is loaded
  imgContainer.style.paddingBottom = aspectRatio;
  imgContainer.style.position = "relative";
  imgContainer.style.height = "0";
  imgContainer.style.marginBottom = "10px";

  img.style.position = "absolute";
  img.style.top = "0";
  img.style.left = "0";
  img.style.width = "100%";
  img.style.height = "100%";
  img.setAttribute("loading", "lazy");

  // remove the first div of <figure> that used to contain <img>
  const div = dom.firstChild;
  if (div.nodeName === "DIV") {
    dom.removeChild(div);
  }

  imgContainer.appendChild(img);

  const figCaption = dom.querySelector("figcaption");
  if (figCaption) {
    figCaption.style.textAlign = "center";
    dom.insertBefore(imgContainer, figCaption);
  } else {
    dom.appendChild(imgContainer);
  }
}

let postState = {};
const domParser = new DOMParser();
const decoder = new TextDecoder();
const encoder = new TextEncoder();

extensionApi.webRequest.onBeforeRequest.addListener(
  function (details) {
    // cancel favicon.ico request
    if (!/.+(?<!\.ico)$/.test(details.url)) {
      return { cancel: true };
    }

    // allow requests for static assets served by medium
    if (/miro.medium.com.+/.test(details.url)) {
      return;
    }

    console.log("details:", details);

    let filter = extensionApi.webRequest.filterResponseData(details.requestId);

    let string = "";
    filter.ondata = (event) => {
      let str = decoder.decode(event.data, { stream: true });
      string += str;
    };

    filter.onstop = (event) => {
      // parse DOMString into a DOM tree
      const html = domParser.parseFromString(string, "text/html");
      let scriptsContent = [];
      for (const script of html.querySelectorAll("script:not([src])")) {
        if (script) {
          scriptsContent.push(script.textContent);
        }
      }

      const article = html.getElementsByTagName("article")[0];

      // create an empty div to contain author info and metadata
      const profile = document.createElement("div");

      // get the element of an article's title
      const headline = article.querySelectorAll("h1")[0];

      // get avatar
      const avatar = (
        headline.nextElementSibling || headline.parentNode.nextElementSibling
      ).querySelector("a img");
      avatar.width = 56;
      avatar.height = 56;
      avatar.style.borderRadius = "50%";
      // get bigger avatar image for higher resolution
      avatar.src = avatar.src.replace(/\d+\/\d+/, "120/120");

      profile.appendChild(avatar);

      const h4 = article.querySelectorAll("h4");
      // get author name
      const authorName = h4[0];
      profile.appendChild(authorName);

      // get post's metadata- timestamp and duration of reading
      const postMetadata = h4[1];
      // remove svg inside metadata(that 'featured' star)
      removeElement(postMetadata.querySelector("svg"));

      profile.appendChild(postMetadata);

      // remove action buttons- share post, bookmark
      removeElement(
        (
          headline.nextElementSibling || headline.parentNode.nextElementSibling
        ).querySelector("div")
      );

      // remove all images' placeholder
      const allImages = article.querySelectorAll("img:not([srcset])");
      for (const img of allImages) {
        removeElement(img);
      }

      // get post's images and unwrap them from the noscript tag
      const allImagesWithSrcSet = article.querySelectorAll("figure");

      for (const img of allImagesWithSrcSet) {
        unwrapImg(img);
      }

      // prepend the profile section to the top of an article
      headline.parentNode.insertBefore(profile, headline);

      if (article) {
        // finally pass it to rendering engine
        filter.write(encoder.encode(article.innerHTML));
      }

      worker.postMessage({ scriptsContent, precedingParagraphIds });

      console.log("finished");
      filter.disconnect();
    };
  },
  {
    urls,
  },
  ["blocking"]
);

function removeElement(targetedDom) {
  targetedDom && targetedDom.parentNode.removeChild(targetedDom);
}

/** Bypass medium paywall */
function getTwitterReferer() {
  return `https://t.co/${Math.random().toString(36).slice(2)}`;
}

function onBeforeSendHeaders(details) {
  if (details.requestHeaders) {
    let newHeaders = removeHeader(details.requestHeaders, "referer");
    newHeaders = addHeader(newHeaders, "Referer", getTwitterReferer());

    return { requestHeaders: newHeaders };
  }
  return { requestHeaders: details.requestHeaders };
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  {
    urls,
  },
  getBeforeSendExtraInfoSpec()
);

function getBeforeSendExtraInfoSpec() {
  const extraInfoSpec = ["blocking", "requestHeaders"];
  if (
    chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty("EXTRA_HEADERS")
  ) {
    extraInfoSpec.push("extraHeaders");
  }
  return extraInfoSpec;
}

function removeHeader(headers, headerToRemove) {
  return headers.filter(({ name }) => name.toLowerCase() != headerToRemove);
}

function addHeader(headers, name, value) {
  headers.push({ name, value });
  return headers;
}
