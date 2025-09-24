// Coder1 Component Capture - Simplified Content Script
// VERSION: 2025-09-24-SIMPLE - Ultra-minimal approach

console.log('[Coder1 Capture] Simple content script loaded');
console.log('[Coder1 Capture] Extension version: 1.2.3 - CLEANED');
console.log('[Coder1 Capture] Page URL:', window.location.href);
console.log('[Coder1 Capture] Document ready state:', document.readyState);
console.log('[Coder1 Capture] Chrome runtime available:', typeof chrome !== 'undefined' && !!chrome.runtime);
console.log('[Coder1 Capture] Extension ID:', chrome?.runtime?.id);

// Test connection to background script on load
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    try {
        chrome.runtime.sendMessage({action: 'contentScriptLoaded', url: window.location.href}, (response) => {
            if (chrome.runtime.lastError) {
                // This is expected on extension pages or when extension is reloading
                // Don't log as error, just debug info
                console.debug('[Coder1 Capture] Background connection not ready (this is normal on some pages)');
            } else {
                console.log('[Coder1 Capture] ✅ Successfully connected to background script');
            }
        });
    } catch (e) {
        // Silently ignore - this happens on extension pages
        console.debug('[Coder1 Capture] Extension communication not available on this page');
    }
}

let captureMode = false;
let highlightedElement = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Coder1 Capture] Message received:', request);
    if (request.action === 'startCapture') {
        console.log('[Coder1 Capture] Starting simple capture mode...');
        startSimpleCaptureMode();
        sendResponse({status: 'simple capture mode started'});
    }
    return true;
});

// Simple capture mode - no complex DOM operations
function startSimpleCaptureMode() {
    if (!document || !document.body) {
        console.error('[Coder1 Capture] Document not ready');
        return;
    }
    
    captureMode = true;
    console.log('[Coder1 Capture] Simple capture active! Click on any element.');
    
    // Add simple event listeners
    document.addEventListener('click', handleSimpleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    
    // Add simple visual indicator
    document.body.style.cursor = 'crosshair';
}

// Handle simple click - minimal processing
function handleSimpleClick(e) {
    if (!captureMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[Coder1 Capture] Element clicked:', e.target);
    
    try {
        // Get basic element info without complex processing
        const element = e.target;
        const html = element.outerHTML || '<div>Could not capture HTML</div>';
        const tagName = element.tagName ? element.tagName.toLowerCase() : 'unknown';
        const title = `${tagName} element`;
        
        console.log('[Coder1 Capture] Sending simple capture data...');
        
        // Send to background script with minimal data
        chrome.runtime.sendMessage({
            action: 'captureComponent',
            html: html,
            css: `/* Basic styles for ${tagName} */\n.captured-component { display: block; }`,
            url: window.location.href,
            title: title,
            selector: tagName,
            screenshot: null
        }, response => {
            console.log('[Coder1 Capture] Response:', response);
            endSimpleCaptureMode();
            
            if (response && response.success) {
                showSimpleMessage('✅ Component captured successfully!');
            } else {
                showSimpleMessage('❌ Capture failed: ' + (response?.error || 'Unknown error'));
            }
        });
        
    } catch (error) {
        console.error('[Coder1 Capture] Simple capture error:', error);
        showSimpleMessage('❌ Capture failed: ' + error.message);
        endSimpleCaptureMode();
    }
}

// End simple capture mode
function endSimpleCaptureMode() {
    captureMode = false;
    document.removeEventListener('click', handleSimpleClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.cursor = '';
}

// Handle escape key
function handleKeyDown(e) {
    if (e.key === 'Escape') {
        endSimpleCaptureMode();
        showSimpleMessage('Capture cancelled');
    }
}

// Show simple message without complex UI
function showSimpleMessage(message) {
    console.log('[Coder1 Capture] ' + message);
    
    // Create simple alert-style message
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 999999;
        font-size: 14px;
        max-width: 300px;
    `;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}