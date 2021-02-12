onmessage = function ({ data: { scriptsContent, precedingParagraphIds } }) {
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
   * mediaSlots's type
   * [{precedingParagraphId: String, mediaRefId: String}]
   */
  const mediaSlots = [];

  /**
   * stateArr's type
   * ["Paragraph:977ef336c448_51", "Paragraph:977ef336c448_51"]
   */
  const stateArr = Object.keys(state);

  stateArr.forEach((key, index) => {
    /** iframe's type
     *  {
          id: "977ef336c448_52",
          __typename: "Paragraph",
          name: "b032",
          text: "",
          type: "IFRAME",
          href: null,
          layout: "INSET_CENTER",
          metadata: null,
          hasDropCap: null,
          iframe: {
            __typename: "Iframe",
            mediaResource: {
              __ref: "MediaResource:c59b259898064780275173ffbf197808",
            },
          },
          mixtapeMetadata: null,
          markups: [],
          dropCapImage: null,
        },
     */
    const iframe = state[key].iframe;
    if (iframe && iframe.mediaResource && iframe.mediaResource.__ref) {
      const precedingState = state[stateArr[index - 1]];
      mediaSlots.push({
        precedingParagraphId:
          precedingState && precedingParagraphIds.includes(precedingState.name)
            ? precedingState.name
            : null,
        mediaRefId: iframe.mediaResource.__ref,
      });
    }
  });

  postMessage({ mediaSlots });
};
