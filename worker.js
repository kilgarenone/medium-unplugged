onmessage = function ({
  data: {
    msg: { scriptsContent, metadata },
    hostname,
  },
}) {
  let state = {};

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
    const iFrameSrc =
      state[mediaResourceId].iframeSrc ||
      `https://${hostname}/media/${mediaResourceId.replace(
        "MediaResource:",
        ""
      )}`;
    mediaSlots.push({ iFrameSrc, childOrder: index });
  });

  postMessage(mediaSlots);
  // console.log("postModel:", postModel);
  /**
   * mediaSlots's type
   * [{precedingParagraphId: String, mediaRefId: String}]
   */
  // const mediaSlots = [];

  /**
   * stateArr's type
   * ["Paragraph:977ef336c448_51", "Paragraph:977ef336c448_51"]
   */
  // const stateArr = Object.keys(state);

  // stateArr.forEach((key, index) => {
  //   /** iframe's type
  //    *  {
  //         id: "977ef336c448_52",
  //         __typename: "Paragraph",
  //         name: "b032",
  //         text: "",
  //         type: "IFRAME",
  //         href: null,
  //         layout: "INSET_CENTER",
  //         metadata: null,
  //         hasDropCap: null,
  //         iframe: {
  //           __typename: "Iframe",
  //           mediaResource: {
  //             __ref: "MediaResource:c59b259898064780275173ffbf197808",
  //           },
  //         },
  //         mixtapeMetadata: null,
  //         markups: [],
  //         dropCapImage: null,
  //       },
  //    */
  //   const iframe = state[key].iframe;

  //   if (iframe && iframe.mediaResource && iframe.mediaResource.__ref) {
  //     const precedingState = state[stateArr[index - 1]];
  //     const iFrameSrc = state[iframe.mediaResource.__ref].iframeSrc;
  //     mediaSlots.push({
  //       precedingParagraphId:
  //         precedingState && containerId.includes(precedingState.name)
  //           ? precedingState.name
  //           : null,
  //       mediaRefId: iframe.mediaResource.__ref.replace("MediaResource:", ""),
  //       iFrameSrc,
  //     });
  //   }
  // });
};
