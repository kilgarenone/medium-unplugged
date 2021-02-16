"use strict";

onmessage = function ({ data: { event, msg, hostname } }) {
  let state = {};
  const { scriptsContent, metadata } = msg;

  for (let i = scriptsContent.length - 1; i >= 0; i--) {
    if (/window.__APOLLO_STATE__ =/.test(scriptsContent[i])) {
      try {
        state = JSON.parse(
          scriptsContent[i].replace("window.__APOLLO_STATE__ =", "")
        );
      } catch (err) {
        console.log("Error parsing window.__APOLLO_STATE__");
      }
      break;
    }
  }

  /**
   *    {
          id: "bce68a9dee7",
          __typename: "Post",
          canonicalUrl: "",
          collection: null,
          'content({"postMeteringOptions":{"referrer":"https:\u002F\u002Ft.co\u002Fllu1mj1ukzq"}})': {
            __typename: "PostContent",
            isLockedPreviewOnly: false,
            validatedShareKey: "",
            isCacheableContent: false,
            bodyModel: {
              __typename: "RichText",
              paragraphs: [
                { __ref: "Paragraph:f0aed8bbd7a1_0" },
                { __ref: "Paragraph:f0aed8bbd7a1_1" },
              ]
            }
          }
        }
   */
  const postObj = state[`Post:${metadata.identifier}`];
  /**
   * [
        { __ref: "Paragraph:f0aed8bbd7a1_0" },
        { __ref: "Paragraph:f0aed8bbd7a1_1" },
        { __ref: "Paragraph:f0aed8bbd7a1_2" },
      ]
   */
  let paragraphs = [];

  for (const key in postObj) {
    if (/content\(/.test(key)) {
      paragraphs = postObj[key].bodyModel.paragraphs;
      break;
    }
  }

  paragraphs = paragraphs.filter(({ __ref: paragraphRef }, index) => {
    if (index === 0) return true;

    if (/^(P|IMG|H\d|IFRAME)$/.test(state[paragraphRef].type)) return true;

    if (state[paragraphRef].type === state[paragraphs[index - 1].__ref].type) {
      return false;
    }

    return true;
  });

  const mediaSlots = [];
  paragraphs.forEach(({ __ref: paragraphRefId }, index) => {
    const paragraph = state[paragraphRefId];

    if (!paragraph || !paragraph.iframe) return;

    const mediaResourceId = paragraph.iframe.mediaResource.__ref;
    const mediaResource = state[mediaResourceId];

    mediaSlots.push({
      iFrameSrc: mediaResource.iframeSrc,
      iFrameRef:
        !mediaResource.iframeSrc &&
        `https://${hostname}/media/${mediaResourceId.replace(
          "MediaResource:",
          ""
        )}`,
      order: index,
      height: mediaResource.iframeHeight || 77, // 77 min height for gist
      width: mediaResource.iframeWidth || "100%",
    });
  });

  postMessage(mediaSlots);
};
