// Coder1 Component Capture - Enhanced Content Script
// VERSION: 2025-12-10 - Full CSS capture with animations and pseudo-states

console.log('[Coder1 Capture] Enhanced content script loaded');

// ============================================================================
// CAPTURE CONFIGURATION
// ============================================================================
const CAPTURE_CONFIG = {
  MAX_DEPTH: 10,           // Max recursive depth for children
  MAX_ELEMENTS: 500,       // Max elements to process
  FETCH_TIMEOUT: 3000,     // Timeout for external CSS fetch (ms)
  CRITICAL_PROPERTIES: [
    // Layout
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'box-sizing', 'overflow', 'overflow-x', 'overflow-y',
    // Flexbox
    'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap',
    // Grid
    'grid-template-columns', 'grid-template-rows', 'grid-gap',
    // Background (including gradients!)
    'background', 'background-color', 'background-image', 'background-size',
    'background-position', 'background-repeat', 'background-clip',
    // Border
    'border', 'border-radius', 'border-color', 'border-width', 'border-style',
    // Visual
    'box-shadow', 'text-shadow', 'opacity', 'filter', 'backdrop-filter',
    // Typography
    'color', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
    // Animation & Transform
    'transform', 'transform-origin', 'transition', 'animation', 'animation-name',
    'animation-duration', 'animation-timing-function', 'animation-delay',
    'animation-iteration-count', 'animation-direction', 'animation-fill-mode',
    // Other
    'z-index', 'cursor', 'pointer-events', 'user-select', 'visibility',
    'clip-path', 'object-fit', 'object-position'
  ]
};

// ============================================================================
// STYLE EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract computed styles from an element and its children recursively
 * @param {HTMLElement} element - Target element
 * @param {number} depth - Current recursion depth
 * @param {Object} elementIndex - Counter object for element tracking
 * @returns {string} CSS string with all extracted styles
 */
function extractElementStyles(element, depth = 0, elementIndex = { count: 0 }) {
  // Safety limits to prevent performance issues
  if (depth > CAPTURE_CONFIG.MAX_DEPTH || elementIndex.count > CAPTURE_CONFIG.MAX_ELEMENTS) {
    return depth > CAPTURE_CONFIG.MAX_DEPTH
      ? '/* Max depth reached */\n'
      : '/* Max elements reached */\n';
  }

  elementIndex.count++;

  try {
    const computed = window.getComputedStyle(element);
    const tagName = element.tagName?.toLowerCase() || 'unknown';
    const className = `coder1-el-${depth}-${elementIndex.count}`;

    // Build CSS for this element
    let css = `/* ${tagName}${element.className ? '.' + element.className.split(' ')[0] : ''} */\n`;
    css += `.${className} {\n`;

    for (const prop of CAPTURE_CONFIG.CRITICAL_PROPERTIES) {
      const value = computed.getPropertyValue(prop);
      // Only include non-default, non-empty values
      if (value &&
          value !== 'none' &&
          value !== 'normal' &&
          value !== 'auto' &&
          value !== '0px' &&
          value !== '0s' &&
          value !== 'rgba(0, 0, 0, 0)' &&
          value !== 'rgb(0, 0, 0)' &&
          value !== 'start' &&
          value !== 'visible') {
        css += `  ${prop}: ${value};\n`;
      }
    }
    css += '}\n\n';

    // Recursively process children
    for (const child of element.children) {
      css += extractElementStyles(child, depth + 1, elementIndex);
    }

    return css;
  } catch (error) {
    console.warn('[Coder1 Capture] Error extracting styles:', error);
    return `/* Error extracting styles for element ${elementIndex.count} */\n`;
  }
}

/**
 * Extract @keyframes rules and pseudo-state styles from stylesheets
 * @param {HTMLElement} element - Target element
 * @returns {Object} Object containing keyframesCSS, pseudoCSS arrays and animationNames Set
 */
function extractKeyframesAndPseudoStates(element) {
  const animationNames = new Set();
  const keyframesCSS = [];
  const pseudoCSS = [];
  const processedSelectors = new Set();

  // Recursively collect all animation names used by element and children
  function collectAnimationNames(el) {
    try {
      const computed = window.getComputedStyle(el);
      const animName = computed.animationName;
      if (animName && animName !== 'none') {
        // Handle multiple animations separated by comma
        animName.split(',').forEach(name => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== 'none') {
            animationNames.add(trimmed);
          }
        });
      }
      // Recurse into children
      for (const child of el.children) {
        collectAnimationNames(child);
      }
    } catch (e) {
      // Silently continue
    }
  }
  collectAnimationNames(element);

  console.log('[Coder1 Capture] Found animation names:', Array.from(animationNames));

  // Parse all accessible stylesheets
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;

      for (const rule of rules) {
        // Capture @keyframes rules
        if (rule.type === CSSRule.KEYFRAMES_RULE) {
          if (animationNames.has(rule.name)) {
            keyframesCSS.push(rule.cssText);
            console.log('[Coder1 Capture] Found @keyframes:', rule.name);
          }
        }

        // Capture hover/focus/active pseudo-state rules
        if (rule.type === CSSRule.STYLE_RULE) {
          const selector = rule.selectorText;
          if (selector && (
            selector.includes(':hover') ||
            selector.includes(':focus') ||
            selector.includes(':active') ||
            selector.includes(':focus-visible') ||
            selector.includes(':focus-within')
          )) {
            // Avoid duplicates
            if (processedSelectors.has(rule.cssText)) continue;

            try {
              // Extract base selector (before the pseudo-class)
              const baseSelector = selector.split(':')[0].trim();
              // Check if this rule might apply to our element
              if (baseSelector && (
                element.matches(baseSelector) ||
                element.querySelector(baseSelector)
              )) {
                processedSelectors.add(rule.cssText);
                pseudoCSS.push(rule.cssText);
                console.log('[Coder1 Capture] Found pseudo-state rule:', selector);
              }
            } catch (e) {
              // Invalid selector, skip
            }
          }
        }
      }
    } catch (e) {
      // Cross-origin stylesheet - cannot access rules
      if (sheet.href) {
        console.debug('[Coder1 Capture] Cannot access cross-origin stylesheet:', sheet.href);
      }
    }
  }

  return { keyframesCSS, pseudoCSS, animationNames };
}

/**
 * Attempt to fetch external CSS files to extract @keyframes
 * @param {Set} animationNames - Set of animation names to look for
 * @returns {Promise<string>} CSS string with found @keyframes
 */
async function fetchExternalKeyframes(animationNames) {
  if (animationNames.size === 0) return '';

  // Find external stylesheets that we couldn't access (CORS-blocked)
  const externalSheets = [];
  for (const sheet of document.styleSheets) {
    if (sheet.href) {
      try {
        // Try to access rules - if it fails, it's cross-origin
        const _ = sheet.cssRules;
      } catch (e) {
        externalSheets.push(sheet.href);
      }
    }
  }

  if (externalSheets.length === 0) return '';

  console.log('[Coder1 Capture] Attempting to fetch external stylesheets:', externalSheets.slice(0, 3));

  let externalKeyframes = '';

  // Limit to first 3 external sheets to avoid performance issues
  for (const href of externalSheets.slice(0, 3)) {
    try {
      const response = await new Promise((resolve) => {
        const timeoutId = setTimeout(() => resolve(null), CAPTURE_CONFIG.FETCH_TIMEOUT);

        chrome.runtime.sendMessage({ action: 'fetchCSS', url: href }, (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      });

      if (response?.success && response.css) {
        // Extract @keyframes using regex
        // Match: @keyframes name { ... } (including nested braces)
        const keyframeRegex = /@keyframes\s+([\w-]+)\s*\{([^{}]*(\{[^{}]*\}[^{}]*)*)\}/g;
        let match;

        while ((match = keyframeRegex.exec(response.css)) !== null) {
          const name = match[1];
          if (animationNames.has(name)) {
            externalKeyframes += match[0] + '\n\n';
            console.log('[Coder1 Capture] Found external @keyframes:', name);
          }
        }
      }
    } catch (e) {
      console.debug('[Coder1 Capture] Failed to fetch external CSS:', href, e);
    }
  }

  return externalKeyframes;
}

// ============================================================================
// ORIGINAL SCRIPT CONTINUES
// ============================================================================

console.log('[Coder1 Capture] Extension version: 2.0.0 - ENHANCED');
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

// Handle simple click - now with full CSS extraction
async function handleSimpleClick(e) {
    if (!captureMode) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    console.log('[Coder1 Capture] Element clicked:', element);
    console.log('[Coder1 Capture] Extracting full styles...');

    try {
        const html = element.outerHTML || '<div>Could not capture HTML</div>';
        const tagName = element.tagName ? element.tagName.toLowerCase() : 'unknown';
        const title = `${tagName} element`;

        // Extract computed styles from element and children
        const computedCSS = extractElementStyles(element);

        // Extract @keyframes and pseudo-state rules
        const { keyframesCSS, pseudoCSS, animationNames } = extractKeyframesAndPseudoStates(element);

        // If we found animation names but no keyframes, try fetching external CSS
        let externalCSS = '';
        if (animationNames.size > 0 && keyframesCSS.length === 0) {
            console.log('[Coder1 Capture] Attempting to fetch external @keyframes...');
            externalCSS = await fetchExternalKeyframes(animationNames);
        }

        // Combine all CSS
        let fullCSS = '/* ========== COMPUTED STYLES ========== */\n';
        fullCSS += computedCSS;

        if (keyframesCSS.length > 0) {
            fullCSS += '\n/* ========== @KEYFRAMES ANIMATIONS ========== */\n';
            fullCSS += keyframesCSS.join('\n\n');
        }

        if (externalCSS) {
            fullCSS += '\n/* ========== EXTERNAL @KEYFRAMES ========== */\n';
            fullCSS += externalCSS;
        }

        if (pseudoCSS.length > 0) {
            fullCSS += '\n/* ========== HOVER/FOCUS/ACTIVE STATES ========== */\n';
            fullCSS += pseudoCSS.join('\n\n');
        }

        console.log('[Coder1 Capture] CSS extraction complete. Total length:', fullCSS.length);
        console.log('[Coder1 Capture] Sending capture data...');

        // Send to background script with full CSS
        chrome.runtime.sendMessage({
            action: 'captureComponent',
            html: html,
            css: fullCSS,
            url: window.location.href,
            title: title,
            selector: tagName,
            screenshot: null
        }, response => {
            console.log('[Coder1 Capture] Response:', response);
            endSimpleCaptureMode();

            if (response && response.success) {
                showSimpleMessage('✅ Component captured with full styles!');
            } else {
                showSimpleMessage('❌ Capture failed: ' + (response?.error || 'Unknown error'));
            }
        });

    } catch (error) {
        console.error('[Coder1 Capture] Capture error:', error);
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