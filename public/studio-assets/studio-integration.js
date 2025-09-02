/**
 * Component Studio Integration Module
 * Handles integration with the Coder1 IDE Monaco Editor
 */

// Integration state
let integrationPanel = null;
let isIntegrationEnabled = false;

// Initialize integration features
function initializeIntegration() {
    // Check if we're being accessed from the IDE
    const isFromIDE = window.opener || window.parent !== window;
    
    if (isFromIDE) {
        console.log('🔗 Component Studio: Running in IDE context, enabling integration');
        isIntegrationEnabled = true;
        addIntegrationButton();
        setupMessageListener();
        
        // Add debug helper to window for easy debugging
        window.debugStudio = () => {
            console.log('🔧 Studio Debug Info:');
            console.log('- StudioState exists:', !!window.StudioState);
            console.log('- Current component:', window.StudioState?.currentComponent);
            console.log('- Current props:', window.StudioState?.currentProps);
            console.log('- Components in library:', window.StudioState?.components?.length);
            console.log('- AI generated components:', window.ComponentLibrary?.['ai-generated']?.length);
            console.log('- Preview container has content:', !!(document.getElementById('preview-container')?.innerHTML?.trim()));
            const previewContainer = document.getElementById('preview-container');
            console.log('- Preview container length:', previewContainer?.innerHTML?.length || 0);
            console.log('- Integration button exists:', !!document.getElementById('integrate-btn'));
        };
        
        // Enable debug mode with more verbose logging
        window.enableIntegrationDebug = () => {
            window.debugMode = true;
            console.log('🔧 Integration debug mode enabled');
        };
        
        // Manual button update trigger
        window.updateIntegrationButton = () => {
            const button = document.getElementById('integrate-btn');
            if (button) {
                console.log('🔧 Manual button update triggered');
                updateIntegrationButtonState(button);
            } else {
                console.log('🔧 Integration button not found');
            }
        };
        
        // Notify IDE that component studio is ready
        sendIntegrationMessage({ action: 'studio-ready' });
    }
}

// Add integration button to the UI
function addIntegrationButton() {
    console.log('🔧 Integration: Attempting to add integration button...');
    
    // Try multiple selectors to find a good place to add the button
    const selectors = [
        '#export-btn',
        '.revision-controls button',
        '.studio-header button',
        '.toolbar button'
    ];
    
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        console.log(`🔧 Integration: Button placement attempt ${attempts}`);
        
        let targetElement = null;
        let targetParent = null;
        
        // Try to find a suitable parent element
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.parentElement) {
                targetElement = element;
                targetParent = element.parentElement;
                console.log(`🔧 Integration: Found target element with selector: ${selector}`);
                break;
            }
        }
        
        // Fallback: try to find any button container
        if (!targetParent) {
            const buttonContainers = document.querySelectorAll('.revision-controls, .toolbar, .actions, .controls');
            if (buttonContainers.length > 0) {
                targetParent = buttonContainers[0];
                console.log('🔧 Integration: Using fallback button container');
            }
        }
        
        // Last resort: add to body with fixed positioning
        if (!targetParent && attempts > 50) {
            targetParent = document.body;
            console.log('🔧 Integration: Using body as last resort');
        }
        
        if (targetParent || attempts > 100) {
            clearInterval(checkInterval);
            
            if (!targetParent) {
                console.error('❌ Integration: Could not find suitable parent for integration button');
                return;
            }
            
            // Check if button already exists
            if (document.getElementById('integrate-btn')) {
                console.log('🔧 Integration: Button already exists, skipping creation');
                return;
            }
            
            const integrateBtn = document.createElement('button');
            integrateBtn.id = 'integrate-btn';
            integrateBtn.className = 'action-button integrate-button';
            integrateBtn.innerHTML = '🚀 Select Component First';
            
            // Different styling based on parent
            if (targetParent === document.body) {
                integrateBtn.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                `;
            } else {
                integrateBtn.style.cssText = `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    margin-left: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                `;
            }
            
            // Add hover effects
            integrateBtn.addEventListener('mouseover', () => {
                integrateBtn.style.transform = 'scale(1.05)';
                integrateBtn.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
            });
            
            integrateBtn.addEventListener('mouseout', () => {
                integrateBtn.style.transform = 'scale(1)';
                if (targetParent === document.body) {
                    integrateBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                } else {
                    integrateBtn.style.boxShadow = 'none';
                }
            });
            
            integrateBtn.addEventListener('click', handleIntegrateClick);
            
            // Update button state periodically
            const buttonUpdateInterval = setInterval(() => {
                updateIntegrationButtonState(integrateBtn);
            }, 1000);
            
            // Force immediate update
            setTimeout(() => {
                updateIntegrationButtonState(integrateBtn);
            }, 100);
            
            // Clean up interval if button is removed
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node === integrateBtn) {
                            clearInterval(buttonUpdateInterval);
                            observer.disconnect();
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Add the button
            targetParent.appendChild(integrateBtn);
            console.log('✅ Integration button added to UI');
            
            // Initial button state update
            updateIntegrationButtonState(integrateBtn);
            
            // Listen for AI generation events to update button state
            const originalConsoleLog = console.log;
            console.log = function(...args) {
                originalConsoleLog.apply(console, args);
                
                // Check if this is an AI generation completion log
                const message = args.join(' ');
                if (message.includes('AI-generated components:') || 
                    message.includes('Total AI components now:') ||
                    message.includes('Component generated')) {
                    setTimeout(() => {
                        console.log('🔧 Integration: Updating button state after AI generation');
                        updateIntegrationButtonState(integrateBtn);
                    }, 500);
                }
            };
        }
    }, 200); // Increased interval for better reliability
}

// Update integration button state based on available content
function updateIntegrationButtonState(button) {
    if (!button) {
        console.log('🔧 Integration: Button not found for state update');
        return;
    }
    
    const hasCurrentComponent = !!(window.StudioState?.currentComponent);
    const hasAiComponents = !!(window.ComponentLibrary?.['ai-generated']?.length > 0);
    const previewContainer = document.getElementById('preview-container');
    const hasPreview = !!(previewContainer?.innerHTML?.trim() && 
                         !previewContainer.innerHTML.includes('loading-spinner') &&
                         previewContainer.innerHTML.length > 100);
    
    // Always log for debugging since this is the key issue
    console.log('🔧 Integration: Button State Update:', {
        hasCurrentComponent,
        hasAiComponents: hasAiComponents,
        aiComponentsCount: window.ComponentLibrary?.['ai-generated']?.length || 0,
        hasPreview,
        previewLength: previewContainer?.innerHTML?.length || 0,
        currentButtonText: button.innerHTML
    });
    
    const hasContent = hasCurrentComponent || hasAiComponents || hasPreview;
    
    if (hasContent) {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        
        if (hasCurrentComponent) {
            button.innerHTML = '🚀 Integrate Component';
            console.log('🔧 Integration: Button text set to "Integrate Component"');
        } else if (hasAiComponents) {
            button.innerHTML = '🚀 Integrate Latest Component';
            console.log('🔧 Integration: Button text set to "Integrate Latest Component"');
        } else {
            button.innerHTML = '🚀 Integrate Preview';
            console.log('🔧 Integration: Button text set to "Integrate Preview"');
        }
    } else {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.innerHTML = '🚀 Generate Component First';
        console.log('🔧 Integration: Button text set to "Generate Component First"');
    }
}

// Handle integration button click
function handleIntegrateClick() {
    // Refresh the studio state first
    refreshStudioState();
    
    console.log('🔧 Integration: Button clicked, checking state...');
    console.log('🔧 Integration: StudioState exists:', !!window.StudioState);
    console.log('🔧 Integration: Current component:', window.StudioState?.currentComponent);
    
    // Check multiple ways to get component
    let component = null;
    let code = '';
    
    if (window.StudioState?.currentComponent) {
        component = window.StudioState.currentComponent;
        console.log('🔧 Integration: Found component in StudioState:', component.name);
    } else {
        // Try to find the most recent AI generated component
        const aiComponents = window.ComponentLibrary?.['ai-generated'];
        if (aiComponents && aiComponents.length > 0) {
            component = aiComponents[aiComponents.length - 1]; // Get the last one
            console.log('🔧 Integration: Using latest AI component:', component.name);
            // Set it as current component
            if (window.StudioState) {
                window.StudioState.currentComponent = component;
            }
        }
    }
    
    // Try to get code from various sources
    if (window.generateExportCode) {
        try {
            code = window.generateExportCode();
            console.log('🔧 Integration: Got code from generateExportCode');
        } catch (error) {
            console.warn('🔧 Integration: generateExportCode failed:', error);
        }
    }
    
    if (!code && component) {
        code = getComponentCode();
        console.log('🔧 Integration: Got code from fallback method');
    }
    
    // Try to extract code from preview container as last resort
    if (!code) {
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer && previewContainer.innerHTML.trim()) {
            console.log('🔧 Integration: Attempting to extract code from preview');
            code = extractCodeFromPreview();
        }
    }
    
    if (!code) {
        console.error('🔧 Integration: No component code available');
        showErrorMessage('No component available for integration. Please select or generate a component first.');
        return;
    }
    
    console.log('🔧 Integration: Proceeding with integration, code length:', code.length);
    
    // Show integration options panel
    showIntegrationPanel(code);
}

// Refresh studio state to sync AI components
function refreshStudioState() {
    if (window.StudioState && window.ComponentLibrary) {
        // Rebuild components list to include AI generated ones
        const allComponents = [
            ...(window.ComponentLibrary.navigation || []),
            ...(window.ComponentLibrary.content || []),
            ...(window.ComponentLibrary.buttons || []),
            ...(window.ComponentLibrary.cards || []),
            ...(window.ComponentLibrary.forms || []),
            ...(window.ComponentLibrary.headers || []),
            ...(window.ComponentLibrary.heroes || []),
            ...(window.ComponentLibrary.dataDisplay || []),
            ...(window.ComponentLibrary.feedback || []),
            ...(window.ComponentLibrary.overlays || []),
            ...(window.ComponentLibrary.search || []),
            ...(window.ComponentLibrary.layout || []),
            ...(window.ComponentLibrary['ai-generated'] || [])
        ];
        
        window.StudioState.components = allComponents;
        console.log('🔧 Integration: Refreshed StudioState.components, total:', allComponents.length);
    }
}

// Extract code from preview container as last resort
function extractCodeFromPreview() {
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) return '';
    
    // Try to find component code in the preview's script tags or data attributes
    const scripts = previewContainer.querySelectorAll('script');
    for (let script of scripts) {
        if (script.textContent.includes('function ') && script.textContent.includes('React')) {
            console.log('🔧 Integration: Found component code in script tag');
            return `import React from 'react';\n\n${script.textContent}\n\nexport default Component;`;
        }
    }
    
    // Fallback: create a basic component template
    console.log('🔧 Integration: Creating basic component template');
    return `import React from 'react';

function GeneratedComponent() {
  return (
    <div>
      <p>Generated component placeholder</p>
    </div>
  );
}

export default GeneratedComponent;`;
}

// Get component code fallback
function getComponentCode() {
    if (window.StudioState && window.StudioState.currentComponent) {
        const component = window.StudioState.currentComponent;
        let code = component.code.trim();
        
        // Add import statement
        code = `import React from 'react';\n\n${code}\n\nexport default ${component.name.replace(/\s+/g, '')};`;
        
        return code;
    }
    return '';
}

// Show integration panel UI
function showIntegrationPanel(code) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'integration-panel-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create panel content
    const panel = document.createElement('div');
    panel.className = 'integration-panel-content';
    panel.style.cssText = `
        background: linear-gradient(145deg, #1a1a1a, #0d0d0d);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 32px;
        max-width: 520px;
        width: 90%;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.7);
        animation: slideUp 0.3s ease;
    `;
    
    panel.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-right: 12px;">🎯</div>
            <h2 style="color: #fff; font-size: 24px; font-weight: 600; margin: 0;">Code Integration</h2>
        </div>
        
        <div style="margin-bottom: 24px;">
            <p style="color: #b0b0b0; line-height: 1.6;">
                Choose how to integrate this component into your IDE project:
            </p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            <label class="integration-option" style="display: flex; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #e0e0e0; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="integration-location" value="cursor" checked style="margin-right: 12px; width: 18px; height: 18px;">
                <div>
                    <div style="font-weight: 500;">Insert at cursor</div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">Add component at current cursor position</div>
                </div>
            </label>
            
            <label class="integration-option" style="display: flex; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #e0e0e0; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="integration-location" value="replace" style="margin-right: 12px; width: 18px; height: 18px;">
                <div>
                    <div style="font-weight: 500;">Replace selection</div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">Replace currently selected text</div>
                </div>
            </label>
            
            <label class="integration-option" style="display: flex; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #e0e0e0; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="integration-location" value="append" style="margin-right: 12px; width: 18px; height: 18px;">
                <div>
                    <div style="font-weight: 500;">Append to file</div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">Add to the end of current file</div>
                </div>
            </label>
            
            <label class="integration-option" style="display: flex; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #e0e0e0; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="integration-location" value="newFile" style="margin-right: 12px; width: 18px; height: 18px;">
                <div>
                    <div style="font-weight: 500;">Create new file</div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">Save as a new component file</div>
                </div>
            </label>
        </div>
        
        <div id="new-file-input" style="display: none; margin-bottom: 20px;">
            <input type="text" 
                   id="new-file-name" 
                   placeholder="Enter file name (e.g., MyComponent.tsx)" 
                   style="width: 100%; padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #e0e0e0; font-size: 14px;">
        </div>
        
        <div style="padding: 16px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 8px; margin-bottom: 24px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <label style="display: flex; align-items: center; color: #e0e0e0; cursor: pointer;">
                    <input type="checkbox" id="auto-imports" checked style="margin-right: 10px; width: 16px; height: 16px;">
                    <span style="font-size: 14px;">Auto-manage imports</span>
                </label>
                
                <label style="display: flex; align-items: center; color: #e0e0e0; cursor: pointer;">
                    <input type="checkbox" id="format-code" checked style="margin-right: 10px; width: 16px; height: 16px;">
                    <span style="font-size: 14px;">Format code after insertion</span>
                </label>
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancel-integration" style="
                padding: 12px 24px;
                background: rgba(255, 255, 255, 0.1);
                color: #e0e0e0;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.2s;
            ">Cancel</button>
            
            <button id="confirm-integration" style="
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
            ">🚀 Integrate Code</button>
        </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // Add hover effects to options
    const options = panel.querySelectorAll('.integration-option');
    options.forEach(option => {
        option.addEventListener('mouseenter', () => {
            option.style.background = 'rgba(102, 126, 234, 0.1)';
            option.style.borderColor = 'rgba(102, 126, 234, 0.3)';
        });
        option.addEventListener('mouseleave', () => {
            option.style.background = 'rgba(255, 255, 255, 0.03)';
            option.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        });
    });
    
    // Handle radio button change
    const radioButtons = panel.querySelectorAll('input[name="integration-location"]');
    const newFileInput = panel.querySelector('#new-file-input');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'newFile') {
                newFileInput.style.display = 'block';
                panel.querySelector('#new-file-name').focus();
            } else {
                newFileInput.style.display = 'none';
            }
        });
    });
    
    // Handle cancel button
    panel.querySelector('#cancel-integration').addEventListener('click', () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    });
    
    // Handle confirm button
    panel.querySelector('#confirm-integration').addEventListener('click', () => {
        const location = panel.querySelector('input[name="integration-location"]:checked').value;
        const autoImports = panel.querySelector('#auto-imports').checked;
        const formatCode = panel.querySelector('#format-code').checked;
        const fileName = panel.querySelector('#new-file-name').value;
        
        if (location === 'newFile' && !fileName) {
            panel.querySelector('#new-file-name').style.borderColor = '#ef4444';
            showErrorMessage('Please enter a file name');
            return;
        }
        
        // Send integration message to IDE
        sendIntegrationMessage({
            action: 'integrate',
            code: code,
            componentName: window.StudioState?.currentComponent?.name || 'Component',
            options: {
                location,
                autoImports,
                formatCode,
                fileName: location === 'newFile' ? fileName : undefined
            }
        });
        
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
        showSuccessMessage('Component sent to IDE for integration!');
    });
    
    integrationPanel = overlay;
}

// Send message to IDE
function sendIntegrationMessage(data) {
    const message = {
        type: 'component-studio-integration',
        timestamp: Date.now(),
        ...data
    };
    
    console.log('📤 Sending integration message:', message);
    
    // Send to parent window (IDE)
    if (window.opener) {
        window.opener.postMessage(message, '*');
    }
    
    // Also try parent frame
    if (window.parent !== window) {
        window.parent.postMessage(message, '*');
    }
}

// Setup message listener for IDE communication
function setupMessageListener() {
    window.addEventListener('message', (event) => {
        // Ignore messages from same window
        if (event.source === window) return;
        
        console.log('📥 Component Studio received message:', event.data);
        
        if (event.data.type === 'ide-ready') {
            console.log('🔗 Component Studio: IDE connection established');
            showSuccessMessage('Connected to IDE');
        }
        
        if (event.data.type === 'integration-complete') {
            console.log('✅ Component Studio: Integration completed');
            if (integrationPanel) {
                integrationPanel.remove();
            }
            showSuccessMessage('Component successfully integrated!');
        }
        
        if (event.data.type === 'integration-error') {
            console.error('❌ Component Studio: Integration failed', event.data.error);
            showErrorMessage(`Integration failed: ${event.data.error}`);
        }
    });
}

// Notification helpers
function showSuccessMessage(message) {
    if (window.showNotification) {
        window.showNotification(message, 'success');
    } else {
        console.log('✅', message);
    }
}

function showErrorMessage(message) {
    if (window.showNotification) {
        window.showNotification(message, 'error');
    } else {
        console.error('❌', message);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideUp {
        from { 
            opacity: 0;
            transform: translateY(20px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .integration-panel-overlay input[type="radio"],
    .integration-panel-overlay input[type="checkbox"] {
        accent-color: #667eea;
    }
    
    #confirm-integration:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }
    
    #cancel-integration:hover {
        background: rgba(255, 255, 255, 0.15);
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIntegration);
} else {
    initializeIntegration();
}

console.log('🚀 Component Studio Integration Module loaded');