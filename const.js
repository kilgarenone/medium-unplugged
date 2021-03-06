const URLS = ["https://medium.com/*", "https://*.medium.com/*"];

const STYLE_SHEET = `
*,
*::before,
*::after {
  box-sizing: border-box;
  overflow-wrap: break-word;
  margin: 0;
  border: 0 solid;
  font-family: inherit;
}

:root {
  --color-black: #3d3d3d;
  --color-dark-grey: #37474f;
  --color-mid-grey: #757575;
  --color-grey: #ccc;
  --color-light-grey: #e6ebf0;
  --font-sans: -apple-system, BlinkMacSystemFont, avenir next, avenir,
    helvetica neue, helvetica, Ubuntu, roboto, noto, segoe ui, arial, sans-serif;
  --font-mono: Menlo, Consolas, Monaco, Liberation Mono, Lucida Console,
    monospace;
  --ratio: 1.4;
  --s-3: calc(var(--s0) / var(--ratio) / var(--ratio) / var(--ratio));
  --s-2: calc(var(--s0) / var(--ratio) / var(--ratio));
  --s-1: calc(var(--s0) / var(--ratio));
  --s0: 1rem;
  --s1: calc(var(--s0) * var(--ratio));
  --s2: calc(var(--s0) * var(--ratio) * var(--ratio));
  --s3: calc(var(--s0) * var(--ratio) * var(--ratio) * var(--ratio));
  --s4: calc(
    var(--s0) * var(--ratio) * var(--ratio) * var(--ratio) * var(--ratio)
  );
  --measure: 60ch;
  --line-height: 1.5;

  line-height: var(--line-height);
  font-size: 1.2rem;
  font-family: var(--font-sans);
  color: var(--color-black);
}

/* https://blog.typekit.com/2016/08/17/flexible-typography-with-css-locks/ */
@media screen and (min-width: 24.15em) {
  :root {
    --line-height: calc(1.3em + (1.5 - 1.3) * ((100vw - 21em) / (35 - 21)));
  }
}

@media (min-width: 40.25em) {
  :root {
    --line-height: 1.5;
  }
}

@media (prefers-reduced-motion) {
  body {
    scroll-behavior: auto;
  }
}

body {
  scroll-behavior: smooth;
  text-rendering: optimizeSpeed;
  word-wrap: break-word;
}

.mu-section {
  --flow-space: var(--s1);
}

.mu-section > * {
  margin-top: var(--flow-space, 1.25rem);
}

.mu-section > * + * {
  margin-top: var(--flow-space, 1.25rem);
}

.mu-post-date {
  font-size: var(--s-1);
  color: var(--color-mid-grey);
}

.mu-link {
  --flow-space: var(--s-3);
}

.mu-link a {
  text-decoration: underline;
  font-weight: 600;
}

.paragraph-image {
  margin-top: var(--s-1);
}

li ul {
  margin-top: var(--s-3);
}

strong {
  font-weight: 600;
}

article {
  max-width: var(--measure);
  margin: 0 auto;
  padding: var(--s-1) var(--s-1) var(--s4);
}

a {
  text-decoration: none;
  text-underline-offset: 4px;
}

a:hover {
  text-decoration: underline;
}

[role="separator"] {
  margin-bottom: var(--s2);
  margin-top: var(--s2);
  height: 2px;
  background-color: var(--color-light-grey);
}

h1,
h2 {
  line-height: 1.15;
}

h1,
h2 {
  font-size: clamp(
    var(--fluid-type-min, 1rem),
    calc(1rem + var(--fluid-type-target, 2vw)),
    var(--fluid-type-max, 1.3rem)
  );
}

h1.mu-headline {
  margin-top: var(--s1);
  --fluid-type-min: 1.7rem;
  --fluid-type-max: 2rem;
  --fluid-type-target: 3vw;
  font-family: Arial;
}

h1 {
  --fluid-type-min: 1.5rem;
  --fluid-type-max: 1.7rem;
  --fluid-type-target: 2vw;
}

h2 {
  --fluid-type-min: 1.08rem;
  --fluid-type-max: 1.15rem;
  --fluid-type-target: 0.3vw;
}

h1 {
  --flow-space: var(--s4);
}

h1 + h2 {
  --flow-space: var(--s1);
}

h2 {
  --flow-space: var(--s3);
}

h1 + *,
h2 + * {
  --flow-space: var(--s-1);
}

p + ol,
p + ul {
  --flow-space: var(--s-1);
}

code,
pre {
  font-family: var(--font-mono);
  font-size: var(--s-1);
}

code {
  padding: 0.1rem 0.26rem;
  background-color: var(--color-light-grey);
  border-radius: 0.25rem;
  letter-spacing: 0.03ch;
  color: var(--color-dark-grey);
  font-weight: 700;
}

blockquote {
  padding: var(--s-3) 0 var(--s-1) var(--s-1);
  color: var(--color-mid-grey);
  border-left: 0.125rem solid var(--color-grey);
  margin-left: var(--s1);
  font-style: italic;
  font-family: Tahoma;
}

li > * {
  margin-top: var(--s1);
}

li + li {
  margin-top: 0.25em;
}

pre {
  padding: var(--s-1);
  border-radius: 0.5rem;
  color: var(--color-light-grey);
  background-color: #272822;
  text-shadow: 0 1px rgba(0, 0, 0, 0.3);
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;
  -moz-tab-size: 4;
  tab-size: 4;
  -moz-hyphens: none;
  hyphens: none;
  overflow: auto;
  max-height: 35rem;
}

pre > * + *:not([class*="token"]) {
  display: block;
}

figcaption {
  color: var(--color-mid-grey);
  font-size: var(--s-1);
  max-width: 56ch;
  margin: 0 auto;
}

img {
  max-width: 100%;
}

.token-not-formatted {
  color: #e6db74;
}

.token-keywords {
  color: #f92672;
}

.token-punctuation {
  color: #f8f8f2;
}

.token-strings-regex {
  color: #a6e22e;
}

.token-comments {
  color: #8292a2;
}
`;
