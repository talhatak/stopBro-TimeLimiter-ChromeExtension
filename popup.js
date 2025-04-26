document.addEventListener('DOMContentLoaded', function() {

    const tabs = document.querySelectorAll('.tab')
    const tabContents = document.querySelectorAll('.tab-content')

    tabs.forEach(tab => {

        tab.addEventListener('click', ()=> {
            //get attribute
            const tabId = tab.getAttribute('data-tab');

            tabs.forEach(tab => tab.classList.remove('active'))
            tab.classList.add('active')

            tabContents.forEach(tabcont => {
                const id = tabcont.getAttribute('id')
                tabcont.classList.remove('active')
                if (id === `${tabId}-tab`){
                    tabcont.classList.add('active')
                }
            })
        })
    })

    // Default settings
    let settings = {
        defaultTimeLimit: 15,
        sites: [
            {url: "facebook.com", timeLimit: 15, timeSpent: 0, extraTime:0}
        ]
    };

    //fetch saved settings from chrome storage
    chrome.storage.local.get(['settings', 'lastResetDate'], function(result) {
        if (result.settings){
            settings = result.settings;

            //Update UI
            document.getElementById('timeLimit').value = settings.defaultTimeLimit;
            renderActiveWebsites();
            renderStats();
            updateInsights();
        }

        if (!result.lastResetDate) {
            let today = new Date().toDateString();
            chrome.storage.local.set({ lastResetDate: today }, function() {
            console.log("Date reset to today: ", today)
    })
        }
    });

    function renderActiveWebsites() {
        const siteLists = document.getElementById('active-websites');
        siteLists.innerHTML = '';

        settings.sites.forEach((site, index) => {
            const li = document.createElement('li');
            li.className = 'site-item';
            li.innerHTML = `
            <span class="site-url">${site.url}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="site-time">${(site.timeLimit)/60} min</span>
                <button class="delete-site" data-index="${index}" style="background: none; border: none; cursor: pointer; color: #666;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            `;
            siteLists.appendChild(li);
        })

        //Add delete event listeners for deleting time
        document.querySelectorAll('.delete-site').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            settings.sites.splice(index, 1);
            renderActiveWebsites();
            renderStats();
            updateInsights();
            
            //Update settings in the local storage
            chrome.storage.local.set({ settings })
        });
    });
    };

    function updateInsights() {
        const insightsText = document.getElementById('insights-text');
        let totalExtensions = settings.sites.reduce((sum, site) => sum + (site.extraTime > 60 ? 1 : 0), 0);
        console.log('totalExtensions:', totalExtensions)
        insightsText.innerHTML = `You've extended your time on distracting websites <span style="color: red;">${totalExtensions}</span> times today.`;
    }

    function formatTimeSpent(timeSpent) {
        let minutes = timeSpent / 60; // Convert to minutes
        return minutes < 1 ? minutes.toFixed(1) : Math.floor(minutes); // Show 1 decimal place under 1 min, else round down
    }
    
    function renderStats() {
        const statsList = document.getElementById('stats-list');
        statsList.innerHTML = '';

        settings.sites.forEach(site => {
            const progressPercent = (site.timeSpent / site.timeLimit) * 100;

            const div = document.createElement('div');
            div.className = 'stats-item';
            div.innerHTML = `
                <div style="width: 100%;">
                    <div class="stats-label">${site.url}</div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${Math.min(100, progressPercent)}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span>${formatTimeSpent(site.timeSpent + site.extraTime)} min</span>
                        <span>${site.timeLimit/60} min</span>
                    </div>
                </div>
            `;
            statsList.appendChild(div);
        });
    }

    //Add a new site
    document.getElementById('addSite').addEventListener('click', ()=> {
        const newSiteInput = document.getElementById('newSite');
        const url = newSiteInput.value.trim();

        if (url){
            //check if the site already exists
            if(!settings.sites.some(site=> site.url === url)) {
                const timeLimitInput = (parseInt(document.getElementById("timeLimit").value) || 15) * 60; //convert to seconds
                settings.sites.push({
                    url: url,
                    timeLimit: timeLimitInput,
                    timeSpent: 0,
                    extraTime: 0
                });
                console.log('new site added', settings)
                renderActiveWebsites();
                newSiteInput.value = '';
            } else {
                alert('This website is already in your list.')
            }
        }
    });

    //Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {

        chrome.storage.local.set({ settings }, function() {
            const saveBtn = document.getElementById('saveSettings');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Saved!";
            saveBtn.disabled = true;

            setTimeout(()=>{
                saveBtn.textContent = originalText;
                saveBtn.disabled=false;
            },1500);

            renderStats();
            //send message to background.js
            chrome.runtime.sendMessage({action:'settingsUpdated', settings}, function(response) {
                console.log("Message from background.js: ",response)
            })
        });
    });

    //Initial render
    renderActiveWebsites();
    renderStats();

});//DOM content loaded closing braces