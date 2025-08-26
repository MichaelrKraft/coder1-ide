// Templates Hub Button Fix
// This script ensures template modal buttons work correctly

(function() {
    'use strict';
    
    console.log('Templates Hub Fix Loading...');
    
    // Ensure functions are globally available
    window.templateFunctions = {
        installTemplate: function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            console.log('Install Template clicked');
            
            // Get the button
            const btn = event ? event.currentTarget : document.querySelector('.modal-content .btn-primary');
            if (!btn) {
                console.error('Button not found');
                return;
            }
            
            // Store original state
            const originalHTML = btn.innerHTML;
            const originalBg = btn.style.background;
            
            // Get template info
            const templateName = document.getElementById('modalName')?.textContent || 'Template';
            
            // Show loading state
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.disabled = true;
            btn.style.background = '#666';
            
            // Simulate installation
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> Installed Successfully!';
                btn.style.background = '#10b981';
                
                // Show notification
                showNotification(`✅ "${templateName}" installed successfully!`);
                
                // Close modal after delay
                setTimeout(() => {
                    const modal = document.getElementById('modalOverlay');
                    if (modal) {
                        modal.classList.remove('active');
                    }
                    
                    // Reset button
                    btn.innerHTML = originalHTML;
                    btn.style.background = originalBg;
                    btn.disabled = false;
                }, 1500);
            }, 2000);
        },
        
        viewDocs: function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            console.log('View Docs clicked');
            
            const templateName = document.getElementById('modalName')?.textContent || '';
            const templateId = templates.find(t => t.name === templateName)?.id || '';
            
            // Open documentation
            const docsUrl = `https://docs.coder1.dev/templates/${templateId}`;
            console.log('Opening docs:', docsUrl);
            window.open(docsUrl, '_blank');
            
            // Show notification
            showNotification('📚 Opening documentation...');
        },
        
        closeModal: function() {
            console.log('Closing modal');
            const modal = document.getElementById('modalOverlay');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    };
    
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
            console.log('Install button handler attached');
        }
        
        // Docs button
        const docsBtn = modal.querySelector('.btn-secondary');
        if (docsBtn) {
            docsBtn.onclick = window.templateFunctions.viewDocs;
            console.log('Docs button handler attached');
        }
        
        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = window.templateFunctions.closeModal;
            console.log('Close button handler attached');
        }
    }
    
    // Override the openModal function to ensure listeners are attached
    const originalOpenModal = window.openModal;
    window.openModal = function(templateId) {
        console.log('Opening modal for:', templateId);
        
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
    
    console.log('Templates Hub Fix Loaded Successfully');
    console.log('Functions available:', Object.keys(window.templateFunctions));
})();