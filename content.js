//listen for messages from background.js
let blockingScreenActive = false;

chrome.storage.local.get(['settings'], function(result) {
    let settings = result.settings
    if (settings.sites && //check if settings.sites variable exists
        settings.sites.some(s=> (window.location.href.includes(s.url) && (s.timeSpent >= s.timeLimit))) //check if the site needs to be blocked
        && !blockingScreenActive) { //if the blocking overlay is already active, then dont inject it again
          showBlockingOverlay();
    }
})

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "showBlockingScreen" && !blockingScreenActive) {
      showBlockingOverlay();
    }
    
})

function showBlockingOverlay() {
    blockingScreenActive = true;

    const overlay = document.createElement('div');
    overlay.id = 'stop-bro-overlay';
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(15px);
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;;
    `

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .stop-bro-button {
      display: block;
      width: 100%;
      height: auto;
      padding: 6px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      margin-bottom: 12px;
    }
    .stop-bro-primary {
      background: #3B82F6;
      color: white;
    }
    .stop-bro-primary:hover {
      background: #2563EB;
    }
    .stop-bro-secondary {
      background: rgba(0, 0, 0, 0.05);
      color: #111827;
    }
    .stop-bro-secondary:hover {
      background: rgba(0, 0, 0, 0.1);
    }
    .stop-bro-progress {
      width: 100%;
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      margin: 12px 0;
      overflow: hidden;
    }
    .stop-bro-progress-bar {
      height: 100%;
      background: #3B82F6;
      width: 100%;
      transition: width 1s linear;
    }
    .stop-bro-modal {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 85%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.2);
      animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
    }
    `;
    document.head.appendChild(style);

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'stop-bro-modal';
  
    // Add content to modal
    const domain = window.location.hostname;

    const mainContent = document.createElement('div');
    mainContent.id = 'stop-bro-main-content';
    mainContent.innerHTML = `
    <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 2s infinite;">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    </div>
    <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color:rgba(53, 53, 53, 0.91)">Stop Bro</h2>
    <p style="font-size: 16px; color: #4B5563; margin-bottom: 24px;">You've reached your time limit for ${domain}</p>

    <button id="stop-bro-continue" class="stop-bro-button stop-bro-secondary">Continue to site</button>
    <button id="stop-bro-close" class="stop-bro-button stop-bro-primary">Close this tab</button>
    `
    // Confirmation screen content
  const confirmationContent = document.createElement('div');
  confirmationContent.id = 'stop-bro-confirmation';
  confirmationContent.style.display = 'none';
  confirmationContent.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); display: flex; align-items: center; justify-content: center; margin-right: 12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div style="text-align: left;">
        <h3 style="font-size: 18px; font-weight: 500; margin-bottom: 4px; color: rgba(53, 53, 53, 0.91);">Are you sure bro?</h3>
        <p style="font-size: 14px; color: #4B5563; margin: 0;">Taking a break might be better for your focus.</p>
      </div>
    </div>
    
    <div class="stop-bro-progress">
      <div id="stop-bro-countdown-bar" class="stop-bro-progress-bar"></div>
    </div>
    <p id="stop-bro-countdown-text" style="font-size: 12px; color: #6B7280; margin-bottom: 20px; text-align: center;">Will continue in 10 seconds...</p>
    
    <button id="stop-bro-back" class="stop-bro-button stop-bro-secondary">Go back</button>
    <p style="font-size: 11px; color: #6B7280; margin-top: 8px; text-align: center; font-style: italic;">"A person who lacks purpose distracts themselves with pleasure."</p>
  `;

    // Append overlay to website
    modal.appendChild(mainContent);
    modal.appendChild(confirmationContent);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let countdownInterval;
    let countdown = 10;

    function startCountdown() {
      const countdownBar = document.getElementById('stop-bro-countdown-bar');
      const countdownText = document.getElementById('stop-bro-countdown-text');

      countdown = 10;
      countdownBar.style.width = '100%';

      countdownInterval = setInterval(() => {
        countdown--;
        
        countdownText.textContent = `Will continue in ${countdown} seconds...`;
        countdownBar.style.width = (countdown / 10 * 100) + '%';
        
        if (countdown <= 0) {
          stopCountdown();
          overlay.style.display = 'none';
          startExtraTimeTracking();
        }
      }, 1000); //run every second
    }

    function stopCountdown() {
      clearInterval(countdownInterval);
    }

    function startExtraTimeTracking() {
      
    }

    //Event Listeners
    document.getElementById('stop-bro-close').addEventListener('click', function() {
      chrome.runtime.sendMessage({ action: "closeTab" });
    });

    document.getElementById('stop-bro-continue').addEventListener('click', function() {
      mainContent.style.display = 'none';
      confirmationContent.style.display = 'block';
      startCountdown();
    })
    
    document.getElementById('stop-bro-back').addEventListener('click', function() {
      confirmationContent.style.display = 'none';
      mainContent.style.display = 'block';
      stopCountdown()
    })
}