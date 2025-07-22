/**
 * Toast Notification System
 * Provides visual feedback for user actions
 */

class ToastNotifications {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
            
            // Add styles
            this.addStyles();
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }

            .toast {
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                max-width: 500px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                animation: slideIn 0.3s ease-out;
                pointer-events: all;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .toast:hover {
                transform: translateX(-5px);
                box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
            }

            .toast.success {
                background: rgba(16, 185, 129, 0.95);
                border-color: rgba(16, 185, 129, 0.3);
            }

            .toast.error {
                background: rgba(239, 68, 68, 0.95);
                border-color: rgba(239, 68, 68, 0.3);
            }

            .toast.warning {
                background: rgba(245, 158, 11, 0.95);
                border-color: rgba(245, 158, 11, 0.3);
            }

            .toast.info {
                background: rgba(59, 130, 246, 0.95);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .toast-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .toast-content {
                flex: 1;
            }

            .toast-title {
                font-weight: 600;
                margin-bottom: 4px;
            }

            .toast-message {
                font-size: 14px;
                opacity: 0.9;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 8px 8px;
                animation: progress 3s linear;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            @keyframes progress {
                from {
                    width: 100%;
                }
                to {
                    width: 0%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = 3000,
            icon = this.getDefaultIcon(type),
            onClick = null
        } = options;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // Add click handler
        if (onClick) {
            toast.onclick = onClick;
        } else {
            toast.onclick = () => this.remove(toast);
        }

        // Add to container
        this.container.appendChild(toast);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    remove(toast) {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(message, title = 'Success') {
        return this.show({ type: 'success', title, message });
    }

    error(message, title = 'Error') {
        return this.show({ type: 'error', title, message });
    }

    warning(message, title = 'Warning') {
        return this.show({ type: 'warning', title, message });
    }

    info(message, title = 'Info') {
        return this.show({ type: 'info', title, message });
    }
}

// Create global instance
window.toast = new ToastNotifications();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotifications;
}