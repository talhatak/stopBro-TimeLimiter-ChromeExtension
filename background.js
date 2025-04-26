// Default settings
let settings = {
    defaultTimeLimit: 10,
    sites: [
        {url: "facebook.com", timeLimit: 15, extraTime:0}
    ]
};

let activeTabId = null;
let activeUrl = null;
let startTime = null;
let intervalId = null;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "settingsUpdated") {
        settings = message.settings;

        // Check the currently active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                let activeTab = tabs[0];
                let activeUrl = activeTab.url;

                // If the active tab matches the newly added site, start tracking
                chrome.storage.local.get(['settings'], function(result) {
                    if (result.settings.sites) {
                        let site = result.settings.sites.find( s => activeUrl.includes(s.url));
                        if (site) {
                            startTracking(activeTab.id, activeUrl);
                        }
                    }
                })
            }
        });

        sendResponse({ success: true });
    }

    if (message.action === "closeTab") {
        chrome.tabs.remove(sender.tab.id);  // Closes the current tab
    }

});

function startTracking(tabId, url) {
    if (intervalId) clearInterval(intervalId); // Stop any existing tracking

    chrome.storage.local.get(['settings'], function(result) {
        if (result.settings && result.settings.sites) {
            let site = result.settings.sites.find( s => url.includes(s.url));
            if (site) {
                activeTabId = tabId;
                activeUrl = site.url;
                startTime = Date.now()
                let trackingExtraTime = false; // Flag to track extra time

                intervalId = setInterval(() => {
                    let elapsedTime = Math.floor((Date.now() - startTime) / 1000); // Seconds
                    startTime = Date.now(); // Reset start time

                    if (site.timeSpent >= site.timeLimit) {
                        if (!trackingExtraTime) {
                            console.log("⏳ Time limit reached! Tracking extra time...");
                            trackingExtraTime = true;
                            
                            // Check if content script is ready before sending message
                            chrome.scripting.executeScript({target: { tabId: activeTabId }, 
                                function: () => true}, () => {
                                if (chrome.runtime.lastError) {
                                    console.log("Content script is not ready:", chrome.runtime.lastError.message);
                                } else {
                                    console.log("Sending blocking message to", activeTabId);
                                    chrome.tabs.sendMessage(activeTabId, { action: "showBlockingScreen" });
                                }
                            });
                        }
                        site.extraTime = (site.extraTime || 0) + elapsedTime;

                    } else {
                        site.timeSpent += elapsedTime;
                    }
                    chrome.storage.local.set({ settings:result.settings })
                }, 1000); //Update time every second
            }    
        }
    });
};

function resetTimeSpent() {
    chrome.storage.local.get(['settings'], function(result) {
       let settings = result.settings;
       if (settings.sites){
        settings.sites.forEach(site => { site.timeSpent = 0; site.extraTime = 0});

        //update settings in storage
        chrome.storage.local.set({ settings }, function() {
        })
       }
    });

    // Save today's date as last reset date
    let today = new Date().toDateString();
    chrome.storage.local.set({ lastResetDate: today }, function() {
        console.log("Date reset to today: ", today)
    }) 
}

//Function to check if reset is needed
function checkReset() {
    chrome.storage.local.get(['lastResetDate'], function(result) {
        let lastResetDate = result.lastResetDate;
        if (lastResetDate) {
            let today = new Date().toDateString();

        // If last reset was NOT today, reset timeSpent
        if (lastResetDate !== today) {
            console.log("New day detected! Resetting time tracking.");
            resetTimeSpent();
        }
        }
    })
}

// Run check on extension startup
checkReset();

// Detect when a new tab becomes active
chrome.tabs.onActivated.addListener(function(activeInfo) {
    //Get the URL of the active tab
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (tab.url) startTracking(tab.id, tab.url);

    });

});

// Detect when the current tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        startTracking(tabId, changeInfo.url);
    };
});

// Detect when a tab is closed to stop tracking
chrome.tabs.onRemoved.addListener(tabId => {
    if (tabId === activeTabId) {
        clearInterval(intervalId);
        activeTabId = null;
        activeUrl = null;
        startTime = null;
    }
});