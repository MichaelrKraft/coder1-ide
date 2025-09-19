/**
 * Orchestrator UI Module
 * Handles all UI interactions and DOM manipulation
 */

// Ensure global namespace exists
window.OrchestratorModules = window.OrchestratorModules || {};

class OrchestratorUI {
    constructor(core) {
        this.core = core;
        this.elements = this.cacheElements();
        this.setupEventListeners();
        this.setupAutoResize();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        return {
            userQuery: document.getElementById('user-query'),
            userInput: document.getElementById('user-input'),
            setupScreen: document.getElementById('setup-screen'),
            consultationScreen: document.getElementById('consultation-screen'),
            messagesContainer: document.getElementById('messages-container'),
            agentList: document.getElementById('agent-list'),
            currentPhase: document.getElementById('current-phase'),
            phaseDescription: document.getElementById('phase-description'),
            phaseIndicators: document.querySelectorAll('.phase-indicator'),
            loadingPhase: document.getElementById('loading-phase'),
            sendButton: document.getElementById('send-button'),
            uploadArea: document.getElementById('upload-area'),
            fileInput: document.getElementById('file-input'),
            uploadedFilesList: document.getElementById('uploaded-files-list'),
            exportButton: document.getElementById('export-button'),
            newConsultationButton: document.getElementById('new-consultation-button')
        };
    }

    /**
     * Setup event listeners on core events
     */
    setupEventListeners() {
        // Core events
        window.addEventListener('orchestrator:messageAdded', (e) => {
            this.addMessageToUI(e.detail);
        });

        window.addEventListener('orchestrator:loadingStateChanged', (e) => {
            this.setLoading(e.detail);
        });

        window.addEventListener('orchestrator:phaseChanged', (e) => {
            this.updatePhase(e.detail);
        });

        window.addEventListener('orchestrator:fileUploaded', (e) => {
            this.addFileToUI(e.detail);
        });

        window.addEventListener('orchestrator:agentJoined', (e) => {
            this.addAgentToUI(e.detail);
        });

        window.addEventListener('orchestrator:streamingUpdated', (e) => {
            this.updateStreamingMessage(e.detail.messageId, e.detail.content);
        });

        window.addEventListener('orchestrator:typingStarted', (e) => {
            this.showTypingIndicator(e.detail);
        });

        window.addEventListener('orchestrator:typingEnded', (e) => {
            this.hideTypingIndicator(e.detail);
        });

        window.addEventListener('orchestrator:stateReset', () => {
            this.reset();
        });
    }

    /**
     * Setup auto-resize for textareas
     */
    setupAutoResize() {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            });
        });
    }

    /**
     * Show loading state
     */
    setLoading(loading) {
        if (this.elements.sendButton) {
            this.elements.sendButton.disabled = loading;
            this.elements.sendButton.textContent = loading ? 'Sending...' : 'Send';
        }
        
        if (this.elements.userInput) {
            this.elements.userInput.disabled = loading;
        }
    }

    /**
     * Show loading phase overlay
     */
    showLoadingPhase(message = 'Initializing consultation...') {
        if (this.elements.loadingPhase) {
            const messageElement = this.elements.loadingPhase.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            this.elements.loadingPhase.classList.add('active');
        }
    }

    /**
     * Hide loading phase overlay
     */
    hideLoadingPhase() {
        if (this.elements.loadingPhase) {
            this.elements.loadingPhase.classList.remove('active');
        }
    }

    /**
     * Switch screens
     */
    switchToConsultation() {
        if (this.elements.setupScreen) {
            this.elements.setupScreen.style.display = 'none';
        }
        if (this.elements.consultationScreen) {
            this.elements.consultationScreen.style.display = 'flex';
        }
    }

    /**
     * Switch back to setup
     */
    switchToSetup() {
        if (this.elements.consultationScreen) {
            this.elements.consultationScreen.style.display = 'none';
        }
        if (this.elements.setupScreen) {
            this.elements.setupScreen.style.display = 'flex';
        }
    }

    /**
     * Update phase display
     */
    updatePhase(phase) {
        if (this.elements.currentPhase) {
            this.elements.currentPhase.textContent = phase.label;
        }
        
        if (this.elements.phaseDescription) {
            this.elements.phaseDescription.textContent = phase.description;
        }

        // Update phase indicators
        this.elements.phaseIndicators.forEach((indicator, index) => {
            const phaseIndex = this.core.phases.findIndex(p => p.key === phase.key);
            if (index < phaseIndex) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (index === phaseIndex) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });
    }

    /**
     * Add message to UI
     */
    addMessageToUI(message) {
        if (!this.elements.messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        messageElement.setAttribute('data-message-id', message.id || '');

        if (message.agent) {
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="agent-name">${message.agent}</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${this.formatMessage(message.content)}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">${this.formatMessage(message.content)}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
        }

        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    /**
     * Format message content
     */
    formatMessage(content) {
        // Convert markdown-style formatting
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        // Convert code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'plaintext'}">${this.escapeHtml(code)}</code></pre>`;
        });

        return formatted;
    }

    /**
     * Escape HTML for security
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Update streaming message
     */
    updateStreamingMessage(messageId, content) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"] .message-content`);
        if (messageElement) {
            messageElement.innerHTML = this.formatMessage(content);
        }
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator(agentId) {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.setAttribute('data-agent-id', agentId);
        indicator.innerHTML = `
            <span class="agent-name">${agentId}</span> is typing
            <span class="typing-dots">
                <span></span><span></span><span></span>
            </span>
        `;
        
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.appendChild(indicator);
            this.scrollToBottom();
        }
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator(agentId) {
        const indicator = document.querySelector(`[data-agent-id="${agentId}"]`);
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Add agent to UI
     */
    addAgentToUI(agentId) {
        if (!this.elements.agentList) return;

        const agentElement = document.createElement('div');
        agentElement.className = 'agent-item active';
        agentElement.setAttribute('data-agent-id', agentId);
        agentElement.innerHTML = `
            <div class="agent-avatar">${agentId.charAt(0).toUpperCase()}</div>
            <div class="agent-info">
                <div class="agent-name">${agentId}</div>
                <div class="agent-status">Active</div>
            </div>
        `;

        this.elements.agentList.appendChild(agentElement);
    }

    /**
     * Add file to UI
     */
    addFileToUI(file) {
        if (!this.elements.uploadedFilesList) return;

        const fileElement = document.createElement('div');
        fileElement.className = 'uploaded-file';
        fileElement.innerHTML = `
            <span class="file-name">${file.name}</span>
            <span class="file-size">${this.formatFileSize(file.size)}</span>
            <button class="remove-file" data-file-id="${file.id}">×</button>
        `;

        this.elements.uploadedFilesList.appendChild(fileElement);

        // Add remove handler
        fileElement.querySelector('.remove-file').addEventListener('click', () => {
            this.removeFile(file.id);
        });
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Remove file
     */
    removeFile(fileId) {
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`).parentElement;
        if (fileElement) {
            fileElement.remove();
        }
        // Notify core about file removal
        this.core.uploadedFiles = this.core.uploadedFiles.filter(f => f.id !== fileId);
    }

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }
    }

    /**
     * Clear messages UI
     */
    clearMessages() {
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.innerHTML = '';
        }
    }

    /**
     * Clear agents UI
     */
    clearAgents() {
        if (this.elements.agentList) {
            this.elements.agentList.innerHTML = '';
        }
    }

    /**
     * Clear files UI
     */
    clearFiles() {
        if (this.elements.uploadedFilesList) {
            this.elements.uploadedFilesList.innerHTML = '';
        }
    }

    /**
     * Get user input
     */
    getUserInput() {
        return this.elements.userInput?.value || '';
    }

    /**
     * Clear user input
     */
    clearUserInput() {
        if (this.elements.userInput) {
            this.elements.userInput.value = '';
            this.elements.userInput.style.height = 'auto';
        }
    }

    /**
     * Get user query
     */
    getUserQuery() {
        return this.elements.userQuery?.value || '';
    }

    /**
     * Clear user query
     */
    clearUserQuery() {
        if (this.elements.userQuery) {
            this.elements.userQuery.value = '';
        }
    }

    /**
     * Reset UI
     */
    reset() {
        this.clearMessages();
        this.clearAgents();
        this.clearFiles();
        this.clearUserInput();
        this.clearUserQuery();
        this.switchToSetup();
        this.hideLoadingPhase();
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Register module
window.OrchestratorModules.ui = {
    OrchestratorUI
};

// Export for ES modules
export { OrchestratorUI };