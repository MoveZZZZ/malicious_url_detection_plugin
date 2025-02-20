let alertWindowId = null;
let overlayWindowId = null;
let alertTabId = null;

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((message) => {
        if (message.action === "closeAlert") {
            if (overlayWindowId) {
                chrome.windows.remove(overlayWindowId, () => {
                    overlayWindowId = null;
                });
            }
            if (alertWindowId) {
                chrome.windows.remove(alertWindowId, () => {
                    alertWindowId = null;
                });
            }
            if (message.tabId) {
                chrome.tabs.remove(message.tabId, () => {
                    console.log("Tab closed!");
                });
            }
        }

        if (message.action === "continueBrowsing") {
            if (overlayWindowId) {
                chrome.windows.remove(overlayWindowId, () => {
                    overlayWindowId = null;
                });
            }
            if (alertWindowId) {
                chrome.windows.remove(alertWindowId, () => {
                    alertWindowId = null;
                });
            }
            if (message.domain) {
                let domain = message.domain;
                chrome.storage.local.get("trustedDomains", (data) => {
                    let trustedDomains = data.trustedDomains || [];
                    if (!trustedDomains.includes(domain)) {
                        trustedDomains.push(domain);
                        chrome.storage.local.set({ trustedDomains: trustedDomains }, () => {
                            console.log("Trusted domains updated:", trustedDomains);
                        });
                    }
                });
            }
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.url || changeInfo.status !== "complete") return;
    let url = new URL(tab.url);
    let domain = url.hostname;

    chrome.storage.local.get("trustedDomains", (data) => {
        let trustedDomains = data.trustedDomains || [];
        if (trustedDomains.includes(domain)) {
            console.log("Trusted domain detected, skipping:", domain);
            return;
        }

        chrome.storage.local.get("autoCheck", (autoCheckData) => {
            if (autoCheckData.autoCheck) {
                fetch("https://api.example.com/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: tab.url })
                })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (!data.safe) {
                            showWarningPopup(tabId, "⚠️ This URL is dangerous!");
                        }
                    })
                    .catch(error => {
                        showWarningPopup(tabId, "❌ API error, cannot verify URL!");
                    });
            }
        });
    });
});

function showWarningPopup(tabId, message) {
    if (alertWindowId !== null) {
        return;
    }
    alertTabId = tabId;
    chrome.storage.local.set({ alertMessage: message, alertTabId: tabId });

    chrome.system.display.getInfo((displays) => {
        chrome.windows.create({
            url: "about:blank",
            type: "popup",
            state: "fullscreen",
            focused: true
        }, (overlayWindow) => {
            overlayWindowId = overlayWindow.id;
            const alertUrl = chrome.runtime.getURL("alert/alert.html");
            chrome.windows.create({
                url: alertUrl,
                type: "popup",
                state: "fullscreen",
                focused: true
            }, (window) => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to create warning window:", chrome.runtime.lastError);
                } else {
                    alertWindowId = window.id;
                }
            });
        });
    });
}
