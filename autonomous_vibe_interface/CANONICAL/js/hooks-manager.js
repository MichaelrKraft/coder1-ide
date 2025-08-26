/**
 * Claude Code Hooks Manager - Frontend JavaScript
 * Simplified, user-friendly hooks management interface
 */

class HooksManager {
    constructor() {
        this.selectedHooks = new Set();
        this.currentConfig = null;
        this.availableHooks = this.getAvailableHooks();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadCurrentConfig();
        this.updateHookStates();
    }

    setupEventListeners() {
        // Quick action buttons
        document.getElementById('autoSetupBtn')?.addEventListener('click', () => {
            this.autoSetup();
        });

        document.getElementById('viewCurrentBtn')?.addEventListener('click', () => {
            this.viewCurrentHooks();
        });

        // Hook toggle buttons
        document.querySelectorAll('.hook-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const hookId = e.target.closest('.hook-card').dataset.hook;
                this.toggleHook(hookId, button);
            });
        });

        // Hook card clicks (for selection)
        document.querySelectorAll('.hook-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('hook-toggle')) return;
                const hookId = card.dataset.hook;
                const button = card.querySelector('.hook-toggle');
                this.toggleHook(hookId, button);
            });
        });

        // Summary panel actions
        document.getElementById('saveHooksBtn')?.addEventListener('click', () => {
            this.saveConfiguration();
        });

        document.getElementById('clearSelectionBtn')?.addEventListener('click', () => {
            this.clearAllSelections();
        });
    }

    getAvailableHooks() {
        return {
            'format-on-save': {
                name: 'Auto-Format Code',
                description: 'Automatically formats your code when you save files',
                category: 'essential',
                command: 'prettier --write',
                when: 'pre-commit'
            },
            'fix-imports': {
                name: 'Fix Import Statements',
                description: 'Automatically organizes and fixes import/require statements',
                category: 'essential',
                command: 'eslint --fix',
                when: 'pre-commit'
            },
            'run-tests': {
                name: 'Run Tests on Save',
                description: 'Automatically runs your tests when you save changes',
                category: 'essential',
                command: 'npm test',
                when: 'pre-push'
            },
            'lint-check': {
                name: 'Lint Code',
                description: 'Checks for common errors and style issues',
                category: 'quality',
                command: 'eslint .',
                when: 'pre-commit'
            },
            'type-check': {
                name: 'Type Checking',
                description: 'Validates TypeScript types and catches type errors',
                category: 'quality',
                command: 'tsc --noEmit',
                when: 'pre-commit'
            },
            'security-scan': {
                name: 'Security Scan',
                description: 'Scans for security vulnerabilities in dependencies',
                category: 'quality',
                command: 'npm audit',
                when: 'pre-push'
            },
            'commit-message': {
                name: 'Smart Commit Messages',
                description: 'Validates and suggests improvements to commit messages',
                category: 'git',
                command: 'commitizen',
                when: 'commit-msg'
            },
            'branch-naming': {
                name: 'Enforce Branch Names',
                description: 'Ensures branch names follow your team\'s conventions',
                category: 'git',
                command: 'validate-branch-name',
                when: 'pre-push'
            },
            'prevent-secrets': {
                name: 'Prevent Secret Commits',
                description: 'Blocks commits that contain passwords or API keys',
                category: 'git',
                command: 'git-secrets --scan',
                when: 'pre-commit'
            },
            'bundle-analysis': {
                name: 'Bundle Size Check',
                description: 'Warns when your bundle size grows too large',
                category: 'performance',
                command: 'bundlesize',
                when: 'pre-push'
            },
            'image-optimization': {
                name: 'Optimize Images',
                description: 'Automatically compresses images when added to project',
                category: 'performance',
                command: 'imagemin',
                when: 'pre-commit'
            }
        };
    }

    async loadCurrentConfig() {
        try {
            const response = await fetch('/api/hooks/current-config');
            if (response.ok) {
                const data = await response.json();
                this.currentConfig = data.config || {};
            }
        } catch (error) {
            console.error('Failed to load current config:', error);
            this.currentConfig = {};
        }
    }

    updateHookStates() {
        // Update toggle states based on current configuration
        document.querySelectorAll('.hook-card').forEach(card => {
            const hookId = card.dataset.hook;
            const toggle = card.querySelector('.hook-toggle');
            const isEnabled = this.isHookEnabled(hookId);
            
            if (isEnabled) {
                toggle.dataset.state = 'on';
                toggle.textContent = 'Enabled';
                card.classList.add('selected');
                this.selectedHooks.add(hookId);
            } else {
                toggle.dataset.state = 'off';
                toggle.textContent = 'Enable';
                card.classList.remove('selected');
            }
        });
        
        this.updateSummaryPanel();
    }

    isHookEnabled(hookId) {
        if (!this.currentConfig.hooks) return false;
        
        // Check if hook is in any git hook category
        for (const hookType of Object.keys(this.currentConfig.hooks)) {
            if (this.currentConfig.hooks[hookType].includes(hookId)) {
                return true;
            }
        }
        return false;
    }

    toggleHook(hookId, button) {
        const card = button.closest('.hook-card');
        const isCurrentlyEnabled = button.dataset.state === 'on';
        
        if (isCurrentlyEnabled) {
            // Disable hook
            button.dataset.state = 'off';
            button.textContent = 'Enable';
            card.classList.remove('selected');
            this.selectedHooks.delete(hookId);
        } else {
            // Enable hook
            button.dataset.state = 'on';
            button.textContent = 'Enabled';
            card.classList.add('selected');
            this.selectedHooks.add(hookId);
        }
        
        this.updateSummaryPanel();
    }

    updateSummaryPanel() {
        const panel = document.getElementById('summaryPanel');
        const hooksList = document.getElementById('selectedHooksList');
        
        if (this.selectedHooks.size === 0) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        // Generate hooks list
        const hooksHtml = Array.from(this.selectedHooks).map(hookId => {
            const hook = this.availableHooks[hookId];
            return `
                <div class="selected-hook-item">
                    <span class="hook-name">${hook.name}</span>
                    <button class="remove-hook" onclick="hooksManager.removeHook('${hookId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        hooksList.innerHTML = hooksHtml;
    }

    removeHook(hookId) {
        const card = document.querySelector(`[data-hook="${hookId}"]`);
        const button = card?.querySelector('.hook-toggle');
        
        if (button) {
            this.toggleHook(hookId, button);
        }
    }

    async autoSetup() {
        this.showLoading('Setting up recommended hooks for your project...');
        
        try {
            // Auto-select essential hooks
            const essentialHooks = ['format-on-save', 'fix-imports', 'lint-check'];
            
            essentialHooks.forEach(hookId => {
                const card = document.querySelector(`[data-hook="${hookId}"]`);
                const button = card?.querySelector('.hook-toggle');
                
                if (button && button.dataset.state === 'off') {
                    this.toggleHook(hookId, button);
                }
            });
            
            // Save automatically
            await this.saveConfiguration();
            
            this.showSuccess('Auto-setup complete! Essential hooks have been configured.');
            
        } catch (error) {
            console.error('Auto-setup failed:', error);
            this.showError('Auto-setup failed. Please try configuring hooks manually.');
        }
    }

    viewCurrentHooks() {
        const enabledHooks = Array.from(this.selectedHooks);
        
        if (enabledHooks.length === 0) {
            this.showNotification('No hooks are currently enabled.', 'info');
            return;
        }
        
        const hookNames = enabledHooks.map(hookId => this.availableHooks[hookId]?.name).join(', ');
        this.showNotification(`Currently enabled: ${hookNames}`, 'info');
    }

    clearAllSelections() {
        this.selectedHooks.clear();
        
        document.querySelectorAll('.hook-card').forEach(card => {
            const button = card.querySelector('.hook-toggle');
            button.dataset.state = 'off';
            button.textContent = 'Enable';
            card.classList.remove('selected');
        });
        
        this.updateSummaryPanel();
    }

    async saveConfiguration() {
        if (this.selectedHooks.size === 0) {
            this.showError('No hooks selected to save.');
            return;
        }
        
        this.showLoading('Saving hook configuration...');
        
        try {
            // Generate configuration based on selected hooks
            const config = this.generateConfig();
            
            const response = await fetch('/api/hooks/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    config,
                    scope: 'project'
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Save failed');
            }
            
            this.currentConfig = config;
            this.showSuccess(`Successfully saved ${this.selectedHooks.size} hook(s)!`);
            
        } catch (error) {
            console.error('Save failed:', error);
            this.showError(`Save failed: ${error.message}`);
        }
    }

    generateConfig() {
        const config = {
            hooks: {
                'pre-commit': [],
                'pre-push': [],
                'commit-msg': []
            }
        };
        
        // Categorize selected hooks by when they should run
        this.selectedHooks.forEach(hookId => {
            const hook = this.availableHooks[hookId];
            if (hook) {
                const when = hook.when || 'pre-commit';
                if (config.hooks[when]) {
                    config.hooks[when].push(hook.command);
                }
            }
        });
        
        return config;
    }

    // Utility methods for user feedback

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

// Global functions for beginner-friendly demos and actions

/**
 * Enable all hybrid hooks with one click
 */
function enableAllHybridHooks() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '⏳ Activating all helpers...';
    button.disabled = true;
    
    // Simulate activation process
    setTimeout(() => {
        // Enable all hybrid hooks
        const hybridHooks = document.querySelectorAll('.hook-card.hybrid-hook .hook-toggle');
        hybridHooks.forEach(toggle => {
            toggle.textContent = '✅ Active';
            toggle.setAttribute('data-state', 'on');
            toggle.style.background = 'var(--success)';
            toggle.style.borderColor = 'var(--success)';
        });
        
        // Success message
        button.innerHTML = '🎉 All Helpers Activated!';
        button.style.background = 'var(--success)';
        
        // Show success notification
        showNotification('🎉 All instant AI helpers are now active! Start coding and watch the magic happen.', 'success');
        
        // Reset button after a moment
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.background = 'linear-gradient(135deg, #8b5cf6, #06b6d4)';
        }, 3000);
        
    }, 2000);
}

/**
 * Simulate error debugging demo
 */
function simulateError() {
    const demoArea = createDemoArea('error');
    
    // Show the problem
    demoArea.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="color: #ef4444; margin-bottom: 10px;">❌ Error in your code:</h4>
            <code style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; display: block; color: #fca5a5;">
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (UserList.jsx:15:23)
            </code>
        </div>
        <div style="text-align: center; color: var(--text-secondary);">
            <div class="spinner" style="display: inline-block;"></div>
            <span style="margin-left: 10px;">AI analyzing error...</span>
        </div>
    `;
    
    // Show instant help after a moment
    setTimeout(() => {
        demoArea.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px;">
                <h4 style="color: var(--success); margin-bottom: 10px;">🐛 INSTANT HELP (35ms):</h4>
                <div style="color: var(--text-primary); margin-bottom: 10px;">
                    <strong>Problem:</strong> You're trying to use .map() on 'users' but it's undefined
                </div>
                <div style="color: var(--text-primary); margin-bottom: 10px;">
                    <strong>📍 Location:</strong> UserList.jsx line 15
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; margin: 10px 0;">
                    <div style="color: #ef4444;">❌ const [users, setUsers] = useState();</div>
                    <div style="color: var(--success);">✅ const [users, setUsers] = useState([]);</div>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    💡 <strong>Why:</strong> React runs before data loads. Always give useState an initial value!
                </div>
            </div>
        `;
        showNotification('🐛 See? Instant error help that actually makes sense!', 'success');
    }, 1500);
}

/**
 * Simulate smart commit message demo
 */
function simulateCommit() {
    const demoArea = createDemoArea('commit');
    
    // Show the problem
    demoArea.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="color: #ef4444; margin-bottom: 10px;">😬 Your typical commit message:</h4>
            <code style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; display: block; color: #fca5a5;">
git commit -m "fixed stuff"
            </code>
        </div>
        <div style="text-align: center; color: var(--text-secondary);">
            <div class="spinner" style="display: inline-block;"></div>
            <span style="margin-left: 10px;">AI analyzing changes...</span>
        </div>
    `;
    
    // Show smart commit after a moment
    setTimeout(() => {
        demoArea.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px;">
                <h4 style="color: var(--success); margin-bottom: 10px;">🎯 SMART COMMIT (50ms):</h4>
                <code style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; display: block; color: var(--success); line-height: 1.6;">
fix: Resolve login button not responding on mobile devices

- Updated button touch targets for mobile accessibility
- Fixed CSS hover states conflicting with touch interactions  
- Added proper focus indicators for keyboard navigation

Fixes issue where users couldn't log in on phones
                </code>
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">
                    💡 <strong>Instant for simple changes, AI power for complex ones!</strong>
                </div>
            </div>
        `;
        showNotification('📝 Now THAT\\'s a professional commit message!', 'success');
    }, 1800);
}

/**
 * Simulate performance check demo
 */
function simulatePerformance() {
    const demoArea = createDemoArea('performance');
    
    // Show the problem
    demoArea.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="color: #ef4444; margin-bottom: 10px;">📁 You just added some images:</h4>
            <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px;">
                <div>• hero-image.jpg (15MB)</div>
                <div>• gallery-pic.png (8MB)</div>
                <div>• logo.bmp (12MB)</div>
            </div>
        </div>
        <div style="text-align: center; color: var(--text-secondary);">
            <div class="spinner" style="display: inline-block;"></div>
            <span style="margin-left: 10px;">Checking performance impact...</span>
        </div>
    `;
    
    // Show performance warning after a moment
    setTimeout(() => {
        demoArea.innerHTML = `
            <div style="background: rgba(251, 191, 36, 0.1); padding: 15px; border-radius: 8px;">
                <h4 style="color: var(--warning); margin-bottom: 10px;">⚡ PERFORMANCE ALERT (60ms):</h4>
                <div style="color: var(--text-primary); margin-bottom: 15px;">
                    <strong>🚨 Your page will take 47 seconds to load on mobile!</strong>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <div style="color: #ef4444;">Current: 35MB total</div>
                    <div style="color: var(--success);">Recommended: < 500KB</div>
                </div>
                <div style="color: var(--accent-primary); font-weight: 600; margin-bottom: 10px;">
                    ✨ INSTANT FIXES:
                </div>
                <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px;">
                    <li>Go to tinypng.com and drop your images there</li>
                    <li>Use .webp format for 90% smaller files</li>
                    <li>Or run: npm run optimize-images</li>
                </ul>
            </div>
        `;
        showNotification('⚡ Caught a performance issue before your users did!', 'warning');
    }, 1200);
}

/**
 * Create demo area for simulations
 */
function createDemoArea(type) {
    // Remove any existing demo areas
    const existing = document.querySelector('.demo-result');
    if (existing) existing.remove();
    
    // Create new demo area
    const demoArea = document.createElement('div');
    demoArea.className = 'demo-result';
    demoArea.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-secondary);
        border: 2px solid var(--accent-primary);
        border-radius: 12px;
        padding: 20px;
        max-width: 600px;
        width: 90vw;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 1000;
        backdrop-filter: blur(10px);
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => demoArea.remove();
    
    demoArea.appendChild(closeBtn);
    document.body.appendChild(demoArea);
    
    return demoArea;
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'warning' ? 'var(--warning)' : 'var(--accent-primary)'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 1001;
        font-weight: 500;
        max-width: 400px;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}