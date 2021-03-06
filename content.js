"use strict";

const domParser = new DOMParser();

function onError(error) {
  console.error(`Error in content: ${error}`);
}

const worker = new Worker(browser.runtime.getURL("worker.js"));

// https://docs.embed.ly/v1.0/docs/native
window.addEventListener("message", function (e) {
  let data;
  try {
    data = JSON.parse(e.data);
  } catch (e) {
    return false;
  }

  if (data.context !== "iframe.resize") return false;

  const iframe = document.querySelector('iframe[src="' + data.src + '"]');

  if (!iframe || !data.height) return false;

  iframe.height = data.height;

  // Update the responsive div.
  iframe.parentNode.style.paddingBottom =
    ((data.height / iframe.offsetWidth) * 100).toPrecision(4) + "%";
});

const config = {
  root: null, // avoiding 'root' or setting it to 'null' sets it to default value: viewport
  rootMargin: "0px", // no margin around our capturing frame(viewport in this case)
  threshold: 0.5, // when half of a target has intersected
};

const observer = new IntersectionObserver(function (entries, self) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    if (entry.target.dataset.isLeaving) {
      self.unobserve(entry.target);
      continue;
    }

    entry.target.dataset.isLeaving = true;

    if (entry.target.nodeName === "PRE") {
      requestAnimationFrame(() => highlightCode(entry.target));
      continue;
    }

    const mediaRef = entry.target.dataset.ref;
    if (mediaRef) {
      fetch(mediaRef)
        .then(handleMediaRefResults)
        .then((res) => insertMedia(res, entry.target))
        .catch(onError);
    }

    const dataSrc = entry.target.getAttribute("data-src");
    if (dataSrc) entry.target.src = dataSrc;
  }
}, config);

// get the script that embeds gists
function handleMediaRefResults(response) {
  return response
    .text()
    .then((domString) => {
      const document = domParser.parseFromString(domString, "text/html");
      const script = document.querySelector("script[src]");

      if (!script || !/gist.github.com/.test(script.src)) return false;

      // get the json representation of a gist
      return fetch(script.src.replace(/.js$/, ".json"));
    })
    .then((res) => res.json());
}

function insertMedia(media, paragraphEle) {
  // insert gist's stylesheet link
  const styleSheet = document.createElement("link");
  styleSheet.setAttribute("href", media.stylesheet);
  styleSheet.setAttribute("rel", "stylesheet");
  document.getElementsByTagName("head")[0].appendChild(styleSheet);
  paragraphEle.style.cssText = "";
  // html content of a gist
  const gist = document.createElement("div");
  gist.innerHTML = DOMPurify.sanitize(media.div);
  paragraphEle.insertBefore(gist, paragraphEle.firstChild);
}

const loadingEle = document.createElement("strong");
loadingEle.style.cssText = `position: absolute;
                          color: var(--color-mid-grey);
                          left: 0;
                          top: 2em;
                          height: 100%;
                          width: 100%;
                          text-align: center`;
loadingEle.className = "loading";
loadingEle.textContent = "Loading embedded content...";

worker.onmessage = async ({ data }) => {
  const paragraphs = Array.from(document.getElementsByClassName("mu-p"));

  // insert src to elements as data-src for lazy-loading via IntersectionObserver
  data.forEach(({ iFrameSrc, iFrameRef, order, height, width }) => {
    paragraphs[order].appendChild(loadingEle);

    // for gist
    if (iFrameRef) {
      paragraphs[order].setAttribute("data-ref", iFrameRef);
      paragraphs[
        order
      ].style.cssText = `position: relative; height: ${height}; width: ${width}; margin: 0`;

      observer.observe(paragraphs[order]);

      return;
    }

    // for other embeds
    const iframe = document.createElement("iframe");
    iframe.addEventListener("load", function () {
      // Hide the loading indicator
      this.parentNode.getElementsByClassName("loading")[0].remove();
    });
    iframe.setAttribute("data-src", iFrameSrc);
    iframe.width = width;
    iframe.height = height;
    iframe.style.cssText = `position: absolute; width: 100%; height: 100%; top: 0; left: 0`;

    const aspectRatio = `${((height / width) * 100).toPrecision(4)}`;
    paragraphs[
      order
    ].style.cssText = `height: 0; position: relative; overflow: hidden; padding-bottom: ${aspectRatio}%`;
    iframe.setAttribute("frameborder", 0);

    observer.observe(iframe);

    paragraphs[order].appendChild(iframe);
  });
};

window.addEventListener("DOMContentLoaded", initOnDomReady, false);

function initOnDomReady() {
  browser.runtime.sendMessage({
    event: "dom_loaded",
  });

  browser.runtime.onMessage.addListener(({ event, msg }) => {
    if (event === "get_article_model") {
      worker.postMessage({ msg, hostname: window.location.hostname });
    }
  });

  // observe code blocks to be lazily syntax-highlighted
  const codeBlocks = document.getElementsByTagName("pre");
  if (codeBlocks.length) {
    for (const code of codeBlocks) {
      observer.observe(code);
    }
  }
}

function highlightCode(codeBlock) {
  codeHighlighter(getAllCodes(codeBlock)).then((highlightedCodeBlock) => {
    requestIdleCallback(() => {
      codeBlock.innerText = "";
      codeBlock.appendChild(highlightedCodeBlock);
    });
  });
}

function getAllCodes(codeEle) {
  const codes = [];
  // innerText gives us all text content of an ele with whitespaces preserved. very cool.
  Array.from(codeEle.children).forEach((ele) => codes.push(ele.innerText));
  return codes.join("\n");
}

/**
 * @fileoverview microlight - syntax highlightning library
 * @version 0.0.1
 *
 * @license MIT, see http://github.com/asvd/microlight
 * @copyright 2016 asvd <heliosframework@gmail.com>
 *
 */
async function codeHighlighter(code) {
  const el = document.createDocumentFragment();
  // let el; // current microlighted element to run through
  // dynamic set of nodes to highlight
  // const microlighted = document.getElementsByClassName("microlight");

  let text = code,
    pos = 0, // current position
    next1 = text[0], // next character
    chr = 1, // current character
    prev1, // previous character
    prev2, // the one before the previous
    token = "", // current token content
    // current token type:
    //  0: anything else (whitespaces / newlines)
    //  1: operator or brace
    //  2: closing braces (after which '/' is division not regex)
    //  3: (key)word
    //  4: regex
    //  5: string starting with "
    //  6: string starting with '
    //  7: xml comment  <!-- -->
    //  8: multiline comment /* */
    //  9: single-line comment starting with two slashes //
    // 10: single-line comment starting with hash #
    tokenType = 0,
    // kept to determine between regex and division
    lastTokenType,
    // flag determining if token is multi-character
    multichar,
    node;

  /**
   * running through characters and highlighting
   *
   * NOTE:
   * Below is a chain of comma-separated expressions expecting
   * the loop to break once the last expression evaluates to 0/false.
   * (source: https://stackoverflow.com/a/16830323/73323)
   */
  while (
    ((prev2 = prev1),
    // escaping if needed (with except for comments)
    // pervious character will not be therefore
    // recognized as a token finalize condition
    (prev1 = tokenType < 7 && prev1 == "\\" ? 1 : chr))
  ) {
    chr = next1;
    next1 = text[++pos];
    multichar = token.length > 1;

    // checking if current token should be finalized
    if (
      !chr || // end of content
      // types 9-10 (single-line comments) end with a
      // newline
      (tokenType > 8 && chr == "\n") ||
      [
        // finalize conditions for other token types
        // 0: whitespaces
        /\S/.test(chr), // merged together
        // 1: operators
        1, // consist of a single character
        // 2: braces
        1, // consist of a single character
        // 3: (key)word
        !/[$\w]/.test(chr),
        // 4: regex
        (prev1 == "/" || prev1 == "\n") && multichar,
        // 5: string with "
        prev1 == '"' && multichar,
        // 6: string with '
        prev1 == "'" && multichar,
        // 7: xml comment
        text[pos - 4] + prev2 + prev1 == "-->",
        // 8: multiline comment
        prev2 + prev1 == "*/",
      ][tokenType]
    ) {
      // appending the token to the result
      if (token) {
        // remapping token type into style
        // (some types are highlighted similarly)
        el.appendChild((node = document.createElement("span"))).className = [
          // 0: not formatted
          "token-not-formatted",
          // 1: keywords
          "token-keywords",
          // 2: punctuation
          "token-punctuation",
          // 3: strings and regexps
          "token-strings-regex",
          // 4: comments
          "token-comments",
        ][
          // not formatted
          !tokenType
            ? 0
            : // punctuation
            tokenType < 3
            ? 2
            : // comments
            tokenType > 6
            ? 4
            : // regex and strings
            tokenType > 3
            ? 3
            : // otherwise tokenType == 3, (key)word
              // (1 if regexp matches, 0 otherwise)
              +/^(a(bstract|lias|nd|rguments|rray|s(m|sert)?|uto)|b(ase|egin|ool(ean)?|reak|yte)|c(ase|atch|har|hecked|lass|lone|ompl|onst|ontinue)|de(bugger|cimal|clare|f(ault|er)?|init|l(egate|ete)?)|do|double|e(cho|ls?if|lse(if)?|nd|nsure|num|vent|x(cept|ec|p(licit|ort)|te(nds|nsion|rn)))|f(allthrough|alse|inal(ly)?|ixed|loat|or(each)?|riend|rom|unc(tion)?)|global|goto|guard|i(f|mp(lements|licit|ort)|n(it|clude(_once)?|line|out|stanceof|t(erface|ernal)?)?|s)|l(ambda|et|ock|ong)|m(icrolight|odule|utable)|NaN|n(amespace|ative|ext|ew|il|ot|ull)|o(bject|perator|r|ut|verride)|p(ackage|arams|rivate|rotected|rotocol|ublic)|r(aise|e(adonly|do|f|gister|peat|quire(_once)?|scue|strict|try|turn))|s(byte|ealed|elf|hort|igned|izeof|tatic|tring|truct|ubscript|uper|ynchronized|witch)|t(emplate|hen|his|hrows?|ransient|rue|ry|ype(alias|def|id|name|of))|u(n(checked|def(ined)?|ion|less|signed|til)|se|sing)|v(ar|irtual|oid|olatile)|w(char_t|hen|here|hile|ith)|xor|yield)$/.test(
                token
              )
        ];

        node.appendChild(document.createTextNode(token));
      }

      // saving the previous token type
      // (skipping whitespaces and comments)
      lastTokenType = tokenType && tokenType < 7 ? tokenType : lastTokenType;

      // initializing a new token
      token = "";

      // determining the new token type (going up the
      // list until matching a token type start
      // condition)
      tokenType = 11;
      while (
        ![
          1, //  0: whitespace
          //  1: operator or braces
          /[\/{}[(\-+*=<>:;|\\.,?!&@~]/.test(chr),
          /[\])]/.test(chr), //  2: closing brace
          /[$\w]/.test(chr), //  3: (key)word
          chr == "/" && //  4: regex
            // previous token was an
            // opening brace or an
            // operator (otherwise
            // division, not a regex)
            lastTokenType < 2 &&
            // workaround for xml
            // closing tags
            prev1 != "<",
          chr == '"', //  5: string with "
          chr == "'", //  6: string with '
          //  7: xml comment
          chr + next1 + text[pos + 1] + text[pos + 2] == "<!--",
          chr + next1 == "/*", //  8: multiline comment
          chr + next1 == "//", //  9: single-line comment
          chr == "#", // 10: hash-style comment
        ][--tokenType]
      );
    }

    token += chr;
  }

  return el;
}
