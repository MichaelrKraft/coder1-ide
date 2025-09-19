/**
 * Orchestrator Loader - Optimized code splitting implementation
 * Loads orchestrator modules on demand to reduce initial bundle size
 */

class OrchestratorLoader {
    constructor() {
        this.modules = new Map();
        this.loadingPromises = new Map();
        this.baseUrl = '/js/orchestrator-modules/';
    }

    /**
     * Load a specific module on demand
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
     * Load multiple modules in parallel
     */
    async loadModules(moduleNames) {
        const promises = moduleNames.map(name => this.loadModule(name));
        return Promise.all(promises);
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
                const module = window.OrchestratorModules?.[moduleName];
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
     * Preload critical modules
     */
    async preloadCritical() {
        const criticalModules = ['core', 'ui', 'socket'];
        return this.loadModules(criticalModules);
    }

    /**
     * Load modules based on user interaction
     */
    async loadForInteraction(interactionType) {
        const moduleMap = {
            'consultation': ['consultation', 'timer', 'phases'],
            'fileUpload': ['fileHandler', 'uploadUI'],
            'voice': ['voiceRecognition', 'voiceUI'],
            'export': ['exportHandler', 'planGenerator'],
            'animation': ['confetti', 'timeline']
        };

        const modules = moduleMap[interactionType] || [];
        if (modules.length > 0) {
            return this.loadModules(modules);
        }
    }
}

// Initialize global loader instance
window.orchestratorLoader = new OrchestratorLoader();

// Initialize orchestrator app with lazy loading
class OrchestratorAppOptimized {
    constructor() {
        this.loader = window.orchestratorLoader;
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize core functionality
     */
    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._performInit();
        await this.initPromise;
        this.initialized = true;
    }

    async _performInit() {
        console.log('[Orchestrator] Loading core modules...');
        
        // Load only critical modules on init
        const [core, ui, socket] = await this.loader.loadModules(['core', 'ui', 'socket']);
        
        this.core = new core.OrchestratorCore();
        this.ui = new ui.OrchestratorUI(this.core);
        this.socket = new socket.OrchestratorSocket(this.core);
        
        // Setup basic event listeners
        this.setupMinimalEventListeners();
        
        // Connect socket
        await this.socket.connect();
        
        console.log('[Orchestrator] Core initialization complete');
    }

    /**
     * Setup minimal event listeners for lazy loading
     */
    setupMinimalEventListeners() {
        // Start consultation button
        const startBtn = document.getElementById('start-consultation-btn');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                await this.startConsultation();
            });
        }

        // Enter key on query input
        const queryInput = document.getElementById('user-query');
        if (queryInput) {
            queryInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    await this.startConsultation();
                }
            });
        }

        // File upload area - lazy load on hover
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('mouseenter', () => {
                this.loader.loadForInteraction('fileUpload');
            }, { once: true });
        }

        // Voice input button - lazy load on hover
        const voiceBtn = document.querySelector('.voice-input-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('mouseenter', () => {
                this.loader.loadForInteraction('voice');
            }, { once: true });
        }
    }

    /**
     * Start consultation with lazy loading
     */
    async startConsultation() {
        // Check if PRD Genius is available first
        if (window.prdGenius) {
            const userQuery = document.getElementById('user-query')?.value?.trim() || '';
            if (!userQuery) {
                alert('Please describe what you want to build');
                return;
            }

            console.log('[Orchestrator] Launching PRD Genius with query:', userQuery);
            
            // Pre-fill the project description
            window.prdGenius.wizardResponses['project-description'] = userQuery;
            
            // Reset and show PRD Genius
            window.prdGenius.currentStep = 0;
            window.prdGenius.comprehensiveMode = false;
            window.prdGenius.showingChoiceScreen = false;
            window.prdGenius.show();
            
            // Hide setup screen
            const setupScreen = document.getElementById('setup-screen');
            if (setupScreen) {
                setupScreen.style.display = 'none';
            }
            
            return;
        }

        // Fallback to traditional consultation
        console.log('[Orchestrator] Loading consultation modules...');
        const [consultation, timer, phases] = await this.loader.loadModules([
            'consultation', 'timer', 'phases'
        ]);

        this.consultation = new consultation.ConsultationHandler(this.core, this.socket);
        this.timer = new timer.ConsultationTimer();
        this.phases = new phases.PhaseManager(this.ui);

        await this.consultation.start();
    }

    /**
     * Handle file upload with lazy loading
     */
    async handleFileUpload(files) {
        console.log('[Orchestrator] Loading file handler...');
        const [fileHandler] = await this.loader.loadModules(['fileHandler']);
        
        this.fileHandler = this.fileHandler || new fileHandler.FileHandler(this.core);
        return this.fileHandler.handleFiles(files);
    }

    /**
     * Export plan with lazy loading
     */
    async exportPlan() {
        console.log('[Orchestrator] Loading export handler...');
        const [exportHandler] = await this.loader.loadModules(['exportHandler', 'planGenerator']);
        
        this.exportHandler = this.exportHandler || new exportHandler.ExportHandler(this.core);
        return this.exportHandler.export();
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        window.orchestratorApp = new OrchestratorAppOptimized();
        await window.orchestratorApp.init();
    });
} else {
    // DOM already loaded
    window.orchestratorApp = new OrchestratorAppOptimized();
    window.orchestratorApp.init();
}

// Expose global functions for backward compatibility
window.startConsultation = async () => {
    if (window.orchestratorApp) {
        await window.orchestratorApp.startConsultation();
    }
};

window.exportPlan = async () => {
    if (window.orchestratorApp) {
        await window.orchestratorApp.exportPlan();
    }
};