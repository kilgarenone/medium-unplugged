const toggleBtnCont = document.querySelector(".switch");

extensionApi.storage.sync.get(null, function (items) {
  const label = document.createElement("label");
  label.setAttribute("for", "onOff");

  const slider = document.createElement("input");
  slider.className = "toggle";
  slider.setAttribute("type", "checkbox");
  slider.id = "onOff";
  slider.checked = items.isExtensionActive;

  const toggleStatusText = document.createElement("p");
  toggleStatusText.className = "toggle-text";
  toggleStatusText.textContent = getStatusText(items.isExtensionActive);
  toggleBtnCont.appendChild(slider);
  toggleBtnCont.appendChild(toggleStatusText);
  console.log("items:", items);
});

toggleBtnCont.addEventListener("click", function (event) {
  if (event.target.tagName !== "INPUT") return;
  console.log("e:", event);
  extensionApi.storage.sync.set(
    { isExtensionActive: event.target.checked },
    function () {
      document.getElementsByClassName(
        "toggle-text"
      )[0].textContent = getStatusText(event.target.checked);
    }
  );
});

function getStatusText(isEnabled) {
  return `Extension is ${isEnabled ? "enabled" : "disabled"}`;
}
