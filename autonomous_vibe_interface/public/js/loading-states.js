/**
 * Loading States and Skeleton Screens
 * Provides visual feedback during async operations
 */

class LoadingStates {
    constructor() {
        this.loadingMessages = [
            "Claude is thinking deeply about your request...",
            "Analyzing your requirements...",
            "Crafting the perfect solution...",
            "Generating intelligent code...",
            "Almost there, putting finishing touches...",
            "Processing your request with AI magic...",
            "Building something amazing for you..."
        ];
        this.currentMessageIndex = 0;
        this.messageInterval = null;
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Skeleton Loading Styles */
            .skeleton-loader {
                animation: skeleton-pulse 1.5s ease-in-out infinite;
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0.1) 25%,
                    rgba(255, 255, 255, 0.2) 50%,
                    rgba(255, 255, 255, 0.1) 75%
                );
                background-size: 200% 100%;
                border-radius: 4px;
            }

            @keyframes skeleton-pulse {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }

            .skeleton-line {
                height: 16px;
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.1);
                animation: skeleton-pulse 1.5s ease-in-out infinite;
                border-radius: 4px;
            }

            .skeleton-line.short {
                width: 60%;
            }

            .skeleton-line.medium {
                width: 80%;
            }

            .skeleton-line.long {
                width: 100%;
            }

            /* Code Skeleton */
            .code-skeleton {
                background: rgba(0, 0, 0, 0.5);
                border-radius: 8px;
                padding: 20px;
                font-family: 'Monaco', 'Consolas', monospace;
            }

            .code-skeleton .skeleton-line {
                height: 20px;
                margin-bottom: 12px;
                background: rgba(255, 255, 255, 0.05);
            }

            /* Loading Spinner */
            .loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: #3b82f6;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Loading Message */
            .loading-message {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                color: #93bbfc;
                font-size: 14px;
                margin-bottom: 16px;
                animation: fadeIn 0.3s ease-out;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Progress Bar */
            .progress-bar {
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
                margin-top: 8px;
            }

            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 2px;
                transition: width 0.3s ease;
                animation: progress-pulse 2s ease-in-out infinite;
            }

            @keyframes progress-pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.7;
                }
            }

            /* Success Animation */
            .success-checkmark {
                width: 80px;
                height: 80px;
                margin: 0 auto;
                animation: scaleIn 0.3s ease-out;
            }

            @keyframes scaleIn {
                from {
                    transform: scale(0) rotate(45deg);
                    opacity: 0;
                }
                to {
                    transform: scale(1) rotate(45deg);
                    opacity: 1;
                }
            }

            .success-checkmark svg {
                width: 100%;
                height: 100%;
            }

            .checkmark-path {
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                animation: drawCheckmark 0.5s ease-out 0.3s forwards;
            }

            @keyframes drawCheckmark {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Show skeleton loader for code generation
    showCodeSkeleton(container, lines = 5) {
        const skeleton = document.createElement('div');
        skeleton.className = 'code-skeleton';
        skeleton.innerHTML = Array(lines)
            .fill(0)
            .map((_, i) => {
                const widthClass = ['short', 'medium', 'long'][Math.floor(Math.random() * 3)];
                return `<div class="skeleton-line ${widthClass}"></div>`;
            })
            .join('');
        
        container.innerHTML = '';
        container.appendChild(skeleton);
        return skeleton;
    }

    // Show loading message with spinner
    showLoadingMessage(container, message = null) {
        if (!message) {
            message = this.loadingMessages[this.currentMessageIndex];
            this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-message';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <span>${message}</span>
        `;

        container.innerHTML = '';
        container.appendChild(loadingDiv);

        // Rotate messages
        if (!this.messageInterval) {
            this.messageInterval = setInterval(() => {
                const messageSpan = loadingDiv.querySelector('span');
                if (messageSpan) {
                    messageSpan.textContent = this.loadingMessages[this.currentMessageIndex];
                    this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
                }
            }, 3000);
        }

        return loadingDiv;
    }

    // Stop rotating messages
    stopMessageRotation() {
        if (this.messageInterval) {
            clearInterval(this.messageInterval);
            this.messageInterval = null;
        }
    }

    // Show progress bar
    showProgressBar(container, progress = 0) {
        let progressBar = container.querySelector('.progress-bar');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = '<div class="progress-bar-fill" style="width: 0%"></div>';
            container.appendChild(progressBar);
        }

        const fill = progressBar.querySelector('.progress-bar-fill');
        fill.style.width = `${progress}%`;
        
        return progressBar;
    }

    // Update progress
    updateProgress(container, progress) {
        const progressBar = container.querySelector('.progress-bar-fill');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    // Show success animation
    showSuccess(container, message = 'Success!') {
        this.stopMessageRotation();
        
        container.innerHTML = `
            <div class="success-checkmark">
                <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="#10b981" stroke-width="2"/>
                    <path class="checkmark-path" fill="none" stroke="#10b981" stroke-width="5" stroke-linecap="round" d="M14 27l7 7 16-16"/>
                </svg>
            </div>
            <div style="text-align: center; margin-top: 16px; color: #10b981; font-weight: 600;">
                ${message}
            </div>
        `;
    }

    // Hide loading state
    hide(container) {
        this.stopMessageRotation();
        container.innerHTML = '';
    }

    // Create button loading state
    setButtonLoading(button, loading = true, text = null) {
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = `
                <span style="display: flex; align-items: center; gap: 8px;">
                    <div class="loading-spinner" style="width: 16px; height: 16px;"></div>
                    ${text || 'Processing...'}
                </span>
            `;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
        }
    }
}

// Create global instance
window.loadingStates = new LoadingStates();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingStates;
}