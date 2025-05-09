if (!window.timerinit) {
  removeExistingTimer();
  window.timer = document.createElement("ytIntrrupt");
  window.timer.className = "ytIntrrupt";
  window.timer.style.position = "fixed";
  window.timer.style.top = "0.4vh";
  window.timer.style.right = "25vh";
  window.timer.style.zIndex = "9999";
  window.timer.style.padding = "3px 3px";
  window.timer.style.color = "white";
  window.timer.style.borderRadius = "10px";
  window.timer.style.fontSize = `3vh`;
  window.timer.style.fontFamily = "Arial, sans-serif";
  window.timer.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
  window.timer.style.border = "2px solid #3498db";
  window.timer.style.textShadow = "1px 1px 2px rgba(0,0,0,0.1)";
  window.timer.style.fontWeight = "400";
  window.timer.style.letterSpacing = "2px";

  document.body.appendChild(window.timer);
}

window.timerinit = true

function removeExistingTimer() {
  const existingTimer = document.querySelectorAll(".ytIntrrupt");
  for (const item of existingTimer) {
    item.remove();
  }
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "updateUI") {
    window.timer.textContent = `${request.logged}`;
    sendResponse({ content: "UI updated" });
    return true; // This is required by a Chrome Extension
  }
  else if (request.command == "updateUI&alert") {
    window.timer.textContent = `${request.logged}`;
    alert(request.alert);
    sendResponse({ content: "UI updated + Alert" });
    return true; // This is required by a Chrome Extension
  }
})