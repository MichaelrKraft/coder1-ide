/**
 * Hivemind Injection Script
 * 
 * Injects Hivemind button and modal dashboard into the working IDE version
 * without requiring React rebuilds that cause styling issues.
 */

(function() {
    'use strict';
    
    let hivemindModal = null;
    let currentSessionId = null;
    let socket = null;
    let agentsData = [];
    let sharedContext = {};
    
    // Configuration
    const CONFIG = {
        API_BASE: window.location.origin,
        BUTTON_RETRY_INTERVAL: 1000,
        MAX_BUTTON_RETRIES: 30,
        WEBSOCKET_RECONNECT_DELAY: 3000
    };
    
    /**
     * Initialize the Hivemind injection system
     */
    function initializeHivemind() {
        console.log('🧠 Initializing Hivemind injection system...');
        
        // Wait for IDE to load, then inject button
        waitForIDE().then(() => {
            injectHivemindButton();
            initializeWebSocket();
        }).catch(error => {
            console.error('Failed to initialize Hivemind:', error);
        });
    }
    
    /**
     * Wait for the IDE terminal buttons to be available
     */
    function waitForIDE() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const checkForButtons = () => {
                attempts++;
                
                // Look for terminal title bar buttons more specifically
                const searchStrategies = [
                    // Strategy 1: Look specifically for Supervision button (highest priority)
                    () => {
                        const allElements = document.querySelectorAll('*');
                        
                        for (const el of allElements) {
                            if (el.textContent && el.textContent.trim().includes('Supervision')) {
                                console.log('🎯 Found Supervision button:', el);
                                return el.parentElement;
                            }
                        }
                        return null;
                    },
                    
                    // Strategy 2: Look for buttons with known text content
                    () => {
                        const allElements = document.querySelectorAll('*');
                        const buttonTexts = ['Sleep Mode', 'Parallel Agents', 'Infinite Loop'];
                        
                        for (const text of buttonTexts) {
                            for (const el of allElements) {
                                if (el.textContent && el.textContent.trim().includes(text)) {
                                    console.log(`Found button with text "${text}":`, el);
                                    return el.parentElement;
                                }
                            }
                        }
                        return null;
                    },
                    
                    // Strategy 2: Look for multiple buttons in same container
                    () => {
                        const allButtons = document.querySelectorAll('button');
                        const containers = new Map();
                        
                        allButtons.forEach(btn => {
                            const parent = btn.parentElement;
                            if (parent) {
                                const count = containers.get(parent) || 0;
                                containers.set(parent, count + 1);
                            }
                        });
                        
                        // Find container with most buttons (likely the toolbar)
                        let bestContainer = null;
                        let maxButtons = 0;
                        containers.forEach((count, container) => {
                            if (count >= 2 && count > maxButtons) {
                                maxButtons = count;
                                bestContainer = container;
                            }
                        });
                        
                        return bestContainer;
                    },
                    
                    // Strategy 3: Look for specific CSS classes/selectors
                    () => {
                        const selectors = [
                            '[class*="toolbar"]',
                            '[class*="header"]',
                            '[class*="controls"]',
                            '[class*="buttons"]',
                            '[class*="terminal"] [class*="title"]',
                            '[class*="terminal"] [class*="bar"]'
                        ];
                        
                        for (const selector of selectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const el of elements) {
                                const buttons = el.querySelectorAll('button');
                                if (buttons.length >= 2) {
                                    return el;
                                }
                            }
                        }
                        return null;
                    }
                ];
                
                let buttonContainer = null;
                
                // Try each strategy
                for (const strategy of searchStrategies) {
                    buttonContainer = strategy();
                    if (buttonContainer) {
                        console.log('✅ Found IDE button container using strategy:', buttonContainer);
                        break;
                    }
                }
                
                if (buttonContainer) {
                    resolve(buttonContainer);
                } else if (attempts >= CONFIG.MAX_BUTTON_RETRIES) {
                    reject(new Error('Could not find IDE button container after maximum retries'));
                } else {
                    setTimeout(checkForButtons, CONFIG.BUTTON_RETRY_INTERVAL);
                }
            };
            
            checkForButtons();
        });
    }
    
    /**
     * Inject the Hivemind button into the IDE
     */
    function injectHivemindButton() {
        waitForIDE().then(buttonContainer => {
            // Check if button already exists
            if (document.getElementById('hivemind-button')) {
                console.log('Hivemind button already exists');
                return;
            }
            
            // Find the Supervision button specifically to place Hivemind next to it
            let supervisionButton = null;
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent && el.textContent.trim().includes('Supervision')) {
                    supervisionButton = el;
                    break;
                }
            }
            
            // Find an existing button to copy styles from (prefer Supervision button)
            const existingButton = supervisionButton || 
                                 buttonContainer.querySelector('button') || 
                                 buttonContainer.querySelector('[role="button"]') ||
                                 buttonContainer.querySelector('[class*="btn"]');
            
            // Create Hivemind button
            const hivemindButton = document.createElement('button');
            hivemindButton.id = 'hivemind-button';
            hivemindButton.innerHTML = '🧠 Hive Mind';
            hivemindButton.title = 'Open Hivemind Dashboard - Coordinate multiple agents with shared intelligence';
            
            // Copy styles from existing button
            if (existingButton) {
                const computedStyle = window.getComputedStyle(existingButton);
                const stylesToCopy = [
                    'backgroundColor', 'color', 'border', 'borderRadius', 
                    'padding', 'margin', 'fontSize', 'fontFamily', 'fontWeight',
                    'cursor', 'transition', 'boxShadow', 'height', 'lineHeight',
                    'display', 'alignItems', 'justifyContent', 'textAlign'
                ];
                
                stylesToCopy.forEach(prop => {
                    hivemindButton.style[prop] = computedStyle[prop];
                });
            } else {
                // Fallback styles that match terminal theme
                Object.assign(hivemindButton.style, {
                    backgroundColor: '#7aa2f7',
                    color: '#1a1b26',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '32px',
                    lineHeight: '1',
                    marginLeft: '8px'
                });
            }
            
            // Add hover effects
            hivemindButton.addEventListener('mouseenter', () => {
                hivemindButton.style.opacity = '0.8';
                hivemindButton.style.transform = 'translateY(-1px)';
            });
            
            hivemindButton.addEventListener('mouseleave', () => {
                hivemindButton.style.opacity = '1';
                hivemindButton.style.transform = 'translateY(0)';
            });
            
            // Add click handler
            hivemindButton.addEventListener('click', openHivemindModal);
            
            // Insert button next to Supervision button if found, otherwise append to container
            if (supervisionButton && supervisionButton.parentElement === buttonContainer) {
                // Insert directly after the Supervision button
                supervisionButton.insertAdjacentElement('afterend', hivemindButton);
                console.log('✅ Hivemind button injected next to Supervision button');
            } else {
                // Fallback: append to container
                buttonContainer.appendChild(hivemindButton);
                console.log('✅ Hivemind button injected into button container');
            }
        }).catch(error => {
            console.error('Failed to inject Hivemind button:', error);
        });
    }
    
    /**
     * Open the Hivemind modal dashboard
     */
    function openHivemindModal() {
        if (hivemindModal) {
            hivemindModal.style.display = 'flex';
            return;
        }
        
        createHivemindModal();
    }
    
    /**
     * Create the Hivemind modal dashboard
     */
    function createHivemindModal() {
        // Modal overlay
        hivemindModal = document.createElement('div');
        hivemindModal.id = 'hivemind-modal';
        Object.assign(hivemindModal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(26, 27, 38, 0.95)',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'hivemind-modal-content';
        Object.assign(modalContent.style, {
            backgroundColor: '#24283b',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '1000px',
            height: '700px',
            border: '1px solid #414868',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        });
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'hivemind-header';
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #414868'
        });
        
        const title = document.createElement('h2');
        title.textContent = '🧠 Hivemind Dashboard';
        Object.assign(title.style, {
            color: '#7aa2f7',
            fontSize: '24px',
            fontWeight: '600',
            margin: '0',
            fontFamily: 'Inter, sans-serif'
        });
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.title = 'Close Hivemind Dashboard';
        Object.assign(closeButton.style, {
            backgroundColor: 'transparent',
            border: 'none',
            color: '#c0caf5',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease'
        });
        
        closeButton.addEventListener('click', closeHivemindModal);
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = '#414868';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Modal body
        const body = document.createElement('div');
        body.className = 'hivemind-body';
        Object.assign(body.style, {
            flex: '1',
            overflow: 'auto',
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gap: '20px',
            color: '#c0caf5',
            fontFamily: 'Inter, sans-serif'
        });
        
        // Main content area
        const mainContent = createMainContent();
        
        // Sidebar
        const sidebar = createSidebar();
        
        body.appendChild(mainContent);
        body.appendChild(sidebar);
        
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        hivemindModal.appendChild(modalContent);
        
        // Add to DOM
        document.body.appendChild(hivemindModal);
        
        // Animate in
        setTimeout(() => {
            hivemindModal.style.opacity = '1';
        }, 10);
        
        // Close on overlay click
        hivemindModal.addEventListener('click', (e) => {
            if (e.target === hivemindModal) {
                closeHivemindModal();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && hivemindModal.style.display !== 'none') {
                closeHivemindModal();
            }
        });
        
        // Load initial data
        loadHivemindData();
    }
    
    /**
     * Create main content area
     */
    function createMainContent() {
        const mainContent = document.createElement('div');
        mainContent.className = 'hivemind-main';
        
        // Session controls
        const sessionControls = document.createElement('div');
        sessionControls.className = 'session-controls';
        Object.assign(sessionControls.style, {
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#1a1b26',
            borderRadius: '8px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
        });
        
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Hivemind Session';
        startButton.id = 'start-hivemind-btn';
        Object.assign(startButton.style, {
            backgroundColor: '#7aa2f7',
            color: '#1a1b26',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        });
        
        startButton.addEventListener('click', startHivemindSession);
        
        const stopButton = document.createElement('button');
        stopButton.textContent = 'Stop Session';
        stopButton.id = 'stop-hivemind-btn';
        stopButton.disabled = true;
        Object.assign(stopButton.style, {
            backgroundColor: '#f7768e',
            color: '#1a1b26',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: '0.5'
        });
        
        stopButton.addEventListener('click', stopHivemindSession);
        
        const sessionStatus = document.createElement('div');
        sessionStatus.id = 'session-status';
        sessionStatus.textContent = 'No active session';
        Object.assign(sessionStatus.style, {
            color: '#9ece6a',
            fontSize: '14px',
            fontWeight: '500'
        });
        
        sessionControls.appendChild(startButton);
        sessionControls.appendChild(stopButton);
        sessionControls.appendChild(sessionStatus);
        
        // Agents section
        const agentsSection = document.createElement('div');
        agentsSection.className = 'agents-section';
        
        const agentsTitle = document.createElement('h3');
        agentsTitle.textContent = 'Active Agents';
        Object.assign(agentsTitle.style, {
            color: '#7aa2f7',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '12px'
        });
        
        const agentsContainer = document.createElement('div');
        agentsContainer.id = 'agents-container';
        Object.assign(agentsContainer.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
        });
        
        agentsSection.appendChild(agentsTitle);
        agentsSection.appendChild(agentsContainer);
        
        mainContent.appendChild(sessionControls);
        mainContent.appendChild(agentsSection);
        
        return mainContent;
    }
    
    /**
     * Create sidebar
     */
    function createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'hivemind-sidebar';
        
        // Shared context section
        const contextSection = document.createElement('div');
        contextSection.className = 'context-section';
        Object.assign(contextSection.style, {
            backgroundColor: '#1a1b26',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
        });
        
        const contextTitle = document.createElement('h4');
        contextTitle.textContent = 'Shared Context';
        Object.assign(contextTitle.style, {
            color: '#7aa2f7',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px'
        });
        
        const contextContent = document.createElement('div');
        contextContent.id = 'shared-context';
        Object.assign(contextContent.style, {
            fontSize: '13px',
            lineHeight: '1.4',
            maxHeight: '200px',
            overflow: 'auto'
        });
        
        contextSection.appendChild(contextTitle);
        contextSection.appendChild(contextContent);
        
        // Discoveries section
        const discoveriesSection = document.createElement('div');
        discoveriesSection.className = 'discoveries-section';
        Object.assign(discoveriesSection.style, {
            backgroundColor: '#1a1b26',
            borderRadius: '8px',
            padding: '16px'
        });
        
        const discoveriesTitle = document.createElement('h4');
        discoveriesTitle.textContent = 'Recent Discoveries';
        Object.assign(discoveriesTitle.style, {
            color: '#7aa2f7',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px'
        });
        
        const discoveriesContent = document.createElement('div');
        discoveriesContent.id = 'discoveries-content';
        Object.assign(discoveriesContent.style, {
            fontSize: '13px',
            lineHeight: '1.4',
            maxHeight: '300px',
            overflow: 'auto'
        });
        
        discoveriesSection.appendChild(discoveriesTitle);
        discoveriesSection.appendChild(discoveriesContent);
        
        sidebar.appendChild(contextSection);
        sidebar.appendChild(discoveriesSection);
        
        return sidebar;
    }
    
    /**
     * Close the Hivemind modal
     */
    function closeHivemindModal() {
        if (hivemindModal) {
            hivemindModal.style.opacity = '0';
            setTimeout(() => {
                hivemindModal.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * Initialize WebSocket connection
     */
    function initializeWebSocket() {
        try {
            socket = io();
            
            socket.on('connect', () => {
                console.log('🔌 Connected to Hivemind WebSocket');
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Disconnected from Hivemind WebSocket');
                setTimeout(initializeWebSocket, CONFIG.WEBSOCKET_RECONNECT_DELAY);
            });
            
            // Hivemind event listeners
            socket.on('hivemind:session_started', handleSessionStarted);
            socket.on('hivemind:discovery', handleDiscovery);
            socket.on('hivemind:task_assigned', handleTaskAssigned);
            socket.on('hivemind:progress', handleProgress);
            socket.on('hivemind:task_completed', handleTaskCompleted);
            socket.on('hivemind:pattern', handlePattern);
            socket.on('hivemind:queen_changed', handleQueenChanged);
            socket.on('hivemind:session_stopped', handleSessionStopped);
            
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }
    
    /**
     * Start a new Hivemind session
     */
    async function startHivemindSession() {
        try {
            updateSessionStatus('Starting session...');
            
            const response = await fetch(`${CONFIG.API_BASE}/api/hivemind/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: 'user-' + Date.now(),
                    projectBrief: 'Hivemind collaborative development session',
                    taskDescription: 'Multi-agent coordination for enhanced development'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                currentSessionId = result.session.id;
                
                // Join WebSocket room
                if (socket) {
                    socket.emit('hivemind:join_session', { sessionId: currentSessionId });
                }
                
                updateSessionUI(true);
                updateSessionStatus('Session active: ' + currentSessionId);
                
                // Simulate some demo agents for now
                simulateDemoAgents();
                
                console.log('✅ Hivemind session started:', currentSessionId);
            } else {
                console.error('Failed to start session:', result.error);
                updateSessionStatus('Failed to start session: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error starting Hivemind session:', error);
            
            // Fallback to demo mode if API is not available
            console.log('🔄 API not available, starting demo mode...');
            currentSessionId = 'demo-session-' + Date.now();
            updateSessionUI(true);
            updateSessionStatus('Demo session active (API unavailable)');
            simulateDemoAgents();
        }
    }
    
    /**
     * Simulate demo agents for when API is not available
     */
    function simulateDemoAgents() {
        const demoAgents = [
            {
                id: 0,
                isQueen: true,
                status: 'coordinating',
                currentTask: 'Analyzing project requirements',
                completedTasks: 3
            },
            {
                id: 1,
                isQueen: false,
                status: 'coding',
                currentTask: 'Implementing user interface',
                completedTasks: 1
            },
            {
                id: 2,
                isQueen: false,
                status: 'testing',
                currentTask: 'Writing test cases',
                completedTasks: 2
            }
        ];
        
        updateAgentsDisplay(demoAgents);
        
        const demoContext = {
            discoveries: [
                {
                    timestamp: 'Recent',
                    content: 'Found optimal component structure for React app'
                },
                {
                    timestamp: '2 min ago',
                    content: 'Identified shared utility functions'
                }
            ],
            globalContext: {
                projectType: 'React Application',
                framework: 'Next.js',
                language: 'TypeScript'
            }
        };
        
        updateSharedContext(demoContext);
    }
    
    /**
     * Stop the current Hivemind session
     */
    async function stopHivemindSession() {
        if (!currentSessionId) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/api/hivemind/stop/${currentSessionId}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Leave WebSocket room
                if (socket) {
                    socket.emit('hivemind:leave_session', { sessionId: currentSessionId });
                }
                
                currentSessionId = null;
                updateSessionUI(false);
                updateSessionStatus('Session stopped');
                clearDashboardData();
                
                console.log('✅ Hivemind session stopped');
            }
        } catch (error) {
            console.error('Error stopping Hivemind session:', error);
        }
    }
    
    /**
     * Update session UI state
     */
    function updateSessionUI(active) {
        const startBtn = document.getElementById('start-hivemind-btn');
        const stopBtn = document.getElementById('stop-hivemind-btn');
        
        if (startBtn && stopBtn) {
            startBtn.disabled = active;
            stopBtn.disabled = !active;
            startBtn.style.opacity = active ? '0.5' : '1';
            stopBtn.style.opacity = active ? '1' : '0.5';
        }
    }
    
    /**
     * Update session status text
     */
    function updateSessionStatus(status) {
        const statusEl = document.getElementById('session-status');
        if (statusEl) {
            statusEl.textContent = status;
        }
    }
    
    /**
     * Load Hivemind data
     */
    function loadHivemindData() {
        if (!currentSessionId) {
            updateSessionStatus('No active session');
            return;
        }
        
        // Load session status
        fetch(`${CONFIG.API_BASE}/api/hivemind/status/${currentSessionId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error loading session:', data.error);
                    return;
                }
                
                updateAgentsDisplay(data.agents || []);
                updateSharedContext(data.sharedMemory || {});
            })
            .catch(error => {
                console.error('Error loading Hivemind data:', error);
            });
    }
    
    /**
     * Update agents display
     */
    function updateAgentsDisplay(agents) {
        const container = document.getElementById('agents-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        agents.forEach((agent, index) => {
            const agentCard = document.createElement('div');
            agentCard.className = 'agent-card';
            Object.assign(agentCard.style, {
                backgroundColor: '#1a1b26',
                borderRadius: '8px',
                padding: '12px',
                border: agent.isQueen ? '2px solid #7aa2f7' : '1px solid #414868'
            });
            
            agentCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: ${agent.isQueen ? '#7aa2f7' : '#c0caf5'};">
                        ${agent.isQueen ? '👑' : '🤖'} Agent ${index + 1}
                    </span>
                    <span style="font-size: 12px; color: #9ece6a;">
                        ${agent.status || 'idle'}
                    </span>
                </div>
                <div style="font-size: 13px; color: #a9b1d6; margin-bottom: 8px;">
                    ${agent.currentTask || 'No active task'}
                </div>
                <div style="font-size: 12px; color: #565f89;">
                    Completed: ${agent.completedTasks || 0} tasks
                </div>
            `;
            
            container.appendChild(agentCard);
        });
    }
    
    /**
     * Update shared context display
     */
    function updateSharedContext(memory) {
        const contextEl = document.getElementById('shared-context');
        const discoveriesEl = document.getElementById('discoveries-content');
        
        if (contextEl) {
            contextEl.innerHTML = Object.keys(memory).length > 0 ? 
                `<pre style="white-space: pre-wrap; margin: 0; font-size: 12px;">${JSON.stringify(memory, null, 2)}</pre>` :
                'No shared context available';
        }
        
        if (discoveriesEl && memory.discoveries) {
            discoveriesEl.innerHTML = memory.discoveries.length > 0 ?
                memory.discoveries.map(discovery => 
                    `<div style="margin-bottom: 8px; padding: 8px; background: #24283b; border-radius: 4px;">
                        <div style="font-size: 12px; color: #7aa2f7; margin-bottom: 4px;">${discovery.timestamp || 'Recent'}</div>
                        <div style="font-size: 13px;">${discovery.content || discovery}</div>
                    </div>`
                ).join('') :
                'No discoveries yet';
        }
    }
    
    /**
     * Clear dashboard data
     */
    function clearDashboardData() {
        updateAgentsDisplay([]);
        updateSharedContext({});
        agentsData = [];
        sharedContext = {};
    }
    
    // WebSocket event handlers
    function handleSessionStarted(data) {
        console.log('📡 Session started:', data);
        currentSessionId = data.sessionId;
        updateSessionUI(true);
        updateSessionStatus('Session active: ' + data.sessionId);
    }
    
    function handleDiscovery(data) {
        console.log('📡 New discovery:', data);
        loadHivemindData(); // Refresh data
    }
    
    function handleTaskAssigned(data) {
        console.log('📡 Task assigned:', data);
        loadHivemindData(); // Refresh data
    }
    
    function handleProgress(data) {
        console.log('📡 Progress update:', data);
        loadHivemindData(); // Refresh data
    }
    
    function handleTaskCompleted(data) {
        console.log('📡 Task completed:', data);
        loadHivemindData(); // Refresh data
    }
    
    function handlePattern(data) {
        console.log('📡 New pattern:', data);
        loadHivemindData(); // Refresh data
    }
    
    function handleQueenChanged(data) {
        console.log('📡 Queen changed:', data);
        loadHivemindData(); // Refresh data
    }
    
    function handleSessionStopped(data) {
        console.log('📡 Session stopped:', data);
        currentSessionId = null;
        updateSessionUI(false);
        updateSessionStatus('Session stopped');
        clearDashboardData();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHivemind);
    } else {
        initializeHivemind();
    }
    
    // Expose global functions for debugging
    window.hivemindDebug = {
        openModal: openHivemindModal,
        closeModal: closeHivemindModal,
        startSession: startHivemindSession,
        stopSession: stopHivemindSession,
        loadData: loadHivemindData,
        currentSessionId: () => currentSessionId
    };
    
})();