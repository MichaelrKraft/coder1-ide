/**
 * Claude Code Hooks Manager - Frontend JavaScript
 * Handles the interactive hooks management interface
 */

class HooksManager {
    constructor() {
        this.projectAnalysis = null;
        this.templates = null;
        this.currentConfig = null;
        this.selectedHooks = new Set();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.section);
            });
        });

        // Action buttons
        document.getElementById('quickSetupBtn')?.addEventListener('click', () => {
            this.quickSetup();
        });

        document.getElementById('browseTemplatesBtn')?.addEventListener('click', () => {
            this.switchTab('templates');
        });

        document.getElementById('manageConfigBtn')?.addEventListener('click', () => {
            this.switchTab('configuration');
        });
    }

    switchTab(sectionId) {
        // Update tab appearance
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === sectionId) {
                tab.classList.add('active');
            }
        });

        // Update content visibility
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');

        // Load section content if needed
        switch (sectionId) {
            case 'templates':
                this.loadTemplates();
                break;
            case 'configuration':
                this.loadConfiguration();
                break;
        }
    }

    async loadInitialData() {
        try {
            // Load project analysis and status in parallel
            const [analysisResponse, statusResponse] = await Promise.all([
                fetch('/api/hooks/detect-project'),
                fetch('/api/hooks/status')
            ]);

            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                this.projectAnalysis = analysisData.analysis;
                this.updateStatus();
                this.renderRecommendations();
            }

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                this.updateStatusCards(statusData.status);
            }

        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load project data. Please refresh the page.');
        }
    }

    updateStatus() {
        if (!this.projectAnalysis) return;

        // Update project type
        const projectTypeEl = document.getElementById('projectType');
        if (projectTypeEl) {
            projectTypeEl.textContent = this.projectAnalysis.projectType || 'Unknown';
        }

        // Update recommendation count
        const recommendationCountEl = document.getElementById('recommendationCount');
        if (recommendationCountEl) {
            recommendationCountEl.textContent = this.projectAnalysis.recommendations?.length || 0;
        }
    }

    updateStatusCards(status) {
        // Update template count
        const templateCountEl = document.getElementById('templateCount');
        if (templateCountEl) {
            templateCountEl.textContent = status.totalTemplates || 0;
        }

        // Update active hooks count
        const activeHooksEl = document.getElementById('activeHooks');
        if (activeHooksEl) {
            const totalHooks = (status.project?.hookCount || 0) + (status.user?.hookCount || 0);
            activeHooksEl.textContent = totalHooks;
        }
    }

    renderRecommendations() {
        const container = document.getElementById('recommendationsContent');
        if (!container || !this.projectAnalysis) return;

        if (!this.projectAnalysis.recommendations || this.projectAnalysis.recommendations.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    No recommendations available. Make sure you're in a valid project directory.
                </div>
            `;
            return;
        }

        const html = `
            <div class="recommendations">
                <h2>Recommended Hook Packs for Your Project</h2>
                <p>Based on your <strong>${this.projectAnalysis.projectType}</strong> project, we recommend these automation packs:</p>
                ${this.projectAnalysis.recommendations.map(rec => this.renderRecommendationCard(rec)).join('')}
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners for recommendation actions
        container.querySelectorAll('.install-pack-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packId = e.target.dataset.packId;
                this.installRecommendationPack(packId);
            });
        });
    }

    renderRecommendationCard(recommendation) {
        const priorityClass = `priority-${recommendation.priority}`;
        
        return `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <div>
                        <div class="recommendation-title">${recommendation.name}</div>
                        <div class="recommendation-description">${recommendation.description}</div>
                    </div>
                    <div class="recommendation-priority ${priorityClass}">${recommendation.priority}</div>
                </div>
                <div class="recommendation-reason">
                    <i class="fas fa-info-circle"></i>
                    ${recommendation.reason}
                </div>
                <div class="hook-tags">
                    ${recommendation.hooks.map(hookId => `<span class="hook-tag">${hookId}</span>`).join('')}
                </div>
                <button class="btn btn-primary install-pack-btn" data-pack-id="${recommendation.id}">
                    <i class="fas fa-download"></i>
                    Install Pack
                </button>
            </div>
        `;
    }

    async loadTemplates() {
        const container = document.getElementById('templatesContent');
        if (!container) return;

        try {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Loading templates...
                </div>
            `;

            const response = await fetch('/api/hooks/templates');
            if (!response.ok) {
                throw new Error('Failed to fetch templates');
            }

            const data = await response.json();
            this.templates = data.templates;

            this.renderTemplates();

        } catch (error) {
            console.error('Failed to load templates:', error);
            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load templates: ${error.message}
                </div>
            `;
        }
    }

    renderTemplates() {
        const container = document.getElementById('templatesContent');
        if (!container || !this.templates) return;

        const templateArray = Object.values(this.templates);
        
        const html = `
            <div class="templates-section">
                <h2>Available Hook Templates</h2>
                <p>Choose from ${templateArray.length} pre-built hook templates to automate your development workflow.</p>
                
                <div class="templates-grid">
                    ${templateArray.map(template => this.renderTemplateCard(template)).join('')}
                </div>
                
                <div class="selected-actions" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--coder1-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span id="selectedCount">0</span> templates selected
                        </div>
                        <div>
                            <button class="btn btn-secondary" id="clearSelection">
                                Clear Selection
                            </button>
                            <button class="btn btn-primary" id="installSelected" disabled>
                                <i class="fas fa-download"></i>
                                Install Selected
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('.template-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleTemplateSelection(e.target.value, e.target.checked);
            });
        });

        document.getElementById('clearSelection')?.addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('installSelected')?.addEventListener('click', () => {
            this.installSelectedTemplates();
        });
    }

    renderTemplateCard(template) {
        const isSelected = this.selectedHooks.has(template.id);
        
        return `
            <div class="template-card">
                <div class="template-header">
                    <span class="template-icon">${template.icon}</span>
                    <div class="template-title">${template.name}</div>
                </div>
                <div class="template-description">${template.description}</div>
                
                ${template.preview ? `
                    <div class="template-preview">
                        <div class="preview-when"><strong>When:</strong> ${template.preview.when}</div>
                        <div class="preview-action"><strong>Action:</strong> ${template.preview.action}</div>
                        <div class="preview-result"><strong>Result:</strong> ${template.preview.result}</div>
                    </div>
                ` : ''}
                
                <div class="hook-tags">
                    ${template.tags.map(tag => `<span class="hook-tag">${tag}</span>`).join('')}
                </div>
                
                <div class="checkbox-container">
                    <input type="checkbox" 
                           class="checkbox template-checkbox" 
                           value="${template.id}" 
                           ${isSelected ? 'checked' : ''}>
                    <label>Add to selection</label>
                </div>
            </div>
        `;
    }

    handleTemplateSelection(templateId, isSelected) {
        if (isSelected) {
            this.selectedHooks.add(templateId);
        } else {
            this.selectedHooks.delete(templateId);
        }

        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const countEl = document.getElementById('selectedCount');
        const installBtn = document.getElementById('installSelected');
        
        if (countEl) {
            countEl.textContent = this.selectedHooks.size;
        }
        
        if (installBtn) {
            installBtn.disabled = this.selectedHooks.size === 0;
        }
    }

    clearSelection() {
        this.selectedHooks.clear();
        document.querySelectorAll('.template-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectionUI();
    }

    async loadConfiguration() {
        const container = document.getElementById('configurationContent');
        if (!container) return;

        try {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Loading configuration...
                </div>
            `;

            const response = await fetch('/api/hooks/current-config');
            if (!response.ok) {
                throw new Error('Failed to fetch configuration');
            }

            const data = await response.json();
            this.currentConfig = data.config;

            this.renderConfiguration();

        } catch (error) {
            console.error('Failed to load configuration:', error);
            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load configuration: ${error.message}
                </div>
            `;
        }
    }

    renderConfiguration() {
        const container = document.getElementById('configurationContent');
        if (!container) return;

        const hasConfig = this.currentConfig && Object.keys(this.currentConfig).length > 0;
        
        if (!hasConfig) {
            container.innerHTML = `
                <div class="configuration-section">
                    <h2>No Configuration Found</h2>
                    <p>You don't have any Claude Code hooks configured yet. Get started by browsing our templates or using the quick setup.</p>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="hooksManager.quickSetup()">
                            <i class="fas fa-magic"></i>
                            Quick Setup
                        </button>
                        <button class="btn btn-secondary" onclick="hooksManager.switchTab('templates')">
                            <i class="fas fa-search"></i>
                            Browse Templates
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const hookCount = this.currentConfig.hooks ? 
            Object.values(this.currentConfig.hooks).flat().length : 0;

        container.innerHTML = `
            <div class="configuration-section">
                <h2>Current Configuration</h2>
                <p>You have ${hookCount} hook(s) configured in your Claude Code settings.</p>
                
                <div class="config-preview">
                    <h3>Configuration Preview</h3>
                    <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; overflow-x: auto; color: var(--coder1-text-dim);">${JSON.stringify(this.currentConfig, null, 2)}</pre>
                </div>
                
                <div class="actions">
                    <button class="btn btn-secondary" onclick="hooksManager.downloadConfig()">
                        <i class="fas fa-download"></i>
                        Download Configuration
                    </button>
                    <button class="btn btn-secondary" onclick="hooksManager.resetConfig()">
                        <i class="fas fa-trash"></i>
                        Reset Configuration
                    </button>
                </div>
            </div>
        `;
    }

    async quickSetup() {
        if (!this.projectAnalysis || !this.projectAnalysis.recommendations.length) {
            this.showError('No recommendations available. Please ensure you\'re in a valid project directory.');
            return;
        }

        // Install the highest priority recommendation
        const topRecommendation = this.projectAnalysis.recommendations[0];
        await this.installRecommendationPack(topRecommendation.id);
    }

    async installRecommendationPack(packId) {
        try {
            this.showLoading('Installing recommendation pack...');

            const response = await fetch('/api/hooks/install-pack', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ packId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Installation failed');
            }

            const result = await response.json();
            this.showSuccess(`Successfully installed ${result.pack.name}!`);
            
            // Refresh status and current config
            await this.loadInitialData();
            if (document.querySelector('.content-section.active')?.id === 'configuration') {
                await this.loadConfiguration();
            }

        } catch (error) {
            console.error('Pack installation failed:', error);
            this.showError(`Installation failed: ${error.message}`);
        }
    }

    async installSelectedTemplates() {
        if (this.selectedHooks.size === 0) {
            this.showError('No templates selected');
            return;
        }

        try {
            this.showLoading('Installing selected templates...');

            const response = await fetch('/api/hooks/generate-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    selectedHooks: Array.from(this.selectedHooks)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Configuration generation failed');
            }

            const result = await response.json();
            
            // Save the configuration
            const saveResponse = await fetch('/api/hooks/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    config: result.config
                })
            });

            if (!saveResponse.ok) {
                const saveError = await saveResponse.json();
                throw new Error(saveError.error || 'Configuration save failed');
            }

            this.showSuccess(`Successfully installed ${this.selectedHooks.size} template(s)!`);
            this.clearSelection();
            
            // Refresh status
            await this.loadInitialData();

        } catch (error) {
            console.error('Template installation failed:', error);
            this.showError(`Installation failed: ${error.message}`);
        }
    }

    downloadConfig() {
        if (!this.currentConfig) return;
        
        const blob = new Blob([JSON.stringify(this.currentConfig, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'claude-hooks-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async resetConfig() {
        if (!confirm('Are you sure you want to reset your hooks configuration? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('/api/hooks/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    config: {}
                })
            });

            if (!response.ok) {
                throw new Error('Reset failed');
            }

            this.showSuccess('Configuration reset successfully');
            await this.loadInitialData();
            await this.loadConfiguration();

        } catch (error) {
            console.error('Reset failed:', error);
            this.showError(`Reset failed: ${error.message}`);
        }
    }

    showLoading(message) {
        this.showNotification(message, 'loading');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${type === 'loading' ? '<div class="spinner"></div>' : ''}
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
                ${type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                <span>${message}</span>
            </div>
        `;

        // Add notification styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            zIndex: '1000',
            minWidth: '300px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        });

        if (type === 'success') {
            notification.className += ' success';
        } else if (type === 'error') {
            notification.className += ' error';
        } else {
            Object.assign(notification.style, {
                background: 'var(--coder1-bg-card)',
                border: '1px solid var(--coder1-border)',
                color: 'var(--coder1-text)'
            });
        }

        document.body.appendChild(notification);

        // Auto-remove after delay (except for loading)
        if (type !== 'loading') {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, type === 'error' ? 5000 : 3000);
        }
    }
}

// Initialize when page loads
let hooksManager;
document.addEventListener('DOMContentLoaded', () => {
    hooksManager = new HooksManager();
});