/**
 *
 * Bypass medium paywall
 * credit: https://github.com/iamadamdev/bypass-paywalls-chrome
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

browser.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  {
    urls: URLS,
  },
  getBeforeSendExtraInfoSpec()
);

function getBeforeSendExtraInfoSpec() {
  const extraInfoSpec = ["blocking", "requestHeaders"];
  if (
    browser.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty(
      "EXTRA_HEADERS"
    )
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
