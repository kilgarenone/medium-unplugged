const onOffTextEle = document.querySelector(".onOff-text");
const onOffEle = document.querySelector(".onOff");

browser.storage.sync.get(null, function (items) {
  const isExtensionEnabled = items.isExtensionActive;
  const slider = document.createElement("input");
  slider.className = "toggle";
  slider.setAttribute("type", "checkbox");
  slider.id = "onOff";
  slider.checked = isExtensionEnabled;

  const toggleStatusText = document.createElement("p");
  toggleStatusText.className = "toggle-text";
  toggleStatusText.textContent = `Extension is ${
    isExtensionEnabled ? "enabled" : "disabled"
  }`;
  toggleStatusText.style.color = "var(--color-mid-grey)";
  onOffEle.appendChild(slider);
  onOffTextEle.appendChild(toggleStatusText);
});

onOffEle.addEventListener("click", function (event) {
  if (event.target.tagName !== "INPUT") return;

  browser.storage.sync.set(
    { isExtensionActive: event.target.checked },
    function () {
      document.getElementsByClassName("toggle-text")[0].textContent =
        "Reloading page...";

      setTimeout(() => {
        window.close();
      }, 1000);
    }
  );
});
