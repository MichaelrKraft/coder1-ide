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

    // ========================================
    // AI Generation Bar Functionality
    // ========================================

    // Store for generated config preview
    let currentGeneratedConfig = null;
    let userConfigs = [];

    // Initialize AI generation bar
    function initAIGenerationBar() {
        const generateBtn = document.getElementById('generateConfigBtn');
        const promptInput = document.getElementById('aiPromptInput');
        const exampleBtns = document.querySelectorAll('.example-btn');

        if (generateBtn && promptInput) {
            // Generate button click
            generateBtn.addEventListener('click', () => {
                const prompt = promptInput.value.trim();
                if (prompt) {
                    generateConfig(prompt);
                }
            });

            // Enter key to generate
            promptInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && promptInput.value.trim()) {
                    generateConfig(promptInput.value.trim());
                }
            });
        }

        // Example buttons
        exampleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                if (promptInput && prompt) {
                    promptInput.value = prompt;
                    generateConfig(prompt);
                }
            });
        });

        // Install buttons
        const installLocalBtn = document.getElementById('installLocalBtn');
        const installGlobalBtn = document.getElementById('installGlobalBtn');

        if (installLocalBtn) {
            installLocalBtn.addEventListener('click', () => installConfig('local'));
        }
        if (installGlobalBtn) {
            installGlobalBtn.addEventListener('click', () => installConfig('global'));
        }

        // Load user configs on page load
        loadUserConfigs();
    }

    // Generate config via AI
    async function generateConfig(prompt) {
        const generateBtn = document.getElementById('generateConfigBtn');
        const btnText = generateBtn?.querySelector('.btn-text');
        const btnLoading = generateBtn?.querySelector('.btn-loading');

        try {
            // Show loading state
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline-flex';
            if (generateBtn) generateBtn.disabled = true;

            // Detect config type from prompt
            const configType = detectConfigType(prompt);

            // Call the Claude config generation API
            const response = await fetch('/api/claude-config/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    context: {
                        type: configType,
                        userPrompt: prompt
                    }
                })
            });

            const result = await response.json();

            if (result.success && result.config) {
                // Store the full config object with type from API response
                currentGeneratedConfig = {
                    content: result.config,
                    type: result.type,  // Type comes from API, not config string
                    name: extractConfigName(result.config, result.type),
                    description: extractConfigDescription(result.config, result.type),
                    metadata: result.metadata
                };
                showPreviewModal(currentGeneratedConfig);
                showNotification('Config generated successfully!');
            } else {
                throw new Error(result.error || 'Generation failed');
            }

        } catch (error) {
            console.error('Generation error:', error);
            showNotification('Generation failed: ' + error.message);
        } finally {
            // Reset button state
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
        }
    }

    // Extract config name from generated content
    function extractConfigName(content, type) {
        if (!content) return 'Generated Config';

        // Try to find name in content
        const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/i) ||
                         content.match(/"name":\s*"([^"]+)"/i);
        if (nameMatch) return nameMatch[1].trim();

        // Fallback based on type
        const typeNames = {
            'skill': 'New Skill',
            'agent': 'New Agent',
            'hook': 'New Hook',
            'command': 'New Command',
            'mcp': 'New MCP Server',
            'template': 'New Template'
        };
        return typeNames[type] || 'Generated Config';
    }

    // Extract config description from generated content
    function extractConfigDescription(content, type) {
        if (!content) return '';

        // Try to find description in content
        const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/i) ||
                         content.match(/"description":\s*"([^"]+)"/i);
        if (descMatch) return descMatch[1].trim();

        return '';
    }

    // Detect config type from prompt
    // IMPORTANT: Check explicit type words FIRST before contextual keywords
    function detectConfigType(prompt) {
        const lower = prompt.toLowerCase();

        // Priority 1: Check for explicit type declarations (highest priority)
        // These are when user explicitly says "create a skill" or "make a hook"
        if (lower.includes('create a skill') || lower.includes('make a skill') || lower.includes('build a skill')) {
            return 'skill';
        }
        if (lower.includes('create a hook') || lower.includes('make a hook') || lower.includes('build a hook')) {
            return 'hook';
        }
        if (lower.includes('create a command') || lower.includes('make a command') || lower.includes('build a command')) {
            return 'command';
        }
        if (lower.includes('create an agent') || lower.includes('make an agent') || lower.includes('build an agent')) {
            return 'agent';
        }
        if (lower.includes('create a template') || lower.includes('make a template') || lower.includes('build a template')) {
            return 'template';
        }
        if (lower.includes('create an mcp') || lower.includes('make an mcp') || lower.includes('build an mcp')) {
            return 'mcp';
        }

        // Priority 2: Check for standalone type words at word boundaries
        // Use word boundary check to avoid false matches
        if (/\bskill\b/.test(lower)) {
            return 'skill';
        }
        if (/\bhook\b/.test(lower) || lower.includes('pre-commit') || lower.includes('post-')) {
            return 'hook';
        }
        if (/\bcommand\b/.test(lower) || lower.includes('slash')) {
            return 'command';
        }
        if (/\bmcp\b/.test(lower)) {
            return 'mcp';
        }
        if (/\btemplate\b/.test(lower) || lower.includes('starter') || lower.includes('boilerplate')) {
            return 'template';
        }

        // Priority 3: Contextual keywords (lowest priority)
        if (lower.includes('agent') || lower.includes('assistant') || lower.includes('reviewer') || lower.includes('bot')) {
            return 'agent';
        }

        // Default to agent
        return 'agent';
    }

    // Show preview modal
    function showPreviewModal(config) {
        const modal = document.getElementById('generationPreviewModal');
        const nameEl = document.getElementById('previewConfigName');
        const typeEl = document.getElementById('previewConfigType');
        const descEl = document.getElementById('previewConfigDescription');
        const capEl = document.getElementById('previewCapabilities');
        const permEl = document.getElementById('previewPermissions');
        const codeEl = document.getElementById('previewConfigContent');

        if (!modal) return;

        // Set content
        if (nameEl) nameEl.textContent = config.name || 'Generated Config';
        if (typeEl) typeEl.textContent = config.type || 'agent';
        if (descEl) descEl.textContent = config.description || '';

        // Capabilities
        if (capEl) {
            const capabilities = config.metadata?.capabilities || [];
            if (capabilities.length > 0) {
                capEl.innerHTML = `
                    <h4>Capabilities</h4>
                    <div class="capability-tags">
                        ${capabilities.map(c => `<span class="capability-tag">${c}</span>`).join('')}
                    </div>
                `;
                capEl.style.display = 'block';
            } else {
                capEl.style.display = 'none';
            }
        }

        // Permissions
        if (permEl) {
            const permissions = config.metadata?.permissions || [];
            if (permissions.length > 0) {
                permEl.innerHTML = `
                    <h4>Permissions</h4>
                    <div class="permission-tags">
                        ${permissions.map(p => `<span class="permission-tag ${p}">${p}</span>`).join('')}
                    </div>
                `;
                permEl.style.display = 'block';
            } else {
                permEl.style.display = 'none';
            }
        }

        // Code preview
        if (codeEl) {
            codeEl.textContent = config.content || '';
        }

        // Show modal
        modal.style.display = 'flex';
    }

    // Close preview modal
    window.closePreviewModal = function() {
        const modal = document.getElementById('generationPreviewModal');
        if (modal) {
            modal.style.display = 'none';
        }
        currentGeneratedConfig = null;
    };

    // Install config
    async function installConfig(location) {
        if (!currentGeneratedConfig) {
            showNotification('No config to install');
            return;
        }

        const btn = location === 'local'
            ? document.getElementById('installLocalBtn')
            : document.getElementById('installGlobalBtn');

        const originalText = btn?.textContent;

        try {
            if (btn) {
                btn.textContent = 'Installing...';
                btn.disabled = true;
            }

            const response = await fetch('/api/claude-config/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: currentGeneratedConfig.content,
                    name: currentGeneratedConfig.name,
                    type: currentGeneratedConfig.type,
                    location: location,
                    description: currentGeneratedConfig.description || ''
                })
            });

            const result = await response.json();

            if (result.success) {
                showNotification(`Config installed to ${location} successfully!`);
                closePreviewModal();

                // Add to user configs and refresh display
                await loadUserConfigs();
            } else {
                throw new Error(result.error || 'Installation failed');
            }

        } catch (error) {
            console.error('Install error:', error);
            showNotification('Installation failed: ' + error.message);
        } finally {
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    }

    // Load user configs and display them in the grid
    async function loadUserConfigs() {
        try {
            const response = await fetch('/api/claude-config/list');
            const result = await response.json();

            // API returns { success: true, configs: [...] } directly
            if (result.success && result.configs) {
                userConfigs = result.configs;
                displayUserConfigs(userConfigs);
                updateCategoryCounts();
            }
        } catch (error) {
            console.error('Failed to load user configs:', error);
        }
    }

    // Display user configs in the template grid
    function displayUserConfigs(configs) {
        const grid = document.getElementById('templatesGrid');
        if (!grid) return;

        // Remove existing user config cards
        grid.querySelectorAll('.template-card.user-created').forEach(card => card.remove());

        // Map config type to category for filtering
        const typeToCategory = {
            'agent': 'ai-agents',
            'hook': 'hooks',
            'skill': 'skills',
            'command': 'commands',
            'mcp': 'mcp',
            'template': 'all'
        };

        // Get current category filter (from the main page's variable)
        const currentCat = (typeof currentCategory !== 'undefined') ? currentCategory : 'all';

        // IDs of the 3 installable hooks that should always appear first
        const installableHookIds = ['session-complete-notifier', 'session-start-context', 'auto-test-on-edit'];

        // Add user config cards (filtered by current category)
        configs.forEach(config => {
            const configCategory = typeToCategory[config.type] || 'all';

            // Only show if matches current filter or showing all
            if (currentCat === 'all' || configCategory === currentCat) {
                const card = createUserConfigCard(config);
                card.dataset.category = configCategory;

                // For hooks: insert AFTER the 3 installable hooks, not at the beginning
                if (config.type === 'hook') {
                    // Find the last installable hook card
                    const lastInstallableHook = Array.from(grid.querySelectorAll('.coder1-template-card'))
                        .filter(c => installableHookIds.includes(c.dataset.templateId))
                        .pop();

                    if (lastInstallableHook && lastInstallableHook.nextSibling) {
                        grid.insertBefore(card, lastInstallableHook.nextSibling);
                    } else {
                        // Fallback: insert at beginning if installable hooks not found
                        grid.insertBefore(card, grid.firstChild);
                    }
                } else {
                    // For other types, insert at beginning as before
                    grid.insertBefore(card, grid.firstChild);
                }
            }
        });
    }

    // Create a card element for user config (matching built-in template card design)
    function createUserConfigCard(config) {
        const card = document.createElement('div');
        card.className = 'coder1-template-card coder1-card-3d user-created';
        card.dataset.templateId = config.id;
        card.dataset.category = config.type === 'agent' ? 'ai-agents' : config.type + 's';

        // Extract real name from content if config.name is generic
        let displayName = config.name;
        if (displayName === 'Unnamed skill' || displayName === 'Unnamed agent' || displayName.startsWith('Unnamed')) {
            // Try to extract name from content
            const nameMatch = config.content?.match(/name:\s*(.+?)(?:\n|$)/i);
            if (nameMatch) {
                displayName = nameMatch[1].trim();
            }
        }

        // Extract description from content if needed
        let displayDesc = config.description || '';
        if (!displayDesc || displayDesc.startsWith('name:')) {
            const descMatch = config.content?.match(/description:\s*(.+?)(?:\n|$)/i);
            if (descMatch) {
                displayDesc = descMatch[1].trim();
            }
        }

        // Map type to category label
        const categoryLabels = {
            'agent': 'AI AGENTS',
            'hook': 'HOOKS',
            'skill': 'SKILLS',
            'command': 'COMMANDS',
            'mcp': 'MCP INTEGRATIONS',
            'template': 'TEMPLATES'
        };

        // Generate some tags based on type
        const defaultTags = {
            'agent': ['AI', 'Assistant', 'Custom'],
            'hook': ['Automation', 'Workflow', 'Custom'],
            'skill': ['Learning', 'Guide', 'Custom'],
            'command': ['CLI', 'Shortcut', 'Custom'],
            'mcp': ['Integration', 'Server', 'Custom'],
            'template': ['Starter', 'Project', 'Custom']
        };
        const tags = config.metadata?.tags?.length > 0 ? config.metadata.tags : defaultTags[config.type] || ['Custom'];

        card.innerHTML = `
            <div class="template-header">
                <div class="template-category">${categoryLabels[config.type] || 'CUSTOM'}</div>
                <div class="template-name">${displayName}</div>
                <span class="user-config-badge">My Config</span>
            </div>
            <div class="template-description">${displayDesc}</div>
            <div class="template-tags">
                ${tags.slice(0, 4).map(tag => `<span class="template-tag">${tag}</span>`).join('')}
            </div>
            <div class="template-footer">
                <div class="template-stats">
                    <span class="stat"><i class="fas fa-star"></i> New</span>
                    <span class="stat"><i class="fas fa-folder"></i> ${config.location}</span>
                </div>
                <button class="quick-install coder1-btn" onclick="event.stopPropagation(); copyUserConfig(event, '${config.id}')">
                    <i class="fas fa-copy"></i> Copy Command
                </button>
            </div>
        `;

        // Add click handler to view config
        card.onclick = () => viewUserConfig(config.id);

        return card;
    }

    // View user config
    window.viewUserConfig = function(configId) {
        const config = userConfigs.find(c => c.id === configId);
        if (config) {
            currentGeneratedConfig = config;
            showPreviewModal(config);
        }
    };

    // Copy user config content to clipboard
    window.copyUserConfig = function(event, configId) {
        event.stopPropagation();

        const config = userConfigs.find(c => c.id === configId);
        if (!config) return;

        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;

        // Copy config content to clipboard
        navigator.clipboard.writeText(config.content || '').then(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = '#10b981';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2000);
        }).catch(() => {
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            btn.style.background = '#dc2626';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2000);
        });
    };

    // Delete user config
    window.deleteUserConfig = async function(configId) {
        if (!confirm('Are you sure you want to delete this config?')) return;

        try {
            const response = await fetch(`/api/claude-config/${configId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Config deleted successfully');
                await loadUserConfigs();
            } else {
                throw new Error(result.error || 'Deletion failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification('Failed to delete config: ' + error.message);
        }
    };

    // Update category counts including user configs AND pre-built templates
    function updateCategoryCounts() {
        const categoryPills = document.querySelectorAll('.category-pill');

        // Count pre-built templates by category (from global templates array)
        const builtInCounts = {
            'all': 0,
            'ai-agents': 0,
            'skills': 0,
            'hooks': 0,
            'commands': 0,
            'mcp': 0
        };

        // Count from the global templates array if it exists
        if (typeof templates !== 'undefined' && Array.isArray(templates)) {
            templates.forEach(t => {
                builtInCounts['all']++;
                const slug = t.categorySlug || '';
                if (slug === 'ai-agents') builtInCounts['ai-agents']++;
                else if (slug === 'skills') builtInCounts['skills']++;
                else if (slug === 'hooks') builtInCounts['hooks']++;
                else if (slug === 'commands') builtInCounts['commands']++;
                else if (slug === 'mcp') builtInCounts['mcp']++;
            });
        }

        // Count user configs by category
        const userCounts = {
            'all': userConfigs.length,
            'ai-agents': userConfigs.filter(c => c.type === 'agent').length,
            'skills': userConfigs.filter(c => c.type === 'skill').length,
            'hooks': userConfigs.filter(c => c.type === 'hook').length,
            'commands': userConfigs.filter(c => c.type === 'command').length,
            'mcp': userConfigs.filter(c => c.type === 'mcp').length
        };

        // Update all category pill counts (built-in + user configs)
        categoryPills.forEach(pill => {
            const category = pill.dataset.category;
            const countEl = pill.querySelector('.category-count');
            if (countEl && category) {
                const total = (builtInCounts[category] || 0) + (userCounts[category] || 0);
                countEl.textContent = total;
            }
        });
    }

    // Hook into renderTemplates to re-add user configs after filtering
    // The main page's renderTemplates() wipes the grid, so we need to re-add user cards
    function hookRenderTemplates() {
        const originalRenderTemplates = window.renderTemplates;
        if (typeof originalRenderTemplates === 'function') {
            window.renderTemplates = function() {
                // Call original render
                originalRenderTemplates.apply(this, arguments);
                // Re-add user config cards after grid is rebuilt
                if (userConfigs.length > 0) {
                    displayUserConfigs(userConfigs);
                }
            };
            console.log('Hooked into renderTemplates for user config persistence');
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAIGenerationBar();
            // Hook after a short delay to ensure renderTemplates is defined
            setTimeout(hookRenderTemplates, 200);
        });
    } else {
        setTimeout(() => {
            initAIGenerationBar();
            setTimeout(hookRenderTemplates, 200);
        }, 100);
    }

    // ========================================
    // Smart Hook One-Click Installation
    // ========================================

    // Installable hook IDs
    const INSTALLABLE_HOOKS = ['session-complete-notifier', 'session-start-context', 'auto-test-on-edit'];

    // Check if a hook is installable
    function isInstallableHook(templateId) {
        return INSTALLABLE_HOOKS.includes(templateId);
    }

    // Install a hook via API
    window.installHook = async function(event, hookId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const btn = event?.currentTarget || event?.target?.closest('button');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        const originalBg = btn.style.background;

        try {
            // Show loading state
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.disabled = true;
            btn.style.background = '#666';

            // Call installation API
            const response = await fetch('/api/hooks/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hookId: hookId,
                    scope: 'global'
                })
            });

            const result = await response.json();

            if (result.success) {
                if (result.alreadyInstalled) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Already Installed';
                    btn.style.background = '#059669';
                    showNotification(`Hook "${hookId}" is already installed`);
                } else {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed!';
                    btn.style.background = '#10b981';
                    showNotification(`Hook "${hookId}" installed! Restart Claude to activate.`);
                }

                // Keep success state
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                    btn.disabled = true;
                }, 2000);

            } else {
                throw new Error(result.error || 'Installation failed');
            }

        } catch (error) {
            console.error('Hook installation error:', error);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            btn.style.background = '#dc2626';
            showNotification('Installation failed: ' + error.message);

            // Reset after delay
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = originalBg;
                btn.disabled = false;
            }, 3000);
        }
    };

    // Show hook installation modal
    window.showHookInstallModal = function(hookId, hookName) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('hookInstallModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hookInstallModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <button class="modal-close" onclick="closeHookInstallModal()">&times;</button>
                    <div class="modal-header">
                        <h2 id="hookInstallName">Install Hook</h2>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="margin-bottom: 20px; color: #aaa;">Choose where to install this hook:</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="coder1-btn" id="installGlobalHookBtn" style="padding: 16px; font-size: 15px;">
                                <i class="fas fa-globe"></i> Install Globally
                                <span style="display: block; font-size: 12px; color: #888; margin-top: 4px;">All projects (~/. claude/hooks/)</span>
                            </button>
                            <button class="coder1-btn btn-secondary" id="installProjectHookBtn" style="padding: 16px; font-size: 15px;">
                                <i class="fas fa-folder"></i> Install to Project
                                <span style="display: block; font-size: 12px; color: #888; margin-top: 4px;">Current project only (.claude/hooks/)</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Set hook name
        document.getElementById('hookInstallName').textContent = `Install: ${hookName}`;

        // Set up button handlers
        document.getElementById('installGlobalHookBtn').onclick = async (e) => {
            await performHookInstall(hookId, 'global', e.currentTarget);
        };
        document.getElementById('installProjectHookBtn').onclick = async (e) => {
            await performHookInstall(hookId, 'project', e.currentTarget);
        };

        // Show modal
        modal.classList.add('active');
    };

    // Close hook install modal
    window.closeHookInstallModal = function() {
        const modal = document.getElementById('hookInstallModal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    // Perform hook installation
    async function performHookInstall(hookId, scope, btn) {
        const originalHTML = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.disabled = true;

            const response = await fetch('/api/hooks/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hookId: hookId,
                    scope: scope
                })
            });

            const result = await response.json();

            if (result.success) {
                btn.innerHTML = '<i class="fas fa-check"></i> Installed!';
                btn.style.background = '#10b981';

                const message = result.alreadyInstalled
                    ? `Hook already installed`
                    : `Hook installed ${scope === 'global' ? 'globally' : 'to project'}! Restart Claude to activate.`;
                showNotification(message);

                // Close modal after success
                setTimeout(() => {
                    closeHookInstallModal();
                    // Update the card button if visible
                    updateHookCardStatus(hookId, 'installed');
                }, 1500);

            } else {
                throw new Error(result.error || 'Installation failed');
            }

        } catch (error) {
            console.error('Hook installation error:', error);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            btn.style.background = '#dc2626';
            showNotification('Installation failed: ' + error.message);

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }
    }

    // Update hook card status after installation
    function updateHookCardStatus(hookId, status) {
        const card = document.querySelector(`[data-template-id="${hookId}"]`);
        if (!card) return;

        const btn = card.querySelector('.quick-install, .hook-install-btn');
        if (!btn) return;

        if (status === 'installed') {
            btn.innerHTML = '<i class="fas fa-check"></i> Installed';
            btn.style.background = '#10b981';
            btn.disabled = true;
            btn.onclick = null;
        }
    }

    // Check installation status for all hooks on page load
    async function checkHookInstallationStatus() {
        for (const hookId of INSTALLABLE_HOOKS) {
            try {
                const response = await fetch(`/api/hooks/install?hookId=${hookId}&scope=global`);
                const result = await response.json();

                if (result.installed) {
                    updateHookCardStatus(hookId, 'installed');
                }
            } catch (error) {
                // Silently fail - status check is optional
            }
        }
    }

    // Override card rendering to add Install buttons for hooks
    function enhanceHookCards() {
        // Find all hook cards
        const hookCards = document.querySelectorAll('.coder1-template-card[data-category="hooks"], .template-card[data-category="hooks"]');

        hookCards.forEach(card => {
            const templateId = card.dataset.templateId;
            if (!templateId) return;

            // Find the button
            const btn = card.querySelector('.quick-install, .template-btn');
            if (!btn) return;

            // Remove any existing onclick attribute from HTML
            btn.removeAttribute('onclick');

            if (isInstallableHook(templateId)) {
                // Installable hook - add Install button
                btn.innerHTML = '<i class="fas fa-download"></i> Install';
                btn.className = 'quick-install coder1-btn hook-install-btn';
                btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const name = card.querySelector('.template-name')?.textContent || templateId;
                    showHookInstallModal(templateId, name);
                };
            } else {
                // Non-installable hook - show Coming Soon
                btn.innerHTML = '<i class="fas fa-clock"></i> Coming Soon';
                btn.className = 'quick-install coder1-btn coming-soon-btn';
                btn.style.background = '#4b5563';
                btn.style.cursor = 'not-allowed';
                btn.disabled = true;
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showNotification('This hook is coming soon!');
                };
            }
        });
    }

    // Hook into page rendering
    function initHookEnhancements() {
        // Initial enhancement
        setTimeout(enhanceHookCards, 500);

        // Re-enhance after category changes
        const originalRenderTemplates = window.renderTemplates;
        if (typeof originalRenderTemplates === 'function') {
            window.renderTemplates = function() {
                originalRenderTemplates.apply(this, arguments);
                setTimeout(enhanceHookCards, 100);
            };
        }

        // Check installation status
        setTimeout(checkHookInstallationStatus, 1000);
    }

    // Initialize hook enhancements
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHookEnhancements);
    } else {
        setTimeout(initHookEnhancements, 100);
    }

    // ========================================
    // AI Agent One-Click Installation
    // ========================================

    // Install an AI agent via API
    window.installAgent = async function(event, agentId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const btn = event?.currentTarget || event?.target?.closest('button');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        const originalBg = btn.style.background;

        try {
            // Show loading state
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.disabled = true;
            btn.style.background = '#666';

            // Call installation API
            const response = await fetch('/api/agents/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agentId: agentId
                })
            });

            const result = await response.json();

            if (result.success) {
                if (result.alreadyInstalled) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Already Installed';
                    btn.style.background = '#059669';
                    showNotification(`Agent "${agentId}" is already installed`);
                } else {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed!';
                    btn.style.background = '#10b981';
                    showNotification(`Agent "${agentId}" installed! Restart Claude Code to use it.`);
                }

                // Keep success state
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                    btn.disabled = true;
                }, 2000);

            } else {
                throw new Error(result.error || 'Installation failed');
            }

        } catch (error) {
            console.error('Agent installation error:', error);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            btn.style.background = '#dc2626';
            showNotification('Installation failed: ' + error.message);

            // Reset after delay
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = originalBg;
                btn.disabled = false;
            }, 3000);
        }
    };

    // ========================================
    // Skills One-Click Installation
    // ========================================

    // Install a skill via API
    window.installSkill = async function(event, skillId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const btn = event?.currentTarget || event?.target?.closest('button');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        const originalBg = btn.style.background;

        try {
            // Show loading state
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.disabled = true;
            btn.style.background = '#666';

            // Call installation API
            const response = await fetch('/api/skills/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    skillId: skillId
                })
            });

            const result = await response.json();

            if (result.success) {
                if (result.alreadyInstalled) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Already Installed';
                    btn.style.background = '#059669';
                    showNotification(`Skill "${skillId}" is already installed`);
                } else {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed!';
                    btn.style.background = '#10b981';
                    showNotification(`Skill "${skillId}" installed! Restart Claude Code to use it.`);
                }

                // Keep success state
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                    btn.disabled = true;
                }, 2000);

            } else {
                throw new Error(result.error || 'Installation failed');
            }

        } catch (error) {
            console.error('Skill installation error:', error);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            btn.style.background = '#dc2626';
            showNotification('Installation failed: ' + error.message);

            // Reset after delay
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = originalBg;
                btn.disabled = false;
            }, 3000);
        }
    };

    // ========================================
    // Wcygan Slash Commands Integration
    // ========================================

    // GitHub repository info for wcygan commands
    const WCYGAN_REPO = {
        owner: 'wcygan',
        repo: 'dotfiles',
        branch: 'd8ab6b9f5a7a81007b7f5fa3025d4f83ce12cc02',
        path: 'claude/commands'
    };

    // Cache for wcygan commands
    let wcyganCommandsCache = [];
    let installedSlashCommands = new Set();
    let isLoadingWcygan = false;

    // Category icons and colors for wcygan commands
    const CATEGORY_ICONS = {
        debugging: '🐛', documentation: '📚', planning: '📋', quality: '⭐',
        refactoring: '🔧', testing: '🧪', optimization: '⚡', security: '🛡️',
        deployment: '🚀', architecture: '🏗️', database: '🗄️', frontend: '🎨',
        backend: '⚙️', devops: '🔄', general: '📦'
    };

    const CATEGORY_COLORS = {
        debugging: '#ff6b6b', documentation: '#4ecdc4', planning: '#45b7d1',
        quality: '#f9ca24', refactoring: '#6c5ce7', testing: '#a29bfe',
        optimization: '#fd79a8', security: '#e17055', deployment: '#00b894',
        architecture: '#fdcb6e', database: '#e84393', frontend: '#74b9ff',
        backend: '#55a3ff', devops: '#00cec9', general: '#636e72'
    };

    // Load wcygan commands from GitHub
    async function loadWcyganCommands() {
        if (isLoadingWcygan || wcyganCommandsCache.length > 0) return;

        try {
            isLoadingWcygan = true;

            // Check localStorage cache first
            const cached = localStorage.getItem('wcygan-commands-library');
            if (cached) {
                const library = JSON.parse(cached);
                const lastFetched = new Date(library.stats?.lastFetched || 0).getTime();
                if (Date.now() - lastFetched < 24 * 60 * 60 * 1000) { // 24 hour cache
                    wcyganCommandsCache = library.commands || [];
                    await checkInstalledSlashCommands();
                    displayWcyganCommands();
                    isLoadingWcygan = false;
                    return;
                }
            }

            // Fetch from GitHub
            const url = `https://api.github.com/repos/${WCYGAN_REPO.owner}/${WCYGAN_REPO.repo}/contents/${WCYGAN_REPO.path}?ref=${WCYGAN_REPO.branch}`;
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Coder1-IDE-Templates-Hub'
                }
            });

            if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

            const files = await response.json();
            const mdFiles = files.filter(f => f.name.endsWith('.md'));

            // Parse each command file
            const commands = [];
            for (const file of mdFiles) {
                try {
                    const contentRes = await fetch(file.download_url);
                    if (contentRes.ok) {
                        const content = await contentRes.text();
                        const cmd = parseWcyganCommand(file.name, content);
                        if (cmd) commands.push(cmd);
                    }
                } catch (e) {
                    console.warn(`Failed to parse ${file.name}:`, e);
                }
            }

            // Cache results
            wcyganCommandsCache = commands;
            localStorage.setItem('wcygan-commands-library', JSON.stringify({
                commands,
                stats: { lastFetched: new Date().toISOString() }
            }));

            // Check installed commands and display
            await checkInstalledSlashCommands();
            displayWcyganCommands();

        } catch (error) {
            console.error('Failed to load wcygan commands:', error);

            // Fall back to stale cache if available
            const cached = localStorage.getItem('wcygan-commands-library');
            if (cached) {
                try {
                    const library = JSON.parse(cached);
                    wcyganCommandsCache = library.commands || [];
                    console.log('Using stale cache due to GitHub error:', wcyganCommandsCache.length, 'commands');
                    await checkInstalledSlashCommands();
                    displayWcyganCommands();
                } catch (e) {
                    console.error('Failed to parse stale cache:', e);
                    displayWcyganError('GitHub rate limit exceeded. Please try again later.');
                }
            } else {
                displayWcyganError('Unable to load commands. GitHub rate limit may be exceeded.');
            }
        } finally {
            isLoadingWcygan = false;
        }
    }

    // Parse a wcygan command file
    function parseWcyganCommand(fileName, content) {
        const name = fileName.replace('.md', '');
        const slashCommand = `/${name}`;

        // Extract description from content
        const lines = content.split('\n').slice(0, 10);
        let description = 'Structured AI command workflow';

        const helpPattern = lines.find(l => l.startsWith('Help '));
        if (helpPattern) {
            description = helpPattern.replace('$ARGUMENTS', '').replace('Help ', '').trim();
        } else {
            const providePattern = lines.find(l => l.startsWith('Provide '));
            if (providePattern) {
                description = providePattern.replace('$ARGUMENTS', '').replace('Provide ', '').trim();
            } else {
                const meaningful = lines.find(l => l.length > 10 && !l.startsWith('#') && l.trim());
                if (meaningful) description = meaningful.trim().substring(0, 100);
            }
        }

        // Infer category
        const category = inferCommandCategory(name, content);

        // Infer complexity
        const lineCount = content.split('\n').length;
        const complexity = lineCount < 50 ? 'simple' : lineCount < 150 ? 'moderate' : 'complex';

        return {
            id: name,
            name: name,
            slashCommand,
            category,
            description,
            template: content,
            complexity,
            estimatedTime: complexity === 'simple' ? '2-5 min' : complexity === 'moderate' ? '5-15 min' : '15-30 min'
        };
    }

    // Infer command category
    function inferCommandCategory(name, content) {
        const n = name.toLowerCase();
        const t = content.toLowerCase();

        if (n.includes('debug') || n.includes('fix') || n.includes('error')) return 'debugging';
        if (n.includes('explain') || n.includes('doc')) return 'documentation';
        if (n.includes('plan') || n.includes('design') || n.includes('architect')) return 'planning';
        if (n.includes('review') || n.includes('audit') || n.includes('quality')) return 'quality';
        if (n.includes('refactor') || n.includes('improve') || n.includes('optimize')) return 'refactoring';
        if (n.includes('test') || n.includes('spec') || n.includes('validate')) return 'testing';
        if (n.includes('security') || n.includes('secure')) return 'security';
        if (n.includes('deploy') || n.includes('release')) return 'deployment';
        if (n.includes('database') || n.includes('db') || n.includes('sql')) return 'database';
        if (n.includes('frontend') || n.includes('ui') || n.includes('react')) return 'frontend';
        if (n.includes('backend') || n.includes('api') || n.includes('server')) return 'backend';
        if (t.includes('performance') || t.includes('speed')) return 'optimization';
        if (t.includes('architecture') || t.includes('system design')) return 'architecture';

        return 'general';
    }

    // Check which slash commands are installed
    async function checkInstalledSlashCommands() {
        try {
            const response = await fetch('/api/commands/install');
            if (response.ok) {
                const data = await response.json();
                installedSlashCommands = new Set(data.installedCommands || []);
            }
        } catch (e) {
            console.warn('Failed to check installed commands:', e);
        }
    }

    // Install a slash command via API
    window.installSlashCommand = async function(event, commandId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const btn = event?.currentTarget || event?.target?.closest('button');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        const cmd = wcyganCommandsCache.find(c => c.id === commandId);
        if (!cmd) {
            showNotification('Command not found');
            return;
        }

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.disabled = true;
            btn.style.background = '#666';

            const response = await fetch('/api/commands/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commandId: cmd.id,
                    content: cmd.template,
                    name: cmd.name
                })
            });

            const result = await response.json();

            if (result.success) {
                installedSlashCommands.add(cmd.id);

                if (result.alreadyInstalled) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Already Installed';
                    btn.style.background = '#059669';
                    showNotification(`Command "/${cmd.id}" is already installed`);
                } else {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed!';
                    btn.style.background = '#10b981';
                    showNotification(`Command "/${cmd.id}" installed to ~/.claude/commands/`);
                }

                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                    btn.disabled = true;
                }, 2000);
            } else {
                throw new Error(result.error || 'Installation failed');
            }
        } catch (error) {
            console.error('Command installation error:', error);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            btn.style.background = '#dc2626';
            showNotification('Installation failed: ' + error.message);

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }
    };

    // Display wcygan commands in the templates grid
    function displayWcyganCommands() {
        const grid = document.getElementById('templatesGrid');
        if (!grid) return;

        // Remove existing wcygan command cards
        grid.querySelectorAll('.wcygan-command-card').forEach(c => c.remove());

        // Only show if commands category is active or showing all
        const currentCat = (typeof currentCategory !== 'undefined') ? currentCategory : 'all';
        if (currentCat !== 'all' && currentCat !== 'commands') return;

        // Create and insert cards
        wcyganCommandsCache.forEach(cmd => {
            const card = createWcyganCommandCard(cmd);
            grid.appendChild(card);
        });

        // Update count
        const countEl = document.getElementById('slash-commands-count');
        if (countEl) {
            // Count existing quick commands + wcygan commands
            const existingCommandCount = (typeof templates !== 'undefined' && Array.isArray(templates))
                ? templates.filter(t => t.categorySlug === 'commands').length
                : 0;
            countEl.textContent = existingCommandCount + wcyganCommandsCache.length;
        }
    }

    // Display error message for wcygan commands
    function displayWcyganError(message) {
        const grid = document.getElementById('templatesGrid');
        if (!grid) return;

        // Only show if commands category is active or showing all
        const currentCat = (typeof currentCategory !== 'undefined') ? currentCategory : 'all';
        if (currentCat !== 'all' && currentCat !== 'commands') return;

        // Create error card
        const errorCard = document.createElement('div');
        errorCard.className = 'coder1-template-card wcygan-command-card wcygan-error-card';
        errorCard.dataset.category = 'commands';
        errorCard.dataset.templateId = 'wcygan-error';
        errorCard.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);';
        errorCard.innerHTML = `
            <div class="template-header">
                <div class="template-category" style="background: #ef444415; color: #ef4444; border: 1px solid #ef444440;">
                    <i class="fas fa-exclamation-triangle"></i> ERROR
                </div>
                <div class="template-name">Slash Commands Unavailable</div>
            </div>
            <div class="template-description" style="color: #f87171;">
                ${message}
            </div>
            <div class="template-footer" style="padding-top: 12px;">
                <button class="install-button" onclick="location.reload()" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
        grid.appendChild(errorCard);
    }

    // Create a card element for wcygan command
    function createWcyganCommandCard(cmd) {
        const card = document.createElement('div');
        card.className = 'coder1-template-card coder1-card-3d wcygan-command-card';
        card.dataset.templateId = cmd.id;
        card.dataset.category = 'commands';

        const isInstalled = installedSlashCommands.has(cmd.id);
        const icon = CATEGORY_ICONS[cmd.category] || '📦';
        const color = CATEGORY_COLORS[cmd.category] || '#636e72';

        card.innerHTML = `
            <div class="template-header">
                <div class="template-category" style="background: ${color}15; color: ${color}; border: 1px solid ${color}40;">
                    ${icon} ${cmd.category.toUpperCase()}
                </div>
                <div class="template-name">${cmd.slashCommand}</div>
                <span class="wcygan-badge" style="background: linear-gradient(135deg, #00d4ff, #00a3cc); font-size: 10px; padding: 2px 8px; border-radius: 10px;">wcygan</span>
            </div>
            <div class="template-description">${cmd.description}</div>
            <div class="template-tags">
                <span class="template-tag">${cmd.category}</span>
                <span class="template-tag">${cmd.complexity}</span>
            </div>
            <div class="template-footer">
                <div class="template-stats">
                    <span class="stat"><i class="fas fa-clock"></i> ${cmd.estimatedTime}</span>
                </div>
                <button class="quick-install coder1-btn slash-command-btn"
                        onclick="event.stopPropagation(); installSlashCommand(event, '${cmd.id}')"
                        style="${isInstalled ? 'background: #10b981;' : 'background: linear-gradient(135deg, #667eea, #764ba2);'}"
                        ${isInstalled ? 'disabled' : ''}>
                    <i class="fas fa-${isInstalled ? 'check' : 'download'}"></i>
                    ${isInstalled ? 'Installed' : 'Install'}
                </button>
            </div>
        `;

        // Click to view command details
        card.onclick = () => showSlashCommandModal(cmd);

        return card;
    }

    // Show modal for slash command details
    function showSlashCommandModal(cmd) {
        const icon = CATEGORY_ICONS[cmd.category] || '📦';
        const isInstalled = installedSlashCommands.has(cmd.id);

        // Use existing modal or create new one
        let modal = document.getElementById('slashCommandModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'slashCommandModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <button class="modal-close" onclick="document.getElementById('slashCommandModal').classList.remove('active')">&times;</button>
                <div class="modal-header">
                    <div class="modal-title">
                        <div class="template-category">${icon} ${cmd.category.toUpperCase()}</div>
                        <div class="template-name" style="font-size: 24px;">${cmd.slashCommand}</div>
                    </div>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <p style="color: #bbb; margin-bottom: 16px;">${cmd.description}</p>

                    <div style="background: #1a1a2e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="font-size: 12px; color: #888; margin-bottom: 8px;">USAGE</div>
                        <code style="color: #00d4ff; font-size: 14px;">${cmd.slashCommand} [target]</code>
                    </div>

                    <div style="background: #1a1a2e; border-radius: 8px; padding: 16px; margin-bottom: 16px; max-height: 200px; overflow-y: auto;">
                        <div style="font-size: 12px; color: #888; margin-bottom: 8px;">COMMAND TEMPLATE</div>
                        <pre style="color: #ccc; font-size: 12px; white-space: pre-wrap; margin: 0;">${escapeHtml(cmd.template.substring(0, 500))}${cmd.template.length > 500 ? '...' : ''}</pre>
                    </div>

                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="coder1-btn"
                                onclick="installSlashCommand(event, '${cmd.id}')"
                                style="${isInstalled ? 'background: #10b981;' : 'background: linear-gradient(135deg, #667eea, #764ba2);'} flex: 1; padding: 14px;"
                                ${isInstalled ? 'disabled' : ''}>
                            <i class="fas fa-${isInstalled ? 'check' : 'download'}"></i>
                            ${isInstalled ? 'Already Installed' : 'Install to ~/.claude/commands/'}
                        </button>
                    </div>

                    <p style="font-size: 11px; color: #666; margin-top: 12px; text-align: center;">
                        Source: github.com/wcygan/dotfiles
                    </p>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    // Helper to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Hook into page rendering to reload wcygan commands
    function initWcyganCommands() {
        // Load commands on page load
        loadWcyganCommands();

        // Re-display after category changes
        const originalRenderTemplates = window.renderTemplates;
        if (typeof originalRenderTemplates === 'function') {
            window.renderTemplates = function() {
                originalRenderTemplates.apply(this, arguments);
                if (wcyganCommandsCache.length > 0) {
                    setTimeout(displayWcyganCommands, 100);
                }
            };
        }
    }

    // Initialize wcygan commands
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWcyganCommands);
    } else {
        setTimeout(initWcyganCommands, 300);
    }

    // ========================================
    // Typewriter Effect for AI Prompt Placeholder
    // ========================================

    const typewriterPrompts = [
        "Build me a React code reviewer that checks for performance issues...",
        "Create a hook that notifies me when Claude finishes a task...",
        "Design an MCP server for database management...",
        "Build a security auditor agent for OWASP compliance..."
    ];

    let promptIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typewriterActive = true;

    function typeWriter() {
        const input = document.getElementById('aiPromptInput');
        if (!input || !typewriterActive) return;

        // Stop animation if user is focused on input
        if (document.activeElement === input) {
            setTimeout(typeWriter, 100);
            return;
        }

        const currentPrompt = typewriterPrompts[promptIndex];

        if (!isDeleting) {
            // Typing
            input.placeholder = currentPrompt.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentPrompt.length) {
                // Pause before deleting
                setTimeout(() => { isDeleting = true; typeWriter(); }, 2000);
                return;
            }
            setTimeout(typeWriter, 50); // Typing speed
        } else {
            // Deleting
            input.placeholder = currentPrompt.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                promptIndex = (promptIndex + 1) % typewriterPrompts.length;
            }
            setTimeout(typeWriter, 30); // Deleting speed (faster)
        }
    }

    // Start typewriter when DOM is ready
    function initTypewriter() {
        const input = document.getElementById('aiPromptInput');
        if (input) {
            // Clear initial placeholder
            input.placeholder = '';
            // Start animation after a brief delay
            setTimeout(typeWriter, 500);

            // Pause animation when user focuses input
            input.addEventListener('focus', () => {
                if (input.value === '') {
                    input.placeholder = 'Describe what you want to build...';
                }
            });

            // Resume animation when user leaves input (if empty)
            input.addEventListener('blur', () => {
                if (input.value === '') {
                    charIndex = 0;
                    isDeleting = false;
                }
            });
        }
    }

    // Initialize typewriter
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTypewriter);
    } else {
        setTimeout(initTypewriter, 200);
    }

})();