# Medium Unplugged :fishing_pole_and_fish:

A Medium article is heavily loaded with Javascript that negatively affects the loading and reading experience of an end-user particularly those on constrained devices. To fix this situation, this Firefox browser plugin strips it to utmost minimum: The content.

This plugin only works in Firefox due to the usage of a web-extension API called [`filterResponseData`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/filterResponseData) that's available nowhere else but Firefox. This API is the key to strip everything but the content before passes it to the renderer.

## Download extension
https://addons.mozilla.org/en-US/firefox/addon/medium-unplugged/


## Development

```bash
# Download the repo
git clone https://github.com/kilgarenone/medium-unplugged.git

## Change directory to the repo
cd medium-unplugged

# open the repo in VSCode
code .
```

Now, there are two ways to develop:

- `web-ext` package that auto-reload for you
- Load your plugin in `about:debugging`

### web-ext

https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/

However, in my experience, I found multiple times that when I save it didn't properly reload for me. YMMV.

### about:debugging

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension

This is my preferred method. It is as robust as it can be.

## Developing for Firefox Android

https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/

It's quite complicated to setup, but just follow the instructions laid out in the guide above and you should be fine.

Side note: you don't need to install the whole 'Android Studio' software meant for a full-blown native-app development- You just need the `sdkmanager` for what's at hand.

## Build

When you are ready to publish or update your extension, you will need the `web-ext` package.

In the root of your directory, run this command:

```
web-ext build
```

It will package your plugin in a `.zip` file which you will upload during the submission.

:tent:
