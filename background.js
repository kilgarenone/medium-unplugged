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

function unwrapImg(dom) {
  // get the element's parent node
  const img = dom.querySelector("img");
  const aspectRatio = `${(img.height / img.width) * 100}%`;

  const imgContainer = document.createElement("div");
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
  figCaption.style.textAlign = "center";

  dom.insertBefore(imgContainer, figCaption);
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

    if (/miro.medium.com.+/.test(details.url)) {
      return;
    }

    console.log("details:", details);

    let filter = extensionApi.webRequest.filterResponseData(details.requestId);
    // filter.onstart = (event) => {
    //   console.log("started");
    // };

    let string = "";
    filter.ondata = (event) => {
      let str = decoder.decode(event.data, { stream: true });
      string += str;
    };

    filter.onstop = (event) => {
      const html = domParser.parseFromString(string, "text/html");

      const article = html.getElementsByTagName("article")[0];

      // get avatar
      const profile = document.createElement("div");

      const headline = article.querySelectorAll("h1")[0];

      const avatar = (
        headline.nextElementSibling || headline.parentNode.nextElementSibling
      ).querySelector("a img");
      avatar.width = 56;
      avatar.height = 56;
      avatar.style.borderRadius = "50%";
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
        headline.parentNode.nextElementSibling.querySelector("div")
      );

      const allImages = article.querySelectorAll("img:not([srcset])");
      for (const img of allImages) {
        removeElement(img);
      }

      // get post's images and unwrap them from the noscript tag
      const allImagesWithSrcSet = article.querySelectorAll("figure");

      for (const img of allImagesWithSrcSet) {
        unwrapImg(img);
      }

      headline.parentNode.parentNode.appendChild(profile);

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

function removeElement(targetedDom) {
  targetedDom && targetedDom.parentNode.removeChild(targetedDom);
}
