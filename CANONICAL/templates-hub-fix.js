// Templates Hub Button Fix
// This script ensures template modal buttons work correctly

(function() {
    'use strict';
    
    // REMOVED: // REMOVED: console.log('Templates Hub Fix Loading...');
    
    // Ensure functions are globally available
    window.templateFunctions = {
        installTemplate: async function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // Get the button
            const btn = event ? event.currentTarget : document.querySelector('.modal-content .btn-primary');
            if (!btn) {
                console.error('Install button not found');
                return;
            }
            
            // Store original state
            const originalHTML = btn.innerHTML;
            const originalBg = btn.style.background;
            
            // Get template info
            const templateName = document.getElementById('modalName')?.textContent || 'Template';
            const templateId = templates.find(t => t.name === templateName)?.id;
            
            if (!templateId) {
                showNotification('❌ Template not found');
                return;
            }
            
            try {
                // Show initial loading state
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
                btn.disabled = true;
                btn.style.background = '#666';
                
                // Call the real API
                const response = await fetch('/api/templates/install-mcp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ templateId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (result.alreadyInstalled) {
                        // Already installed
                        btn.innerHTML = '<i class="fas fa-check"></i> Already Installed';
                        btn.style.background = '#059669';
                        showNotification(`ℹ️ "${templateName}" is already installed`);
                    } else {
                        // Successfully installed
                        btn.innerHTML = '<i class="fas fa-check"></i> Installed Successfully!';
                        btn.style.background = '#10b981';
                        
                        let message = `✅ "${templateName}" installed successfully!`;
                        if (result.requiresRestart) {
                            message += ' Restart Claude Code to use this MCP.';
                        }
                        showNotification(message);
                        
                        // Update template card status if visible
                        updateTemplateCardStatus(templateId, 'installed');
                    }
                } else {
                    // Installation failed
                    btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Installation Failed';
                    btn.style.background = '#dc2626';
                    showNotification(`❌ Failed to install "${templateName}": ${result.error}`);
                }
                
                // Close modal and reset button after delay
                setTimeout(() => {
                    const modal = document.getElementById('modalOverlay');
                    if (modal) {
                        modal.classList.remove('active');
                    }
                    
                    // Reset button
                    btn.innerHTML = originalHTML;
                    btn.style.background = originalBg;
                    btn.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('Installation error:', error);
                
                // Show error state
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Network Error';
                btn.style.background = '#dc2626';
                showNotification('❌ Installation failed: Network error');
                
                // Reset button after delay
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = originalBg;
                    btn.disabled = false;
                }, 3000);
            }
        },
        
        viewDocs: function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // REMOVED: // REMOVED: console.log('View Docs clicked');
            
            const templateName = document.getElementById('modalName')?.textContent || '';
            const templateId = templates.find(t => t.name === templateName)?.id || '';
            
            // Open documentation
            const docsUrl = `https://docs.coder1.dev/templates/${templateId}`;
            // REMOVED: // REMOVED: console.log('Opening docs:', docsUrl);
            window.open(docsUrl, '_blank');
            
            // Show notification
            showNotification('📚 Opening documentation...');
        },
        
        closeModal: function() {
            // REMOVED: // REMOVED: console.log('Closing modal');
            const modal = document.getElementById('modalOverlay');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    };
    
    // Helper function to update template card status
    function updateTemplateCardStatus(templateId, status) {
        const templateCard = document.querySelector(`[data-template-id="${templateId}"]`);
        if (!templateCard) return;
        
        const installBtn = templateCard.querySelector('.quick-install-btn, .template-install-btn');
        if (!installBtn) return;
        
        switch (status) {
            case 'installed':
                installBtn.innerHTML = '<i class="fas fa-check"></i> Installed';
                installBtn.className = installBtn.className.replace(/btn-[a-z]+/, 'btn-success');
                installBtn.disabled = true;
                installBtn.style.background = '#10b981';
                break;
            case 'installing':
                installBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
                installBtn.disabled = true;
                installBtn.style.background = '#666';
                break;
            case 'error':
                installBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                installBtn.style.background = '#dc2626';
                setTimeout(() => {
                    installBtn.innerHTML = 'Install';
                    installBtn.style.background = '';
                    installBtn.disabled = false;
                }, 3000);
                break;
        }
    }

    // Helper function for notifications
    function showNotification(message) {
        // Remove any existing notifications
        const existing = document.querySelector('.template-notification');
        if (existing) {
            existing.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = 'template-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 100000;
            animation: slideInRight 0.3s ease;
            font-size: 14px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Add animation styles if not present
    if (!document.querySelector('#template-animations')) {
        const style = document.createElement('style');
        style.id = 'template-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Function to attach event listeners to modal buttons
    function attachModalListeners() {
        const modal = document.getElementById('modalOverlay');
        if (!modal) return;
        
        // Install button
        const installBtn = modal.querySelector('.btn-primary');
        if (installBtn) {
            installBtn.onclick = window.templateFunctions.installTemplate;
            // REMOVED: // REMOVED: console.log('Install button handler attached');
        }
        
        // Docs button
        const docsBtn = modal.querySelector('.btn-secondary');
        if (docsBtn) {
            docsBtn.onclick = window.templateFunctions.viewDocs;
            // REMOVED: // REMOVED: console.log('Docs button handler attached');
        }
        
        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = window.templateFunctions.closeModal;
            // REMOVED: // REMOVED: console.log('Close button handler attached');
        }
    }
    
    // Override the openModal function to ensure listeners are attached
    const originalOpenModal = window.openModal;
    window.openModal = function(templateId) {
        // REMOVED: // REMOVED: console.log('Opening modal for:', templateId);
        
        // Call original function if it exists
        if (originalOpenModal) {
            originalOpenModal.call(this, templateId);
        }
        
        // Attach listeners after modal opens
        setTimeout(attachModalListeners, 100);
    };
    
    // Make functions globally available with both naming conventions
    window.installTemplate = window.templateFunctions.installTemplate;
    window.viewDocs = window.templateFunctions.viewDocs;
    window.closeModal = window.templateFunctions.closeModal;
    
    // Attach listeners on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachModalListeners);
    } else {
        // DOM already loaded
        setTimeout(attachModalListeners, 100);
    }
    
    // REMOVED: // REMOVED: console.log('Templates Hub Fix Loaded Successfully');
    // REMOVED: // REMOVED: console.log('Functions available:', Object.keys(window.templateFunctions));
})();