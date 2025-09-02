/**
 * Frontend integration for Live Session Viewing
 * Adds real-time Airtop session viewing to the Coder1 interface
 */

class LiveViewerIntegration {
    constructor() {
        this.activeViewers = new Map();
        this.init();
    }

    init() {
        // Add live viewer controls to the interface
        this.addLiveViewerControls();
        
        // Listen for build session events
        this.setupBuildSessionMonitoring();
        
        console.log('🔴 Live viewer integration initialized');
    }

    /**
     * Add live viewer controls to the sidebar
     */
    addLiveViewerControls() {
        // Find the sidebar and add live viewer section
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const liveViewerSection = document.createElement('div');
        liveViewerSection.className = 'sidebar-card glassmorphism';
        liveViewerSection.innerHTML = `
            <h3>🔴 Live Session Viewer</h3>
            <div class="live-viewer-controls">
                <button class="quick-action-btn" id="openLiveViewer" disabled>
                    <i class="fas fa-eye"></i>
                    <span>Watch Build Live</span>
                </button>
                <button class="quick-action-btn" id="takeScreenshot" disabled>
                    <i class="fas fa-camera"></i>
                    <span>Screenshot</span>
                </button>
                <div class="viewer-status" id="viewerStatus">
                    <span class="status-indicator offline"></span>
                    <span>No active session</span>
                </div>
            </div>
            <div class="active-sessions" id="activeSessions">
                <!-- Active viewing sessions will appear here -->
            </div>
        `;

        // Insert before the recent files section
        const recentFilesSection = sidebar.querySelector('.sidebar-card:last-child');
        if (recentFilesSection) {
            sidebar.insertBefore(liveViewerSection, recentFilesSection);
        } else {
            sidebar.appendChild(liveViewerSection);
        }

        // Add event listeners
        document.getElementById('openLiveViewer')?.addEventListener('click', () => {
            this.openLiveViewer();
        });

        document.getElementById('takeScreenshot')?.addEventListener('click', () => {
            this.takeScreenshot();
        });
    }

    /**
     * Monitor for build session events
     */
    setupBuildSessionMonitoring() {
        // Listen for autonomous build events
        document.addEventListener('autonomousBuildStarted', (event) => {
            this.handleBuildStarted(event.detail);
        });

        document.addEventListener('buildSessionActive', (event) => {
            this.handleBuildSessionActive(event.detail);
        });

        // Override the build monitoring to detect Airtop sessions
        const originalCheckBuildSessionStatus = window.coder1Interface?.checkBuildSessionStatus;
        if (originalCheckBuildSessionStatus) {
            window.coder1Interface.checkBuildSessionStatus = async (buildSessionId) => {
                const result = await originalCheckBuildSessionStatus.call(window.coder1Interface, buildSessionId);
                
                // Check if this build session has an associated Airtop session
                this.checkForAirtopSession(buildSessionId);
                
                return result;
            };
        }
    }

    /**
     * Handle build started event
     */
    handleBuildStarted(buildData) {
        console.log('🚀 Build started, looking for Airtop session...', buildData);
        
        this.updateViewerStatus('🔍 Looking for browser session...', 'searching');
        
        // Start polling for Airtop session
        this.pollForAirtopSession(buildData.buildSessionId || buildData.taskId);
    }

    /**
     * Handle build session becoming active
     */
    handleBuildSessionActive(sessionData) {
        if (sessionData.airtopSessionId) {
            this.enableLiveViewing(sessionData.airtopSessionId);
        }
    }

    /**
     * Poll for Airtop session associated with build
     */
    async pollForAirtopSession(buildSessionId, maxAttempts = 20) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // Check if build session has browser automation started
                const response = await fetch(`/api/agent/build-sessions/${buildSessionId}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.success && data.data.airtopSessionId) {
                        this.enableLiveViewing(data.data.airtopSessionId);
                        return;
                    }
                }
                
                await this.delay(2000); // Wait 2 seconds between attempts
                
            } catch (error) {
                console.warn('Error polling for Airtop session:', error);
            }
        }
        
        this.updateViewerStatus('❌ No browser session found', 'offline');
    }

    /**
     * Enable live viewing for an Airtop session
     */
    async enableLiveViewing(airtopSessionId) {
        try {
            console.log('🔴 Enabling live viewing for session:', airtopSessionId);
            
            this.currentAirtopSessionId = airtopSessionId;
            this.updateViewerStatus('✅ Live session ready', 'online');
            
            // Enable controls
            document.getElementById('openLiveViewer').disabled = false;
            document.getElementById('takeScreenshot').disabled = false;
            
            // Show notification
            this.showNotification('🔴 Live viewing available! Click "Watch Build Live" to see Claude Code in action.', 'success');
            
        } catch (error) {
            console.error('Failed to enable live viewing:', error);
            this.updateViewerStatus('❌ Viewing setup failed', 'error');
        }
    }

    /**
     * Open live viewer in new window
     */
    async openLiveViewer() {
        if (!this.currentAirtopSessionId) {
            this.showNotification('❌ No active session to view', 'error');
            return;
        }

        try {
            console.log('🔴 Opening live viewer...');
            
            // Get viewing URL
            const response = await fetch(`/api/agent/live-viewer/${this.currentAirtopSessionId}?quality=high&interactive=true`);
            
            if (!response.ok) {
                throw new Error('Failed to get viewing URL');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Open in new window
                const viewerWindow = window.open(
                    data.data.viewingUrl,
                    'airtop-live-viewer',
                    'width=1200,height=800,scrollbars=yes,resizable=yes'
                );
                
                if (viewerWindow) {
                    this.showNotification('🔴 Live viewer opened! Watch Claude Code build your website in real-time.', 'success');
                    
                    // Track the viewer
                    this.activeViewers.set(this.currentAirtopSessionId, {
                        window: viewerWindow,
                        sessionId: this.currentAirtopSessionId,
                        startTime: Date.now()
                    });
                } else {
                    this.showNotification('❌ Popup blocked. Please allow popups and try again.', 'warning');
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Failed to open live viewer:', error);
            this.showNotification(`❌ Failed to open live viewer: ${error.message}`, 'error');
        }
    }

    /**
     * Take screenshot of current session
     */
    async takeScreenshot() {
        if (!this.currentAirtopSessionId) {
            this.showNotification('❌ No active session to screenshot', 'error');
            return;
        }

        try {
            console.log('📸 Taking screenshot...');
            
            const response = await fetch(`/api/agent/live-viewer/${this.currentAirtopSessionId}/screenshot`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to take screenshot');
            }
            
            const data = await response.json();
            
            if (data.success && data.data.url) {
                // Create download link
                const link = document.createElement('a');
                link.href = data.data.url;
                link.download = `claude-code-screenshot-${Date.now()}.png`;
                link.click();
                
                this.showNotification('📸 Screenshot captured and downloaded!', 'success');
            } else {
                throw new Error(data.error || 'Screenshot URL not available');
            }
            
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            this.showNotification(`❌ Screenshot failed: ${error.message}`, 'error');
        }
    }

    /**
     * Update viewer status display
     */
    updateViewerStatus(message, status = 'offline') {
        const statusElement = document.getElementById('viewerStatus');
        if (!statusElement) return;

        const indicator = statusElement.querySelector('.status-indicator');
        const textSpan = statusElement.querySelector('span:last-child');

        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }

        if (textSpan) {
            textSpan.textContent = message;
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles if not already present
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 400px;
                    padding: 16px;
                    border-radius: 8px;
                    color: white;
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                }
                
                .notification.success { background: #28a745; }
                .notification.error { background: #dc3545; }
                .notification.warning { background: #ffc107; color: #000; }
                .notification.info { background: #17a2b8; }
                
                .notification-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Add close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    /**
     * Utility: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.coder1Interface) {
        window.liveViewerIntegration = new LiveViewerIntegration();
    }
});