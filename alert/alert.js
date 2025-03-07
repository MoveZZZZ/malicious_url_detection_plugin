window.initAlertLogic = function initAlertLogic() {
    const overlay = document.getElementById("extension-alert-overlay");
    if (!overlay) {
        console.error("No overlay found. Cannot attach alert logic.");
        return;
    }

    const tabId   = parseInt(overlay.dataset.tabId, 10);
    const message = overlay.dataset.message;

    const messageElement = document.getElementById("message");
    if (messageElement && message) {
        messageElement.innerText = message;
    }

    const closeButton    = document.getElementById("close-btn");
    const continueButton = document.getElementById("continue-btn");
    const trustCheckbox  = document.getElementById("cyberCheck");

    const domain = window.location.hostname;

    const port = chrome.runtime.connect({ name: "alertPopup" });

    closeButton.addEventListener("click", () => {
        port.postMessage({
            action: "closeAlert",
            tabId: tabId
        });
    });

    continueButton.addEventListener("click", () => {
        const trustDomain = trustCheckbox.checked ? domain : null;
        port.postMessage({
            action: "continueBrowsing",
            domain: trustDomain,
            tabId: tabId
        });
    });
};
