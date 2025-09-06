// Popup script for Coder1 Component Capture extension

const CODER1_BACKEND = 'http://localhost:3000';

// Check backend connection status
async function checkBackendStatus() {
    const statusEl = document.getElementById('status');
    
    try {
        const response = await fetch(`${CODER1_BACKEND}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            statusEl.textContent = 'Connected';
            statusEl.className = 'status connected';
            return true;
        }
    } catch (error) {
        console.error('Backend connection failed:', error);
    }
    
    statusEl.textContent = 'Disconnected';
    statusEl.className = 'status disconnected';
    return false;
}

// Load statistics
async function loadStats() {
    // Load from chrome storage
    chrome.storage.local.get(['componentCount', 'lastCapture'], (data) => {
        document.getElementById('component-count').textContent = data.componentCount || 0;
        
        if (data.lastCapture) {
            const date = new Date(data.lastCapture);
            const timeAgo = getTimeAgo(date);
            document.getElementById('last-capture').textContent = timeAgo;
        } else {
            document.getElementById('last-capture').textContent = 'Never';
        }
    });
    
    // Try to get real count from backend
    const connected = await checkBackendStatus();
    if (connected) {
        try {
            const response = await fetch(`${CODER1_BACKEND}/components-beta/api/list`);
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('component-count').textContent = data.total;
                chrome.storage.local.set({ componentCount: data.total });
            }
        } catch (error) {
            console.error('Failed to load component count:', error);
        }
    }
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

// Start capture mode
document.getElementById('capture-btn').addEventListener('click', async () => {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        console.log('[Coder1 Popup] Sending startCapture to tab:', tab.id);
        
        // Send message to content script to start capture
        chrome.tabs.sendMessage(tab.id, { action: 'startCapture' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Coder1 Popup] Error sending message:', chrome.runtime.lastError);
                alert('Error: Could not start capture mode. Make sure you\'re on a regular webpage (not chrome:// or file:// URLs)');
                return;
            }
            console.log('[Coder1 Popup] Response from content script:', response);
        });
        
        // Close popup after a small delay
        setTimeout(() => window.close(), 100);
    } catch (error) {
        console.error('[Coder1 Popup] Error in capture button:', error);
        alert('Error starting capture mode: ' + error.message);
    }
});

// Open component library
document.getElementById('open-library').addEventListener('click', () => {
    chrome.tabs.create({
        url: `${CODER1_BACKEND}/components-beta`
    });
    window.close();
});

// Open settings (placeholder)
document.getElementById('settings').addEventListener('click', () => {
    alert('Settings coming soon! For now, the extension automatically connects to localhost:3000');
});

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    
    // Refresh stats every 2 seconds while popup is open
    const interval = setInterval(loadStats, 2000);
    
    // Clean up when popup closes
    window.addEventListener('unload', () => {
        clearInterval(interval);
    });
});