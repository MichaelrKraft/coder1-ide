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

        // Add user config cards (filtered by current category)
        configs.forEach(config => {
            const configCategory = typeToCategory[config.type] || 'all';

            // Only show if matches current filter or showing all
            if (currentCat === 'all' || configCategory === currentCat) {
                const card = createUserConfigCard(config);
                card.dataset.category = configCategory;
                grid.insertBefore(card, grid.firstChild);
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

})();