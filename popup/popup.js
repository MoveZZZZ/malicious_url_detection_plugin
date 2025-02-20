document.addEventListener("DOMContentLoaded", () => {
    const copyBtn = document.getElementById("copy-btn");
    const checkBtn = document.getElementById("check-btn");
    const showTrustedBtn = document.getElementById("show-trusted-btn");
    const trustedDomainsContainer = document.getElementById("trusted-domains-container");
    const searchInput = document.getElementById("search-trusted");
    const autoCheckSwitch = document.getElementById("auto-check");
    const status = document.getElementById("status");
    const urlContainer = document.getElementById("url-container");

    let isTrustedListVisible = false;
    let trustedDomains = [];

    chrome.storage.local.get("autoCheck", (data) => {
        autoCheckSwitch.checked = data.autoCheck || false;
    });
    autoCheckSwitch.addEventListener("change", () => {
        chrome.storage.local.set({ autoCheck: autoCheckSwitch.checked }, () => {
            chrome.runtime.sendMessage({ action: "toggleAutoCheck", enabled: autoCheckSwitch.checked });
        });
    });

    function updateTrustedDomains() {
        chrome.storage.local.get("trustedDomains", (data) => {
            trustedDomains = (data.trustedDomains || []).sort();

            if (trustedDomains.length === 0) {
                trustedDomainsContainer.innerHTML = "<p>No trusted domains</p>";
            } else {
                renderTrustedDomains(trustedDomains);
            }
        });
    }
    function renderTrustedDomains(domains) {
        if (domains.length === 0) {
            trustedDomainsContainer.innerHTML = "<p>No matches found</p>";
            return;
        }
        trustedDomainsContainer.innerHTML = domains
            .map(domain => `
                <div class="trusted-item">
                    <span>🔒 ${domain}</span>
                    <button class="remove-domain" data-domain="${domain}">❌</button>
                </div>
            `).join("");
        document.querySelectorAll(".remove-domain").forEach(button => {
            button.addEventListener("click", () => {
                removeTrustedDomain(button.dataset.domain);
            });
        });
    }
    function removeTrustedDomain(domain) {
        trustedDomains = trustedDomains.filter(d => d !== domain);
        chrome.storage.local.set({ trustedDomains: trustedDomains }, () => {
            renderTrustedDomains(trustedDomains);
        });
    }
    showTrustedBtn.addEventListener("click", () => {
        isTrustedListVisible = !isTrustedListVisible;

        if (isTrustedListVisible) {
            updateTrustedDomains();
            trustedDomainsContainer.style.display = "block";
            searchInput.style.display = "block";
            showTrustedBtn.style.background = "#00ff00";
            showTrustedBtn.style.color = "black";
        } else {
            trustedDomainsContainer.style.display = "none";
            searchInput.style.display = "none";
            showTrustedBtn.style.background = "black";
            showTrustedBtn.style.color = "#00ff00";
        }
    });
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        const filteredDomains = trustedDomains.filter(domain => domain.toLowerCase().includes(query));
        renderTrustedDomains(filteredDomains);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let url = tabs[0].url;
        document.getElementById("url-container").innerText = url;
    });
    copyBtn.addEventListener("click", () => {
        status.innerHTML = ""
        navigator.clipboard.writeText(urlContainer.innerText).then(() => {
            status.style.color = "#77dd77";
            status.innerHTML = "✅ Copied!";
            status.style.opacity = "1";
            status.style.transform = "scale(1)";
            status.style.visibility = "visible";

            setTimeout(() => {
                status.style.opacity = "0";
                status.style.transform = "scale(0.9)";
                status.style.visibility = "hidden";
            }, 2000);
        });
    });
    checkBtn.addEventListener("click", async () => {
        const url = urlContainer.innerText;
        status.innerHTML = ""
        status.style.opacity = "1";
        status.style.color = "#00ff00";
        status.innerHTML = "🔄 Checking...";
        try {
            const response = await fetch("https://api.example.com/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.safe) {
                status.innerHTML = `✅ URL is safe!`;
                status.style.color = "#77dd77";
            } else {
                status.innerHTML = `⚠️ Warning! Suspicious URL.`;
                status.style.color = "#ff5555";
            }
        } catch (error) {
            status.innerHTML = `❌ Error checking URL`;
            status.style.color = "#ff0000";
            console.error("API Error:", error);
        }
    });
});
