const toggleBtnCont = document.querySelector(".switch");

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
  toggleBtnCont.appendChild(slider);
  toggleBtnCont.appendChild(toggleStatusText);
});

toggleBtnCont.addEventListener("click", function (event) {
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
