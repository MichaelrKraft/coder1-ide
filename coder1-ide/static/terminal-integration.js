// Terminal Integration Script for Coder1 IDE
(function() {
    'use strict';
    
    console.log('🚀 Terminal Integration initializing...');
    
    let realTerminal = null;
    let isRealTerminalMode = false;
    
    // Wait for page to be ready
    function waitForTerminal() {
        const checkInterval = setInterval(() => {
            // Look for terminal container
            const terminalContainer = document.querySelector('.xterm');
            const terminalHeader = document.querySelector('.terminal-header');
            
            if (!terminalContainer || !terminalHeader) return;
            
            console.log('Found terminal container, adding real terminal button...');
            
            // Check if button already exists
            if (document.querySelector('.real-terminal-btn')) {
                clearInterval(checkInterval);
                return;
            }
            
            // Create Real Terminal button
            const realTermBtn = document.createElement('button');
            realTermBtn.className = 'terminal-control-btn real-terminal-btn';
            realTermBtn.innerHTML = '🖥️ Real Terminal';
            realTermBtn.title = 'Switch to Real System Terminal';
            realTermBtn.style.cssText = `
                margin-right: 10px;
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: #c0caf5;
                padding: 4px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            `;
            
            // Add hover effect
            realTermBtn.onmouseover = () => {
                realTermBtn.style.background = 'rgba(139, 92, 246, 0.2)';
                realTermBtn.style.borderColor = 'rgba(139, 92, 246, 0.5)';
            };
            
            realTermBtn.onmouseout = () => {
                if (!isRealTerminalMode) {
                    realTermBtn.style.background = 'rgba(139, 92, 246, 0.1)';
                    realTermBtn.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                }
            };
            
            // Find a good place to insert the button
            const micButton = terminalHeader.querySelector('.microphone');
            const shellButton = terminalHeader.querySelector('.terminal-mode');
            const insertPoint = shellButton || micButton;
            
            if (insertPoint) {
                insertPoint.parentNode.insertBefore(realTermBtn, insertPoint.nextSibling);
            } else {
                // Insert at the end of the header
                terminalHeader.appendChild(realTermBtn);
            }
            
            // Add click handler
            realTermBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await toggleRealTerminal(terminalContainer, realTermBtn);
            });
            
            clearInterval(checkInterval);
            console.log('✅ Real Terminal button added');
            
        }, 500);
        
        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }
    
    async function toggleRealTerminal(container, button) {
        if (isRealTerminalMode) {
            // Switch back to chat terminal
            if (realTerminal) {
                realTerminal.dispose();
                realTerminal = null;
            }
            
            // Remove real terminal container
            const realTermContainer = document.getElementById('real-terminal-container');
            if (realTermContainer) {
                realTermContainer.remove();
            }
            
            // Show original terminal
            container.style.display = '';
            
            // Update button
            button.innerHTML = '🖥️ Real Terminal';
            button.style.background = 'rgba(139, 92, 246, 0.1)';
            button.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            
            isRealTerminalMode = false;
            
        } else {
            // Switch to real terminal
            console.log('Switching to real terminal mode...');
            
            // Hide original terminal
            container.style.display = 'none';
            
            // Create container for real terminal
            const realTermContainer = document.createElement('div');
            realTermContainer.id = 'real-terminal-container';
            realTermContainer.style.cssText = `
                width: 100%;
                height: 100%;
                background: #1a1b26;
                position: relative;
            `;
            
            container.parentNode.insertBefore(realTermContainer, container.nextSibling);
            
            // Load and initialize real terminal
            try {
                // Load the RealTerminal class if not already loaded
                if (!window.RealTerminal) {
                    await loadScript('/static/terminal-real.js');
                }
                
                realTerminal = new RealTerminal();
                await realTerminal.initialize(realTermContainer);
                
                // Update button to active state
                button.innerHTML = '💬 Chat Mode';
                button.style.background = 'rgba(139, 92, 246, 0.3)';
                button.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                
                isRealTerminalMode = true;
                
            } catch (error) {
                console.error('Failed to initialize real terminal:', error);
                
                // Show error message
                realTermContainer.innerHTML = `
                    <div style="padding: 20px; color: #f7768e;">
                        <h3>Failed to connect to terminal server</h3>
                        <p>Make sure the Autonomous Vibe Interface server is running on port 10000.</p>
                        <p>Error: ${error.message}</p>
                        <button onclick="location.reload()" style="
                            margin-top: 10px;
                            padding: 8px 16px;
                            background: rgba(139, 92, 246, 0.2);
                            border: 1px solid rgba(139, 92, 246, 0.5);
                            color: #c0caf5;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Reload Page</button>
                    </div>
                `;
                
                // Revert button state
                button.innerHTML = '🖥️ Real Terminal';
                button.style.background = 'rgba(139, 92, 246, 0.1)';
                button.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                
                // Clean up
                setTimeout(() => {
                    realTermContainer.remove();
                    container.style.display = '';
                    isRealTerminalMode = false;
                }, 5000);
            }
        }
    }
    
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Initialize
    setTimeout(() => {
        waitForTerminal();
    }, 1000);
    
})();