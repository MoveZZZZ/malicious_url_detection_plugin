document.addEventListener("DOMContentLoaded", () => {
    const messageElement = document.getElementById("message");
    const closeButton = document.getElementById("close-btn");
    const continueButton = document.getElementById("continue-btn");
    const trustCheckbox = document.getElementById("trust-domain");

    chrome.storage.local.get(["alertMessage", "alertTabId"], (data) => {
        if (data.alertMessage) {
            messageElement.innerText = data.alertMessage;
        } else {
            console.error("No alert message found!");
        }

        if (data.alertTabId) {
            chrome.tabs.get(data.alertTabId, (tab) => {
                if (tab && tab.url) {
                    let url = new URL(tab.url);
                    let domain = url.hostname;
                    const port = chrome.runtime.connect({ name: "alertPopup" });
                    closeButton.addEventListener("click", () => {
                        port.postMessage({ action: "closeAlert", tabId: data.alertTabId });
                        window.close();
                    });

                    continueButton.addEventListener("click", () => {
                        let trustDomain = trustCheckbox.checked ? domain : null;
                        port.postMessage({ action: "continueBrowsing", domain: trustDomain });
                        window.close();
                    });
                }
            });
        } else {
            console.error("No tab ID found!");
        }
    });
});
