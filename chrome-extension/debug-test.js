// Debug Test for Chrome Extension Message Flow
// Add this to a webpage to test if content script is loaded

console.log('[Debug Test] Starting extension communication test...');

// Test 1: Check if content script is loaded
const testContentScript = () => {
    console.log('[Debug Test] Checking if content script is loaded...');
    
    // Look for console messages from content script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('[Debug Test] ✅ Chrome runtime available');
        
        // Try to send a message to background script
        chrome.runtime.sendMessage({action: 'test'}, (response) => {
            if (chrome.runtime.lastError) {
                console.log('[Debug Test] ❌ Background script not responding:', chrome.runtime.lastError);
            } else {
                console.log('[Debug Test] ✅ Background script responded:', response);
            }
        });
    } else {
        console.log('[Debug Test] ❌ Chrome runtime not available');
    }
};

// Test 2: Simulate right-click context menu
const simulateContextMenu = () => {
    console.log('[Debug Test] Simulating context menu action...');
    
    // This would normally be triggered by the context menu
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('[Debug Test] Message received:', request);
            if (request.action === 'startCapture') {
                console.log('[Debug Test] ✅ startCapture message received');
                sendResponse({status: 'debug test mode started'});
            }
            return true;
        });
    }
};

// Test 3: Check for Coder1 extension specifically
const checkCoder1Extension = () => {
    console.log('[Debug Test] Looking for Coder1 extension indicators...');
    
    // Check for console messages from our extension
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        if (args[0] && args[0].includes('[Coder1 Capture]')) {
            console.log('[Debug Test] ✅ Found Coder1 extension activity:', ...args);
        }
        originalConsoleLog.apply(console, args);
    };
};

// Run tests
testContentScript();
simulateContextMenu();
checkCoder1Extension();

console.log('[Debug Test] Tests initiated. Check console for results.');
console.log('[Debug Test] If you see "[Coder1 Capture] Simple content script loaded", the extension is working.');
console.log('[Debug Test] Try right-clicking and selecting "Capture to Coder1" to see if messages appear.');