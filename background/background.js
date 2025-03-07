chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((message) => {
        if (message.action === "closeAlert") {
            chrome.scripting.executeScript({
                target: { tabId: message.tabId },
                func: () => {
                    const overlay = document.getElementById("extension-alert-overlay");
                    if (overlay) {
                        overlay.remove();
                        document.body.style.overflow = "";
                    }
                }
            });
            if (message.tabId) {
                chrome.tabs.remove(message.tabId, () => {
                    console.log("Tab closed!");
                });
            }
        }
        if (message.action === "continueBrowsing") {
            chrome.scripting.executeScript({
                target: { tabId: message.tabId },
                func: () => {
                    const overlay = document.getElementById("extension-alert-overlay");
                    if (overlay) {
                        overlay.remove();
                        document.body.style.overflow = "";
                    }
                }
            });
            if (message.domain) {
                const domain = message.domain;
                chrome.storage.local.get("trustedDomains", (data) => {
                    let trustedDomains = data.trustedDomains || [];
                    if (!trustedDomains.includes(domain)) {
                        trustedDomains.push(domain);
                        chrome.storage.local.set({ trustedDomains }, () => {
                            console.log("Trusted domains updated:", trustedDomains);
                        });
                    }
                });
            }
        }
    });
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
        if (!tab.url || changeInfo.status !== "complete") return;
        const { autoCheck } = await chrome.storage.local.get("autoCheck");
        if (!autoCheck) {
            return;
        }
        const domain = new URL(tab.url).hostname;
        const { trustedDomains } = await chrome.storage.local.get("trustedDomains");
        if ((trustedDomains || []).includes(domain)) {
            console.log("Trusted domain, skipping check:", domain);
            return;
        }
        const response = await fetch("http://127.0.0.1:5000/api/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: tab.url })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        switch (data.predicted_label) {
            case "benign":
                console.log(`✅ URL is safe (Confidence: ${data.prediction_probs}%)`);
                break;

            case "defacement":
                showWarningPopup(
                    tabId,
                    `<div class="result-msg">⚠️ <span class="status-defacement">Suspicious URL! Confidence: ${data.prediction_probs}%</span></div>`
                );
                break;

            case "phishing":
                showWarningPopup(
                    tabId,
                    `<div class="result-msg">🪝<span class="status-phishing">URL is considered phishing! Confidence: ${data.prediction_probs}%</span></div>`
                );
                break;

            case "malware":
                showWarningPopup(
                    tabId,
                    `<div class="result-msg">☠️<span class="status-malware">URL is considered malware! Confidence: ${data.prediction_probs}%</span></div>`
                );
                break;

            default:
                console.warn("Unknown label from API:", data.predicted_label);
                showWarningPopup(
                    tabId,
                    `❌ Unknown label: ${data.predicted_label} - Confidence: ${data.prediction_probs}%`
                );
                break;
        }

    } catch (error) {
        console.error("API Error:", error);
        showWarningPopup(tabId, "❌ API error, cannot verify URL!");
    }
});


function showWarningPopup(tabId, message) {
    chrome.scripting.executeScript({
        target: { tabId },
        func: injectOverlayHTML,
        args: [message, tabId]
    })
        .then(() => {
            return chrome.scripting.executeScript({
                target: { tabId },
                files: ["alert/alert.js"]
            });
        })
        .then(() => {
            return chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    if (window.initAlertLogic) {
                        window.initAlertLogic();
                    }
                }
            });
        })
        .catch(err => console.error("Injection failed:", err));
}



function injectOverlayHTML(msg, tabId) {
    if (document.getElementById("extension-alert-overlay")) return;

    document.body.style.overflow = "hidden";

    const overlay = document.createElement("div");
    overlay.id = "extension-alert-overlay";

    overlay.dataset.message = msg;
    overlay.dataset.tabId   = tabId;
    document.body.style.overflow = "hidden";
    overlay.innerHTML = `
<div class="scream_image_bg">
    <div class="plugin-alert-container">
      <h2 class="main-alert-text">⚠️ Warning!</h2>
      ${msg}
      <div class="trust-container">
          <label class="cyber-checkbox">
            <input type="checkbox" id="cyberCheck" />
            <span class="checkmark"></span>
          </label>
          <div class="plugin-alert-chk-box-descr">
            <label for="trust-domain">Trust this domain</label>
            <label for="trust-domain">(to save the changes, click continue)</label>
          </div>
      </div>
      <div class="plugin-alert-button-container">
        <button id="close-btn" class="plugin-button-alert">Close page</button>
        <button id="continue-btn" class="plugin-button-alert">Continue</button>   
      </div>
    </div>
    </div>
    `;
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        zIndex: "999999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    });

    const cssEl = document.createElement("link");
    cssEl.rel = "stylesheet";
    cssEl.href = chrome.runtime.getURL("alert/alert.css");
    document.head.appendChild(cssEl);

    document.body.appendChild(overlay);

}
