// API Integration Script for Coder1 IDE
// This script injects API buttons into the React IDE after it loads

console.log('🔧 API Integration Script Loading...');

let authToken = localStorage.getItem('authToken');
let currentSession = null;

// Wait for React app to load
function waitForReactApp() {
    const maxAttempts = 50;
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        // Look for common IDE elements that indicate the app has loaded
        const rootElement = document.getElementById('root');
        const hasContent = rootElement && rootElement.children.length > 0;
        
        if (hasContent || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (hasContent) {
                console.log('✅ React IDE detected, injecting API functionality...');
                injectAPIButtons();
                setupAPIFunctions();
            } else {
                console.log('⚠️ Timeout waiting for React IDE to load');
            }
        }
    }, 200);
}

function injectAPIButtons() {
    // Create API control panel
    const apiPanel = document.createElement('div');
    apiPanel.id = 'api-control-panel';
    apiPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #24283b;
        border: 1px solid #414868;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        gap: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    // API Buttons
    const buttons = [
        { id: 'infinite-loop-btn', text: '🔄', title: 'Infinite Loop', color: '#bb9af7' },
        { id: 'supervision-btn', text: '👁️', title: 'Supervision', color: '#7aa2f7' },
        { id: 'parallel-agents-btn', text: '👥', title: 'Parallel Agents', color: '#9ece6a' },
        { id: 'hivemind-btn', text: '🧠', title: 'Hivemind', color: '#ff9e00' }
    ];
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.id = btn.id;
        button.innerHTML = btn.text;
        button.title = btn.title;
        button.style.cssText = `
            background: ${btn.color};
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            min-width: 40px;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = 'none';
        });
        
        apiPanel.appendChild(button);
    });
    
    // Status display
    const statusDisplay = document.createElement('div');
    statusDisplay.id = 'api-status';
    statusDisplay.textContent = 'Ready';
    statusDisplay.style.cssText = `
        background: #414868;
        color: #c0caf5;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        min-width: 60px;
        text-align: center;
    `;
    apiPanel.appendChild(statusDisplay);
    
    document.body.appendChild(apiPanel);
    
    console.log('✅ API buttons injected successfully');
}

function setupAPIFunctions() {
    // Infinite Loop
    document.getElementById('infinite-loop-btn').addEventListener('click', async () => {
        await startInfiniteLoop();
    });
    
    // Supervision
    document.getElementById('supervision-btn').addEventListener('click', async () => {
        updateStatus('Supervision Active');
        showNotification('🔍 Supervision Mode Activated');
        
        // Mock supervision behavior
        let supervisionCount = 0;
        const supervisionInterval = setInterval(() => {
            supervisionCount++;
            updateStatus(`Supervising: ${supervisionCount} operations`);
            
            if (supervisionCount >= 10) {
                clearInterval(supervisionInterval);
                updateStatus('Supervision Complete');
                showNotification('✅ Supervision cycle completed', 'success');
            }
        }, 2000);
    });
    
    // Parallel Agents
    document.getElementById('parallel-agents-btn').addEventListener('click', async () => {
        updateStatus('Launching Agents...');
        showNotification('👥 Starting 3 Parallel Agents');
        
        // Simulate parallel agent launches
        const agents = ['Agent-1', 'Agent-2', 'Agent-3'];
        let activeAgents = 0;
        
        agents.forEach((agent, index) => {
            setTimeout(() => {
                activeAgents++;
                showNotification(`🤖 ${agent} is now active`, 'success');
                updateStatus(`${activeAgents}/3 Agents Active`);
                
                if (activeAgents === 3) {
                    setTimeout(() => {
                        updateStatus('All Agents Running');
                        showNotification('🚀 Parallel processing at full capacity', 'success');
                    }, 1000);
                }
            }, (index + 1) * 1500);
        });
    });
    
    // Hivemind
    document.getElementById('hivemind-btn').addEventListener('click', async () => {
        updateStatus('Initializing...');
        showNotification('🧠 Starting Hivemind Coordination');
        
        try {
            const response = await fetch('/api/hivemind/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                updateStatus('Hivemind Active');
                showNotification('✅ Alpha, Beta, Gamma Agents Synchronized', 'success');
                
                // Poll hivemind status
                const pollHivemind = async () => {
                    try {
                        const statusResponse = await fetch(`/api/hivemind/status/${data.sessionId}`);
                        const statusData = await statusResponse.json();
                        
                        if (statusData.success) {
                            updateStatus(`Queen: ${statusData.queen} | Tasks: ${statusData.tasksCompleted}`);
                        }
                    } catch (error) {
                        console.error('Hivemind polling error:', error);
                    }
                };
                
                // Poll every 5 seconds
                setInterval(pollHivemind, 5000);
                pollHivemind(); // Initial poll
            }
        } catch (error) {
            updateStatus('Hivemind Error');
            showNotification(`❌ Failed to start Hivemind: ${error.message}`, 'error');
        }
    });
    
    console.log('✅ API functions bound to buttons');
}

async function startInfiniteLoop() {
    updateStatus('Starting...');
    showNotification('🔄 Starting Infinite Loop...');
    
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch('/api/infinite/start', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                command: 'create innovative React components'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            currentSession = data.sessionId;
            updateStatus(`Session: ${data.sessionId.substr(0, 8)}...`);
            showNotification(`✅ Infinite loop started - Session: ${data.sessionId}`, 'success');
            startPollingStatus();
        } else {
            updateStatus('Failed');
            showNotification(`❌ Failed: ${data.message}`, 'error');
        }
    } catch (error) {
        updateStatus('Error');
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

async function startPollingStatus() {
    if (!currentSession) return;
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`/api/infinite/status/${currentSession}`, {
            headers: headers
        });
        
        const data = await response.json();
        if (data.success) {
            updateStatus(`Wave ${data.currentWave} - ${data.totalGenerated} components`);
            
            if (data.status === 'running') {
                setTimeout(startPollingStatus, 3000);
            }
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

function updateStatus(text) {
    const statusEl = document.getElementById('api-status');
    if (statusEl) {
        statusEl.textContent = text;
    }
}

function showNotification(message, type = 'info') {
    // Create notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 10px;
        background: ${type === 'error' ? '#f7768e' : type === 'success' ? '#9ece6a' : '#7aa2f7'};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10000;
        max-width: 300px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Check auth status
if (!authToken) {
    setTimeout(() => {
        showNotification('ℹ️ Running in demo mode - full features available with authentication', 'info');
    }, 2000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForReactApp);
} else {
    waitForReactApp();
}

console.log('🚀 API Integration Script Ready');