/**
 * PRD Genius Optimized - Lazy Loading Implementation
 * Loads PRD Genius modules on demand to reduce initial bundle size
 */

class PRDGeniusLoader {
    constructor() {
        this.modules = new Map();
        this.loadingPromises = new Map();
        this.baseUrl = '/js/prd-genius-modules/';
        this.instance = null;
        this.isLoading = false;
    }

    /**
     * Get or create PRD Genius instance
     */
    async getInstance() {
        if (this.instance) {
            return this.instance;
        }

        if (this.isLoading) {
            return this.loadingPromise;
        }

        this.isLoading = true;
        this.loadingPromise = this._loadCore();
        
        try {
            this.instance = await this.loadingPromise;
            return this.instance;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load core PRD Genius functionality
     */
    async _loadCore() {
        console.log('[PRD Genius] Loading core module...');
        
        // Load core and UI modules in parallel
        const [core, ui, patterns] = await Promise.all([
            this.loadModule('core'),
            this.loadModule('ui'),
            this.loadModule('patterns')
        ]);

        // Create instance with loaded modules
        const instance = new core.PRDGeniusCore();
        instance.ui = new ui.PRDGeniusUI(instance);
        instance.patterns = patterns.repositoryPatterns;

        // Setup initial UI
        instance.ui.init();

        console.log('[PRD Genius] Core modules loaded');
        return instance;
    }

    /**
     * Load a specific module
     */
    async loadModule(moduleName) {
        // Return cached module if already loaded
        if (this.modules.has(moduleName)) {
            return this.modules.get(moduleName);
        }

        // Return existing loading promise if module is currently loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // Start loading the module
        const loadPromise = this._loadModuleScript(moduleName);
        this.loadingPromises.set(moduleName, loadPromise);

        try {
            const module = await loadPromise;
            this.modules.set(moduleName, module);
            this.loadingPromises.delete(moduleName);
            return module;
        } catch (error) {
            this.loadingPromises.delete(moduleName);
            throw error;
        }
    }

    /**
     * Internal method to load a module script
     */
    _loadModuleScript(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${this.baseUrl}${moduleName}.js`;
            script.type = 'module';
            
            script.onload = () => {
                // Module should register itself on window
                const module = window.PRDGeniusModules?.[moduleName];
                if (module) {
                    resolve(module);
                } else {
                    reject(new Error(`Module ${moduleName} did not register properly`));
                }
            };

            script.onerror = () => {
                reject(new Error(`Failed to load module: ${moduleName}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Show PRD Genius
     */
    async show() {
        const instance = await this.getInstance();
        return instance.show();
    }

    /**
     * Hide PRD Genius
     */
    async hide() {
        if (this.instance) {
            return this.instance.hide();
        }
    }

    /**
     * Check if PRD Genius is active
     */
    isActive() {
        return this.instance?.isActive || false;
    }

    /**
     * Pre-fill wizard responses
     */
    async prefillResponse(key, value) {
        const instance = await this.getInstance();
        instance.wizardResponses[key] = value;
    }

    /**
     * Load advanced features on demand
     */
    async loadAdvancedFeatures() {
        console.log('[PRD Genius] Loading advanced features...');
        
        const [templates, export_, analytics] = await Promise.all([
            this.loadModule('templates'),
            this.loadModule('export'),
            this.loadModule('analytics')
        ]);

        if (this.instance) {
            this.instance.templates = templates;
            this.instance.export = export_;
            this.instance.analytics = analytics;
        }

        console.log('[PRD Genius] Advanced features loaded');
        return { templates, export: export_, analytics };
    }
}

// Create global loader instance
window.prdGeniusLoader = new PRDGeniusLoader();

// Create proxy object that mimics the original PRDGenius interface
// but loads modules on demand
window.prdGenius = new Proxy({}, {
    get: function(target, prop) {
        const loader = window.prdGeniusLoader;
        
        // Special handling for common methods
        if (prop === 'show') {
            return async function() {
                const instance = await loader.getInstance();
                return instance.show();
            };
        }
        
        if (prop === 'hide') {
            return async function() {
                const instance = await loader.getInstance();
                return instance.hide();
            };
        }
        
        if (prop === 'wizardResponses') {
            // Return a proxy that will update the actual instance when loaded
            return new Proxy({}, {
                set: async function(target, key, value) {
                    const instance = await loader.getInstance();
                    instance.wizardResponses[key] = value;
                    return true;
                },
                get: async function(target, key) {
                    const instance = await loader.getInstance();
                    return instance.wizardResponses[key];
                }
            });
        }
        
        // For other properties, get from instance
        return async function(...args) {
            const instance = await loader.getInstance();
            if (typeof instance[prop] === 'function') {
                return instance[prop].apply(instance, args);
            }
            return instance[prop];
        };
    },
    
    set: async function(target, prop, value) {
        const instance = await window.prdGeniusLoader.getInstance();
        instance[prop] = value;
        return true;
    }
});

// Preload on user interaction hints
document.addEventListener('DOMContentLoaded', function() {
    // Preload when user hovers over relevant areas
    const triggers = [
        '#user-query',
        '#prd-genius-toggle',
        '.prd-genius-trigger'
    ];
    
    triggers.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('mouseenter', function() {
                // Start loading in background
                window.prdGeniusLoader.getInstance().catch(console.error);
            }, { once: true });
        }
    });
    
    // Also preload if URL contains prd parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('prd') || urlParams.has('genius')) {
        setTimeout(() => {
            window.prdGeniusLoader.getInstance().catch(console.error);
        }, 1000);
    }
});

console.log('[PRD Genius] Optimized loader initialized');