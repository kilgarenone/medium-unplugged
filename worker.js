onmessage = function ({ data: { scriptsContent, precedingParagraphIds } }) {
  console.log("precedingParagraphIds:", precedingParagraphIds);
  console.log("scriptsContent:", scriptsContent);
  // for (let i = scripts.length - 1; i >= 0; i--) {
  //   if (/window.__APOLLO_STATE__ =/.test(scripts[i].textContent)) {
  //     try {
  //       postState = JSON.parse(
  //         scripts[i].textContent.replace("window.__APOLLO_STATE__ =", "")
  //       );
  //       console.log("postState:", postState);
  //     } catch (err) {
  //       console.log("Error parsing window.__APOLLO_STATE__");
  //     }

  //     break;
  //   }
  // }
  postMessage({ scriptsContent, precedingParagraphIds });
};
