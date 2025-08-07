/**
 * Debug script to help diagnose Hivemind button injection issues
 */

(function() {
    'use strict';
    
    console.log('🔍 Hivemind Debug Script Loading...');
    
    function debugButtonInjection() {
        console.log('🔍 Starting button injection debug...');
        
        // Check if the main injection script loaded
        if (window.hivemindDebug) {
            console.log('✅ Hivemind injection script loaded successfully');
        } else {
            console.log('❌ Hivemind injection script not found');
        }
        
        // Look for various button patterns
        const buttonSelectors = [
            '[class*="sleep"]',
            '[class*="supervision"]', 
            '[class*="parallel"]',
            '[class*="infinite"]',
            'button[class*="btn"]',
            '[role="button"]',
            'button',
            '.btn',
            '[type="button"]'
        ];
        
        console.log('🔍 Searching for existing buttons...');
        
        buttonSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} elements for selector: ${selector}`);
                elements.forEach((el, idx) => {
                    console.log(`  - Element ${idx + 1}:`, el);
                    console.log(`    - Text: "${el.textContent?.trim()}")`);
                    console.log(`    - Classes: "${el.className}"`);
                    console.log(`    - Parent:`, el.parentElement);
                });
            } else {
                console.log(`❌ No elements found for selector: ${selector}`);
            }
        });
        
        // Look for text containing known button labels
        const textSelectors = [
            '*:contains("Sleep Mode")',
            '*:contains("Supervision")',
            '*:contains("Parallel Agents")',
            '*:contains("Infinite Loop")'
        ];
        
        // Since :contains is not supported in querySelector, let's use a different approach
        const allElements = document.querySelectorAll('*');
        const buttonTexts = ['Sleep Mode', 'Supervision', 'Parallel Agents', 'Infinite Loop'];
        
        console.log('🔍 Searching for button text content...');
        
        buttonTexts.forEach(text => {
            let found = false;
            allElements.forEach(el => {
                if (el.textContent && el.textContent.includes(text)) {
                    console.log(`✅ Found element with text "${text}":`, el);
                    console.log(`    - Tag: ${el.tagName}`);
                    console.log(`    - Classes: "${el.className}"`);
                    console.log(`    - Parent:`, el.parentElement);
                    found = true;
                }
            });
            if (!found) {
                console.log(`❌ No elements found with text: "${text}"`);
            }
        });
        
        // Check if Hivemind button already exists
        const hivemindButton = document.getElementById('hivemind-button');
        if (hivemindButton) {
            console.log('✅ Hivemind button found:', hivemindButton);
        } else {
            console.log('❌ Hivemind button not found');
        }
        
        // Try to manually inject button if we can find any container
        const allButtons = document.querySelectorAll('button');
        if (allButtons.length > 0) {
            console.log(`🔍 Found ${allButtons.length} total buttons, attempting manual injection...`);
            
            // Find the best container (parent of multiple buttons)
            const containers = new Map();
            allButtons.forEach(btn => {
                const parent = btn.parentElement;
                if (parent) {
                    const count = containers.get(parent) || 0;
                    containers.set(parent, count + 1);
                }
            });
            
            let bestContainer = null;
            let maxButtons = 0;
            containers.forEach((count, container) => {
                if (count > maxButtons) {
                    maxButtons = count;
                    bestContainer = container;
                }
            });
            
            if (bestContainer && maxButtons >= 2) {
                console.log(`✅ Found best button container with ${maxButtons} buttons:`, bestContainer);
                
                // Try to inject button manually
                if (!document.getElementById('hivemind-button-debug')) {
                    const debugButton = document.createElement('button');
                    debugButton.id = 'hivemind-button-debug';
                    debugButton.textContent = '🧠 Debug Hive';
                    debugButton.style.cssText = `
                        background-color: #7aa2f7;
                        color: #1a1b26;
                        border: none;
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        margin-left: 8px;
                    `;
                    debugButton.onclick = () => {
                        alert('Debug Hivemind button clicked! The injection system is working.');
                        if (window.hivemindDebug && window.hivemindDebug.openModal) {
                            window.hivemindDebug.openModal();
                        }
                    };
                    
                    bestContainer.appendChild(debugButton);
                    console.log('✅ Debug Hivemind button injected successfully!');
                }
            } else {
                console.log('❌ Could not find suitable button container');
            }
        } else {
            console.log('❌ No buttons found at all - IDE may not be loaded yet');
        }
        
        // Check for React app loading
        const reactRoot = document.getElementById('root');
        if (reactRoot) {
            console.log('✅ React root found:', reactRoot);
            if (reactRoot.children.length > 0) {
                console.log('✅ React app appears to be loaded');
            } else {
                console.log('⚠️ React root is empty - app may still be loading');
            }
        } else {
            console.log('❌ React root not found');
        }
    }
    
    // Run debug immediately and also after delays
    debugButtonInjection();
    
    setTimeout(debugButtonInjection, 2000);
    setTimeout(debugButtonInjection, 5000);
    setTimeout(debugButtonInjection, 10000);
    
    // Also run when DOM changes
    if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                setTimeout(debugButtonInjection, 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ DOM mutation observer started');
    }
    
    // Expose debug functions globally
    window.hivemindDebugTools = {
        debugButtonInjection,
        forceInject: () => {
            debugButtonInjection();
        }
    };
    
    console.log('🔍 Hivemind debug tools ready! Use window.hivemindDebugTools.forceInject() to retry injection');
    
})();