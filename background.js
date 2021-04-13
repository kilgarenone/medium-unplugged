"use strict";

const domParser = new DOMParser();
const ARTICLES_STORE = {};
let settings = {};
let postState = {};
const decoder = new TextDecoder();
const encoder = new TextEncoder();

// Shortcut for document.querySelector()
function $(sel, el = document) {
  return el.querySelector(sel);
}

// Shortcut for document.querySelectorAll()
function $$(sel, el = document) {
  return el.querySelectorAll(sel);
}

function onError(error) {
  console.error(`Error: ${error}`);
}

function removeElement(targetedDom) {
  targetedDom && targetedDom.remove();
}

function initSettings() {
  // Get the settings
  browser.storage.sync.get(null, function (items) {
    settings = items;
    setExtensionTitle(items.isExtensionActive);
  });
}

function setExtensionTitle(isActivated) {
  browser.browserAction.setTitle({
    title: `Medium Unplugged is ${isActivated ? "ON" : "OFF"}`,
  });
  browser.browserAction.setBadgeText({
    text: isActivated ? "" : "OFF",
  });
}

function initArticleState(tabId) {
  ARTICLES_STORE[tabId] = { scriptsContent: [], metadata: {} };
}

function urlPathname(url) {
  if (url && url.startsWith("http")) {
    try {
      return decodeURIComponent(new URL(url).pathname);
    } catch (e) {
      console.log(`url not valid: ${url} error: ${e}`);
    }
  }
  return url;
}

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
// listen for messages sent from content script
browser.runtime.onMessage.addListener(handleMessageFromContent);

browser.storage.onChanged.addListener(function (changes) {
  if (changes.isExtensionActive) {
    settings.isExtensionActive = changes.isExtensionActive.newValue;
    setExtensionTitle(changes.isExtensionActive.newValue);
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

initSettings();

function unwrapImg(dom, tabId) {
  let img = $("img", dom);
  let imgWithSrcSet = $("noscript > img", dom);

  if (imgWithSrcSet) img = imgWithSrcSet;

  if (!img) return;

  img.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%`;
  img.setAttribute("loading", "lazy");

  // the 'paddingBottom' trick to avoid content shifting when an image is loaded
  const aspectRatio = `${((img.height / img.width) * 100).toPrecision(4)}`;

  const imgContainer = document.createElement("div");
  imgContainer.style.cssText = `position: relative; padding-bottom: ${aspectRatio}%; height: 0; margin-bottom: 10px`;

  imgContainer.appendChild(img);

  // remove the first div of <figure> used to contain <img>
  const div = dom.firstChild;
  if (div && div.nodeName === "DIV") removeElement(div);

  const figCaption = $("figcaption", dom);
  if (figCaption) {
    figCaption.style.textAlign = "center";
    dom.insertBefore(imgContainer, figCaption);
  } else {
    dom.appendChild(imgContainer);
  }
}

browser.webRequest.onBeforeRequest.addListener(
  function (details) {
    // extension is disabled. BAU as per Medium Corp
    if (!settings.isExtensionActive) return;

    if (/.+-\w{11,12}\?source=.+$/.test(details.url)) {
      return {
        redirectUrl: details.url.replace(/\?source=.+/, ""),
      };
    }

    // 1. only apply extension on 'path-name-ae4651dc07ba'
    // 2. allow favicon.ico request
    // 3. allow requests for static assets served by medium
    // 4. allow mediaResource request in worker.js
    if (
      !/.+-\w{11,12}$/.test(details.url) ||
      !/.+(?<!\.ico)$/.test(details.url) ||
      /miro.medium.com.+/.test(details.url) ||
      /media\/.+$/.test(details.url)
    ) {
      return;
    }

    const filter = browser.webRequest.filterResponseData(details.requestId);

    let domString = "";

    filter.ondata = (event) => {
      domString += decoder.decode(event.data, { stream: true });
    };

    filter.onstop = (event) => {
      initArticleState(details.tabId);

      // parse DOMString into a DOM tree
      let html = domParser.parseFromString(domString, "text/html");

      // collect the contents of all scripts to get the hydration state we need later
      for (const script of $$("script:not([src]):not([type])", html)) {
        if (script) {
          ARTICLES_STORE[details.tabId].scriptsContent.push(script.textContent);
        }
      }

      // get the script that contains the post's metadata
      // https://gist.github.com/kilgarenone/a33fbc0fdb5309a5123506f805d5b04f#file-medium-html-dump-html-L171-L216
      const metadata = $('script[type="application/ld+json"]', html);

      try {
        ARTICLES_STORE[details.tabId].metadata = JSON.parse(
          metadata.textContent
        );
      } catch (error) {
        console.error("Error parsing post metadata script content", error);
      }

      const article = $("article", html);

      // get the element of an article's title
      const headline = $("h1", article);

      // give in to medium if article's title is missing. could happen if its a comment page
      if (!headline) {
        filter.write(encoder.encode(domString));
        filter.disconnect();
        return;
      }

      headline.className = "mu-headline";

      const metaDataCont =
        headline.nextElementSibling || headline.parentNode.nextElementSibling;

      // collect the avatar, author name, post date
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
      authorName.href = avatar
        .closest("a")
        .href.replace(/moz-extension:\/\/.+(\/.+)\?source=.+/, function (a, b) {
          return b; // the matched group in the bracket
        });

      const requestPathname = urlPathname(details.url);

      const postedAtDate = document.createElement("div");
      postedAtDate.textContent = $(
        `[href*="${requestPathname}?source=post_page"]`,
        metaDataCont
      ).textContent.split("·")[0];
      postedAtDate.className = "mu-post-date";

      const profileCont = document.createElement("div");
      profileCont.style.cssText = `display: flex; align-items: center`;

      const authorInfoCont = document.createElement("div");
      authorInfoCont.appendChild(authorName);
      authorInfoCont.appendChild(postedAtDate);

      profileCont.appendChild(avatar);
      profileCont.appendChild(authorInfoCont);

      // remove all the action buttons- share post, bookmark etc.
      removeElement($("div", metaDataCont));

      // place the profile at the top of an article
      // note: do this after the step of removing img tags without srcset
      //      so it won't find our avatar img and delete it too
      headline.parentNode.insertBefore(profileCont, headline);

      // get post's images and unwrap them from the noscript tag
      // https://gist.github.com/kilgarenone/a33fbc0fdb5309a5123506f805d5b04f#file-medium-html-dump-html-L2396-L2414
      const allImagesWithSrcSet = $$("figure", article);
      for (const img of allImagesWithSrcSet) {
        unwrapImg(img, details.tabId);
      }

      // remove the <section/> used to say 'you have read 3 article this month...'
      removeElement(article.firstElementChild);

      // assign a classname to each paragraph for ease of emdedding media/embeds later
      $$("section > div > div", article).forEach((div) => {
        div.className = "mu-section";
        const children = Array.from(div.children);
        if (!children.length) return;
        children.forEach((node) => node.classList.add("mu-p"));
      });

      // convert Medium's link card to a simple anchor link
      const links = $$(".mu-p > a > div > div > h2", article);
      if (links.length) {
        links.forEach((ele) => {
          const a = ele.parentNode.parentNode.parentNode;
          a.parentNode.classList.add("mu-link");
          a.textContent = ele.textContent;
        });
      }

      const page = `<html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <meta http-equiv="X-UA-Compatible" content="ie=edge" />
                      <style>${STYLE_SHEET}</style>
                    </head>
                    <body>${article.outerHTML}</body>
                    </html>`;

      // finally pass it to the rendering engine
      filter.write(encoder.encode(page));

      // clean up memory(?)
      html = null;

      filter.disconnect();
    };
  },
  {
    urls: URLS,
  },
  ["blocking"]
);
