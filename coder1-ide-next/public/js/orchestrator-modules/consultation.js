/**
 * Orchestrator Consultation Module
 * Handles consultation workflow and business logic
 */

// Ensure global namespace exists
window.OrchestratorModules = window.OrchestratorModules || {};

class ConsultationHandler {
    constructor(core, socket) {
        this.core = core;
        this.socket = socket;
        this.isActive = false;
        this.startTime = null;
    }

    /**
     * Start a new consultation
     */
    async start() {
        if (this.isActive) {
            console.warn('[Consultation] Already active');
            return;
        }

        const query = document.getElementById('user-query')?.value?.trim();
        if (!query) {
            this.core.dispatchEvent('userError', 'Please describe what you want to build');
            return;
        }

        console.log('[Consultation] Starting with query:', query);
        
        // Set loading state
        this.core.setLoading(true);
        
        // Show loading phase
        this.showLoadingPhase('Initializing AI consultation...');
        
        // Reset state
        this.core.reset();
        
        // Mark as active
        this.isActive = true;
        this.startTime = Date.now();
        
        // Switch to consultation screen
        this.switchToConsultation();
        
        try {
            // Ensure socket is connected
            if (!this.socket.isConnected()) {
                this.showLoadingPhase('Connecting to server...');
                await this.socket.connect();
            }
            
            // Get uploaded files
            const files = this.core.getUploadedFiles();
            
            // Start consultation via socket
            this.socket.startConsultation(query, files);
            
            // Set initial phase
            this.core.setPhase(this.core.phases[0]);
            
            // Hide loading
            this.hideLoadingPhase();
            this.core.setLoading(false);
            
            // Add initial message
            this.core.addMessage({
                role: 'system',
                content: `Starting AI consultation for: "${query}"`
            });
            
        } catch (error) {
            console.error('[Consultation] Start failed:', error);
            this.handleError(error);
        }
    }

    /**
     * Send user message
     */
    sendMessage(content) {
        if (!this.isActive) {
            console.warn('[Consultation] Not active');
            return;
        }

        if (!content || !content.trim()) {
            return;
        }

        // Add user message to UI immediately
        this.core.addMessage({
            role: 'user',
            content: content
        });

        // Send via socket
        this.socket.sendMessage(content, {
            type: 'user',
            phase: this.core.getPhase()?.key
        });

        // Clear input
        const input = document.getElementById('user-input');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
    }

    /**
     * Request specific agent
     */
    requestAgent(agentId) {
        if (!this.isActive) {
            console.warn('[Consultation] Not active');
            return;
        }

        console.log('[Consultation] Requesting agent:', agentId);
        this.socket.requestAgent(agentId);
    }

    /**
     * Export consultation plan
     */
    async exportPlan() {
        if (!this.core.plan) {
            this.core.dispatchEvent('userError', 'No plan available to export');
            return;
        }

        try {
            // Create export data
            const exportData = {
                consultation: {
                    query: document.getElementById('user-query')?.value,
                    startTime: this.startTime,
                    duration: Date.now() - this.startTime,
                    phases: this.core.phases
                },
                messages: this.core.getMessages(),
                agents: Array.from(this.core.joinedAgents),
                plan: this.core.plan,
                exportTime: new Date().toISOString()
            };

            // Create blob
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `consultation-plan-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('[Consultation] Plan exported');
            this.core.dispatchEvent('planExported', exportData);

        } catch (error) {
            console.error('[Consultation] Export failed:', error);
            this.core.dispatchEvent('userError', 'Failed to export plan');
        }
    }

    /**
     * Generate Claude Code prompt
     */
    generateClaudePrompt() {
        const query = document.getElementById('user-query')?.value || '';
        const messages = this.core.getMessages();
        const plan = this.core.plan;

        let prompt = `# Project Request\n${query}\n\n`;

        if (plan) {
            prompt += `# Implementation Plan\n${JSON.stringify(plan, null, 2)}\n\n`;
        }

        prompt += `# Consultation History\n`;
        messages.forEach(msg => {
            if (msg.agent) {
                prompt += `\n[${msg.agent}]: ${msg.content}\n`;
            } else {
                prompt += `\n[${msg.role}]: ${msg.content}\n`;
            }
        });

        return prompt;
    }

    /**
     * Copy Claude prompt to clipboard
     */
    async copyClaudePrompt() {
        const prompt = this.generateClaudePrompt();
        
        try {
            await navigator.clipboard.writeText(prompt);
            this.core.dispatchEvent('userSuccess', 'Prompt copied to clipboard');
        } catch (error) {
            console.error('[Consultation] Failed to copy prompt:', error);
            this.core.dispatchEvent('userError', 'Failed to copy prompt');
        }
    }

    /**
     * End consultation
     */
    end() {
        if (!this.isActive) return;

        console.log('[Consultation] Ending consultation');
        
        this.isActive = false;
        const duration = Date.now() - this.startTime;
        
        // Add completion message
        this.core.addMessage({
            role: 'system',
            content: `Consultation completed in ${this.formatDuration(duration)}`
        });

        // Dispatch completion event
        this.core.dispatchEvent('consultationCompleted', {
            duration,
            messageCount: this.core.getMessages().length,
            agentCount: this.core.joinedAgents.size
        });
    }

    /**
     * Start new consultation
     */
    startNew() {
        // End current if active
        if (this.isActive) {
            this.end();
        }

        // Reset everything
        this.core.reset();
        
        // Switch to setup screen
        this.switchToSetup();
        
        console.log('[Consultation] Ready for new consultation');
    }

    /**
     * Format duration
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Handle error
     */
    handleError(error) {
        console.error('[Consultation] Error:', error);
        
        this.hideLoadingPhase();
        this.core.setLoading(false);
        
        // Show error to user
        let message = 'An error occurred during consultation';
        if (error.message) {
            message = error.message;
        }
        
        this.core.dispatchEvent('userError', message);
        
        // Reset if fatal
        if (!this.socket.isConnected()) {
            this.isActive = false;
            this.switchToSetup();
        }
    }

    /**
     * Show loading phase
     */
    showLoadingPhase(message) {
        const loadingElement = document.getElementById('loading-phase');
        if (loadingElement) {
            const messageElement = loadingElement.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            loadingElement.classList.add('active');
        }
    }

    /**
     * Hide loading phase
     */
    hideLoadingPhase() {
        const loadingElement = document.getElementById('loading-phase');
        if (loadingElement) {
            loadingElement.classList.remove('active');
        }
    }

    /**
     * Switch to consultation screen
     */
    switchToConsultation() {
        const setupScreen = document.getElementById('setup-screen');
        const consultationScreen = document.getElementById('consultation-screen');
        
        if (setupScreen) {
            setupScreen.style.display = 'none';
        }
        if (consultationScreen) {
            consultationScreen.style.display = 'flex';
        }
    }

    /**
     * Switch to setup screen
     */
    switchToSetup() {
        const setupScreen = document.getElementById('setup-screen');
        const consultationScreen = document.getElementById('consultation-screen');
        
        if (consultationScreen) {
            consultationScreen.style.display = 'none';
        }
        if (setupScreen) {
            setupScreen.style.display = 'flex';
        }
    }
}

// Register module
window.OrchestratorModules.consultation = {
    ConsultationHandler
};

// Export for ES modules
export { ConsultationHandler };