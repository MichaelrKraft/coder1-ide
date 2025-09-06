// Coder1 Component Capture - Background Service Worker

const CODER1_BACKEND = 'http://localhost:3000';

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'capture-component',
        title: 'Capture to Coder1',
        contexts: ['all']
    });
    
    console.log('Coder1 Component Capture extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('[Coder1 Background] Context menu clicked:', info.menuItemId);
    if (info.menuItemId === 'capture-component') {
        // Send message to content script to start capture
        console.log('[Coder1 Background] Sending startCapture to tab:', tab.id);
        chrome.tabs.sendMessage(tab.id, {
            action: 'startCapture'
        }, (response) => {
            console.log('[Coder1 Background] Response from content script:', response);
        });
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureComponent') {
        // Send captured component to Coder1 backend
        fetch(`${CODER1_BACKEND}/components-beta/api/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: request.html,
                css: request.css,
                url: request.url,
                title: request.title,
                selector: request.selector,
                screenshot: request.screenshot
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('[Coder1 Background] Server response:', data);
            if (data.success) {
                console.log('[Coder1 Background] Component captured successfully:', request.title, 'ID:', data.id);
                
                sendResponse({ success: true, id: data.id, message: data.message });
                
                // Open Coder1 components page in new tab after a short delay
                setTimeout(() => {
                    chrome.tabs.create({
                        url: `${CODER1_BACKEND}/components-beta`
                    });
                }, 2000);
            } else {
                console.error('[Coder1 Background] Server error:', data.error);
                sendResponse({ success: false, error: data.error || 'Server returned an error' });
            }
        })
        .catch(error => {
            console.error('[Coder1 Background] Network error:', error);
            sendResponse({ 
                success: false, 
                error: `Network error: ${error.message}. Make sure Coder1 backend is running on localhost:3000.`
            });
        });
        
        // Keep the message channel open for async response
        return true;
    }
    
    if (request.action === 'getBackendStatus') {
        // Check if Coder1 backend is running
        fetch(`${CODER1_BACKEND}/health`)
            .then(response => response.json())
            .then(data => {
                sendResponse({ connected: true, status: data.status });
            })
            .catch(error => {
                sendResponse({ connected: false, error: error.message });
            });
        
        return true;
    }
});