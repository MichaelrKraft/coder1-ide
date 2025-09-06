// Coder1 Component Capture - Content Script

let captureMode = false;
let highlightedElement = null;
let overlay = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Coder1 Capture] Message received:', request);
    if (request.action === 'startCapture') {
        console.log('[Coder1 Capture] Starting capture mode...');
        startCaptureMode();
        sendResponse({status: 'capture mode started'});
    }
    return true; // Keep message channel open
});

// Start capture mode
function startCaptureMode() {
    console.log('[Coder1 Capture] Capture mode activating...');
    
    // Check if document is ready
    if (!document || !document.body) {
        console.error('[Coder1 Capture] Document not ready, retrying in 100ms...');
        setTimeout(startCaptureMode, 100);
        return;
    }
    
    captureMode = true;
    createOverlay();
    
    // Safely add event listeners
    try {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown);
        console.log('[Coder1 Capture] Capture mode active! Click on any element to capture it.');
    } catch (error) {
        console.error('[Coder1 Capture] Error adding event listeners:', error);
    }
}

// End capture mode
function endCaptureMode() {
    captureMode = false;
    removeOverlay();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    
    if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement = null;
    }
}

// Create overlay UI
function createOverlay() {
    try {
        // Remove existing overlay if any
        if (overlay) {
            overlay.remove();
        }
        
        overlay = document.createElement('div');
        overlay.className = 'coder1-capture-overlay';
        overlay.innerHTML = `
            <div class="coder1-capture-info">
                <div class="coder1-capture-title">Component Capture Mode</div>
                <div class="coder1-capture-instructions">
                    Click on any element to capture it | Press ESC to cancel
                </div>
                <div class="coder1-capture-element-info" id="element-info"></div>
            </div>
        `;
        
        if (document.body) {
            document.body.appendChild(overlay);
            console.log('[Coder1 Capture] Overlay created successfully');
        } else {
            console.error('[Coder1 Capture] Cannot create overlay - document.body not available');
        }
    } catch (error) {
        console.error('[Coder1 Capture] Error creating overlay:', error);
    }
}

// Remove overlay UI
function removeOverlay() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
}

// Handle mouse movement
function handleMouseMove(e) {
    if (!captureMode) return;
    
    // Remove previous highlight
    if (highlightedElement) {
        highlightedElement.style.outline = '';
    }
    
    // Highlight element under cursor
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element && element !== overlay && !overlay.contains(element)) {
        highlightedElement = element;
        highlightedElement.style.outline = '2px solid #00D9FF';
        
        // Update element info
        const info = document.getElementById('element-info');
        if (info) {
            const tagName = element.tagName.toLowerCase();
            const className = element.className ? `.${element.className.split(' ')[0]}` : '';
            const id = element.id ? `#${element.id}` : '';
            info.textContent = `${tagName}${id}${className}`;
        }
    }
}

// Handle click to capture
function handleClick(e) {
    console.log('[Coder1 Capture] Click detected, captureMode:', captureMode);
    if (!captureMode) return;
    if (overlay && overlay.contains(e.target)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[Coder1 Capture] Capturing element:', highlightedElement);
    if (highlightedElement) {
        captureElement(highlightedElement);
    }
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
    if (e.key === 'Escape') {
        endCaptureMode();
    }
}

// Capture the selected element
function captureElement(element) {
    console.log('[Coder1 Capture] Starting element capture...');
    
    // Show loading message
    const loadingMessage = showLoadingMessage();
    
    try {
        // Get element HTML
        const html = element.outerHTML;
        
        // Get computed styles
        const css = extractCSS(element);
        
        // Generate a title for the component
        const title = generateTitle(element);
        
        // Create a unique selector for the element
        const selector = generateSelector(element);
        
        // Take screenshot (optional, requires additional permissions)
        const screenshot = null; // TODO: Implement screenshot capture
        
        console.log('[Coder1 Capture] Sending component data to background script...');
        console.log('[Coder1 Capture] Component title:', title);
        console.log('[Coder1 Capture] HTML length:', html.length);
        console.log('[Coder1 Capture] CSS length:', css.length);
        
        // Send to background script
        chrome.runtime.sendMessage({
            action: 'captureComponent',
            html: html,
            css: css,
            url: window.location.href,
            title: title,
            selector: selector,
            screenshot: screenshot
        }, response => {
            // Remove loading message
            if (loadingMessage && loadingMessage.parentNode) {
                loadingMessage.remove();
            }
            
            console.log('[Coder1 Capture] Response from background:', response);
            
            if (response && response.success) {
                console.log('[Coder1 Capture] Capture successful!');
                showSuccessMessage();
            } else {
                console.error('[Coder1 Capture] Capture failed:', response);
                showErrorMessage(response ? response.error : 'Unknown error occurred');
            }
            endCaptureMode();
        });
        
    } catch (error) {
        // Remove loading message
        if (loadingMessage && loadingMessage.parentNode) {
            loadingMessage.remove();
        }
        
        console.error('[Coder1 Capture] Error during capture:', error);
        showErrorMessage('Failed to capture component: ' + error.message);
        endCaptureMode();
    }
}

// Extract CSS for element and its children
function extractCSS(element) {
    const styles = window.getComputedStyle(element);
    const cssProperties = [];
    
    // Get all CSS properties
    for (let i = 0; i < styles.length; i++) {
        const property = styles[i];
        const value = styles.getPropertyValue(property);
        
        // Skip default values and inherited properties
        if (value && value !== 'initial' && value !== 'inherit' && value !== 'unset') {
            // Skip browser-specific properties
            if (!property.startsWith('-webkit-') && !property.startsWith('-moz-')) {
                cssProperties.push(`${property}: ${value};`);
            }
        }
    }
    
    // Also extract CSS for child elements
    const childStyles = [];
    const children = element.querySelectorAll('*');
    children.forEach((child, index) => {
        const childStyle = window.getComputedStyle(child);
        const childCss = [];
        
        for (let i = 0; i < childStyle.length; i++) {
            const property = childStyle[i];
            const value = childStyle.getPropertyValue(property);
            
            if (value && value !== 'initial' && value !== 'inherit' && value !== 'unset') {
                if (!property.startsWith('-webkit-') && !property.startsWith('-moz-')) {
                    childCss.push(`  ${property}: ${value};`);
                }
            }
        }
        
        if (childCss.length > 0) {
            const selector = child.tagName.toLowerCase() + (child.className ? `.${child.className.split(' ')[0]}` : '');
            childStyles.push(`.captured-component ${selector} {\n${childCss.join('\n')}\n}`);
        }
    });
    
    // Combine all CSS
    let finalCSS = '.captured-component {\n  ' + cssProperties.join('\n  ') + '\n}';
    if (childStyles.length > 0) {
        finalCSS += '\n\n' + childStyles.join('\n\n');
    }
    
    return finalCSS;
}

// Generate a title for the component
function generateTitle(element) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? element.className.split(' ')[0] : '';
    const id = element.id || '';
    const text = element.textContent?.substring(0, 30) || '';
    
    if (id) {
        return `${tagName}#${id}`;
    } else if (className) {
        return `${tagName}.${className}`;
    } else if (text) {
        return `${tagName}: ${text}...`;
    } else {
        return tagName;
    }
}

// Generate a unique selector for the element
function generateSelector(element) {
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.tagName.toLowerCase();
        
        if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
        } else if (current.className) {
            selector += `.${current.className.split(' ').join('.')}`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
    }
    
    return path.join(' > ');
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'coder1-capture-success';
    message.innerHTML = `
        <div style="font-weight: bold;">✅ Component Captured!</div>
        <div>Saved to your Coder1 component library</div>
    `;
    document.body.appendChild(message);
    
    // Also show browser notification if permission granted
    if (Notification.permission === 'granted') {
        new Notification('Coder1 Component Capture', {
            body: 'Component captured successfully!',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%2300D9FF"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="30">📦</text></svg>'
        });
    }
    
    setTimeout(() => {
        message.remove();
    }, 4000);
}

// Show error message
function showErrorMessage(error) {
    const message = document.createElement('div');
    message.className = 'coder1-capture-error';
    message.innerHTML = `
        <div style="font-weight: bold;">❌ Capture Failed</div>
        <div>${error}</div>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 4000);
}

// Show loading message
function showLoadingMessage() {
    const message = document.createElement('div');
    message.className = 'coder1-capture-loading';
    message.innerHTML = `
        <div style="font-weight: bold;">⏳ Capturing Component...</div>
        <div>Please wait while we save your component</div>
    `;
    message.id = 'coder1-loading-message';
    document.body.appendChild(message);
    return message;
}