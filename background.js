"use strict";
// Shortcut for document.querySelector()
function $(sel, el = document) {
  return el.querySelector(sel);
}

// Shortcut for document.querySelectorAll()
function $$(sel, el = document) {
  return el.querySelectorAll(sel);
}

const urls = ["https://medium.com/*", "https://*.medium.com/*"];

function onError(error) {
  console.error(`Error: ${error}`);
}

const domParser = new DOMParser();

function convertToDom(domString) {
  return domParser.parseFromString(domString, "text/html");
}

const ARTICLES_STORE = {};
let settings = {};

browser.runtime.onMessage.addListener(handleMessageFromContent);

function initSettings() {
  // Get the settings
  browser.storage.sync.get(null, function (items) {
    settings = items;
  });
}

browser.storage.onChanged.addListener(function (changes) {
  if (changes.isExtensionActive && changes.isExtensionActive.newValue) {
    settings.isExtensionActive = changes.isExtensionActive.newValue;

    browser.tabs.reload();
  }
});

// Set default settings on install
browser.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    browser.storage.sync.set({ isExtensionActive: true }, function () {
      initSettings();
    });
  }
});

function handleMessageFromContent(msg, sender) {
  if (msg.event === "dom_loaded") {
    browser.tabs
      .sendMessage(sender.tab.id, {
        event: "get_article_model",
        msg: ARTICLES_STORE[sender.tab.id],
      })
      .then(() => delete ARTICLES_STORE[sender.tab.id])
      .catch(onError);
  }
}

function initArticleState(tabId) {
  ARTICLES_STORE[tabId] = { scriptsContent: [], metadata: {} };
}

function unwrapImg(dom, tabId) {
  const img = $("img", dom);

  if (!img) {
    return;
  }

  const imgContainer = document.createElement("div");
  // the 'paddingBottom' trick to avoid content shifting when an image is loaded
  const aspectRatio = `${((img.height / img.width) * 100).toPrecision(4)}`;
  imgContainer.style.cssText = `position: relative; padding-bottom: ${aspectRatio}%; height: 0; margin-bottom: 10px`;

  img.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%`;
  img.setAttribute("loading", "lazy");

  // remove the first div of <figure> that used to contain <img>
  const div = dom.firstChild;
  if (div.nodeName === "DIV") {
    dom.removeChild(div);
  }

  imgContainer.appendChild(img);

  const figCaption = $("figcaption", dom);
  if (figCaption) {
    figCaption.style.textAlign = "center";
    dom.insertBefore(imgContainer, figCaption);
  } else {
    dom.appendChild(imgContainer);
  }
}

let postState = {};
const decoder = new TextDecoder();
const encoder = new TextEncoder();

browser.webRequest.onBeforeRequest.addListener(
  function (details) {
    // extension is disabled. BAU as per Medium Corp
    if (!settings.isExtensionActive) return;

    if (/.+-\w{11,12}\?source=.+$/.test(details.url)) {
      return {
        redirectUrl: details.url.replace(/\?source=.+/, ""),
      };
    }
    // only apply extension on 'path-name-ae4651dc07ba'
    if (!/.+-\w{11,12}$/.test(details.url)) return;
    // allow favicon.ico request
    if (!/.+(?<!\.ico)$/.test(details.url)) return;

    // allow requests for static assets served by medium
    if (/miro.medium.com.+/.test(details.url)) return;

    // allow mediaResource request in worker.js
    if (/media\/.+$/.test(details.url)) return;

    console.log("details:", details);
    // return { cancel: true };
    const filter = browser.webRequest.filterResponseData(details.requestId);

    let domString = "";
    filter.ondata = (event) => {
      domString += decoder.decode(event.data, { stream: true });
    };

    filter.onstop = (event) => {
      initArticleState(details.tabId);
      // parse DOMString into a DOM tree
      let html = convertToDom(domString);

      for (const script of $$("script:not([src]):not([type])", html)) {
        if (script) {
          ARTICLES_STORE[details.tabId].scriptsContent.push(script.textContent);
        }
      }

      const metadata = $('script[type="application/ld+json"]', html);
      const article = $("article", html);

      try {
        ARTICLES_STORE[details.tabId].metadata = JSON.parse(
          metadata.textContent
        );
      } catch (error) {
        console.error("Error parsing post metadata script content", error);
      }

      // get the element of an article's title
      const headline = $("h1", article);
      headline.className = "mu-headline";

      const requestPathname = urlPathname(details.url);

      const metaDataCont =
        headline.nextElementSibling || headline.parentNode.nextElementSibling;

      // create profile container for avatar, author name, post metadata
      const avatar = $("img", metaDataCont);
      avatar.width = 50;
      avatar.height = 50;
      avatar.style.borderRadius = "50%";
      // get bigger avatar image for higher resolution
      avatar.src = avatar.src.replace(/\d+\/\d+/, "120/120");
      avatar.style.marginRight = "9px";

      const authorName = document.createElement("a");
      authorName.textContent = avatar.getAttribute("alt");
      // set href to point to author's medium page
      authorName.href = avatar.parentNode.href.replace(
        /moz-extension:\/\/.+(\/.+)\?source=.+/,
        function (a, b) {
          return b; // the matched group in the bracket
        }
      );

      const postedAtDate = document.createElement("div");
      postedAtDate.textContent = $(
        `[href*="${requestPathname}?source=post_page"]`,
        metaDataCont
      ).textContent.split("·")[0];
      postedAtDate.className = "mu-post-date";

      const profileCont = document.createElement("div");
      profileCont.style.cssText = `display: flex; align-items: center`;
      profileCont.innerHTML = `${avatar.outerHTML}
                              <div>
                                ${authorName.outerHTML}
                                ${postedAtDate.outerHTML}
                              </div>`;

      // remove action buttons- share post, bookmark
      removeElement($("div", metaDataCont));

      // remove all images' placeholder
      const allImages = $$("img:not([srcset])", article);
      for (const img of allImages) {
        removeElement(img);
      }

      // get post's images and unwrap them from the noscript tag
      const allImagesWithSrcSet = $$("figure", article);
      for (const img of allImagesWithSrcSet) {
        unwrapImg(img, details.tabId);
      }

      // remove the <section/> used to contain 'you have red 3 article this month...'
      removeElement(article.firstElementChild);

      // assign a classname to all paragraphs for later query for emded insertion mainly
      $$("section > div > div", article).forEach((div) => {
        div.className = "mu-section";
        const children = Array.from(div.children);
        if (!children.length) return;
        children.forEach((node) => node.classList.add("mu-p"));
      });

      // convert Medium's link card to a simple anchor link with text
      const links = $$(".mu-p > a > div > div > h2", article);
      if (links.length) {
        links.forEach((ele) => {
          const a = ele.parentNode.parentNode.parentNode;
          a.parentNode.classList.add("mu-link");
          a.textContent = ele.textContent;
        });
      }

      // prepend the profile section to the top of an article
      headline.parentNode.insertBefore(profileCont, headline);

      // TODO: inline content.css into <style></style>
      const page = `<html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <meta http-equiv="X-UA-Compatible" content="ie=edge" />
                    </head>
                    <body>${article.outerHTML}</body>
                    </html>`;
      // finally pass it to rendering engine
      filter.write(encoder.encode(page));

      // clean up memory(?)
      html = null;

      filter.disconnect();
    };
  },
  {
    urls,
  },
  ["blocking"]
);

function removeElement(targetedDom) {
  targetedDom && targetedDom.remove();
}

function urlPathname(url) {
  if (url && url.startsWith("http")) {
    try {
      return new URL(url).pathname;
    } catch (e) {
      console.log(`url not valid: ${url} error: ${e}`);
    }
  }
  return url;
}

/**
 * Bypass medium paywall
 *
 */
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
