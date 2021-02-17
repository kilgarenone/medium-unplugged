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

function onError(error) {
  console.error(`Error: ${error}`);
}

const domParser = new DOMParser();
const ARTICLES_STORE = {};

extensionApi.runtime.onMessage.addListener(handleMessageFromContent);

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
  const img = dom.querySelector("img");

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

  const figCaption = dom.querySelector("figcaption");
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
// const ARTICLE_ID = "medium-unplugged-article";

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

    // allow mediaResource request in worker.js
    if (/media\/.+$/.test(details.url)) {
      return;
    }

    console.log("details:", details);

    const filter = extensionApi.webRequest.filterResponseData(
      details.requestId
    );

    let string = "";
    filter.ondata = (event) => {
      string += decoder.decode(event.data, { stream: true });
    };

    filter.onstop = (event) => {
      initArticleState(details.tabId);
      // parse DOMString into a DOM tree
      let html = domParser.parseFromString(string, "text/html");

      for (const script of html.querySelectorAll(
        "script:not([src]):not([type])"
      )) {
        if (script) {
          ARTICLES_STORE[details.tabId].scriptsContent.push(script.textContent);
        }
      }

      const metadata = html.querySelector('script[type="application/ld+json"]');
      const article = html.getElementsByTagName("article")[0];

      // TODO: proper filter out request at upper-level
      // if (!article || !metadata) {
      //   filter.disconnect();
      //   return;
      // }

      try {
        ARTICLES_STORE[details.tabId].metadata = JSON.parse(
          metadata.textContent
        );
      } catch (error) {
        console.error("Error parsing post metadata script content", error);
      }

      // get the element of an article's title
      const headline = article.querySelectorAll("h1")[0];

      const metaDataCont =
        headline.nextElementSibling || headline.parentNode.nextElementSibling;
      // get avatar
      let profile = metaDataCont.querySelectorAll(
        `a[href*="medium.com/?source=post_page"]`
      );

      if (!profile.length) {
        profile = metaDataCont.querySelectorAll(
          `a[href^="/?source=post_page"]`
        );
      }

      // create profile container for avatar, author name, post metadata
      const profileCont = document.createElement("a");

      const avatar = profile[0].querySelector("img");
      avatar.width = 56;
      avatar.height = 56;
      avatar.style.borderRadius = "50%";
      // get bigger avatar image for higher resolution
      avatar.src = avatar.src.replace(/\d+\/\d+/, "120/120");
      profileCont.appendChild(avatar);

      const authorName = document.createElement("span");
      authorName.innerText = profile[1].textContent;
      profileCont.appendChild(authorName);

      // set href to point to author's medium page
      profileCont.href = profile[0].href.replace(/\?source=post_page.*/, "");

      const postedAtDate = metaDataCont
        .querySelector(
          `a[href*="${urlPathname(details.url)}?source=post_page"]`
        )
        .textContent.split("·")[0];
      const postedAtDateCont = document.createElement("div");
      postedAtDateCont.textContent = postedAtDate;

      metaDataCont.appendChild(postedAtDateCont);

      // remove action buttons- share post, bookmark
      removeElement(metaDataCont.querySelector("div"));

      // remove all images' placeholder
      const allImages = article.querySelectorAll("img:not([srcset])");
      for (const img of allImages) {
        removeElement(img);
      }

      // get post's images and unwrap them from the noscript tag
      const allImagesWithSrcSet = article.querySelectorAll("figure");
      for (const img of allImagesWithSrcSet) {
        unwrapImg(img, details.tabId);
      }

      // remove the <section/> used to contain 'you have red 3 article this month...'
      removeElement(article.firstElementChild);

      article.querySelectorAll("section").forEach((section) => {
        const children = section.querySelectorAll("div > div > *");
        if (!children.length) return;
        children.forEach((node) => node.classList.add("mu-p"));
      });
      // console.log(
      //   "article:",
      //   Array.from(html.getElementsByClassName("mu-p"))
      // );

      // prepend the profile section to the top of an article
      headline.parentNode.insertBefore(profileCont, headline);

      // finally pass it to rendering engine
      filter.write(encoder.encode(article.innerHTML));

      // clean up memory(?)
      html = null;

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
