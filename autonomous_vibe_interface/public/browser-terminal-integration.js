// Browser Terminal Integration for Coder1 IDE
(function() {
    'use strict';
    
    console.log('🔧 Browser Terminal Integration loading...');
    
    // Check if Socket.IO is loaded
    if (typeof io === 'undefined') {
        console.error('Socket.IO not loaded. Loading from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        script.onload = () => initializeTerminalIntegration();
        document.head.appendChild(script);
        return;
    }
    
    initializeTerminalIntegration();
    
    function initializeTerminalIntegration() {
        let socket = null;
        let terminalId = null;
        let isTerminalMode = false;
        let terminalContainer = null;
        let originalContent = null;
        
        // Wait for IDE to be ready
        function waitForIDE() {
            const checkInterval = setInterval(() => {
                // Look for terminal area
                const terminalArea = document.querySelector('.terminal, [class*="terminal"], [class*="Terminal"]');
                const terminalHeader = document.querySelector('.terminal-header, [class*="terminal-header"], [class*="Terminal__header"]');
                
                if (terminalArea || terminalHeader) {
                    console.log('Found terminal area, adding browser terminal button...');
                    clearInterval(checkInterval);
                    addTerminalButton(terminalArea, terminalHeader);
                }
            }, 1000);
            
            // Stop after 30 seconds
            setTimeout(() => clearInterval(checkInterval), 30000);
        }
        
        function addTerminalButton(terminalArea, terminalHeader) {
            // Check if button already exists
            if (document.querySelector('.browser-terminal-btn')) {
                return;
            }
            
            // Create button
            const button = document.createElement('button');
            button.className = 'terminal-control-btn browser-terminal-btn';
            button.innerHTML = '🌐 Browser Terminal';
            button.title = 'Connect to local terminal server';
            
            // Style to match existing buttons
            const existingBtn = terminalHeader ? terminalHeader.querySelector('button') : null;
            if (existingBtn) {
                button.style.cssText = existingBtn.style.cssText;
                button.className = existingBtn.className + ' browser-terminal-btn';
            } else {
                button.style.cssText = `
                    padding: 6px 12px;
                    margin: 0 4px;
                    background: rgba(122, 162, 247, 0.1);
                    border: 1px solid rgba(122, 162, 247, 0.3);
                    border-radius: 4px;
                    color: #7aa2f7;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
            }
            
            button.addEventListener('mouseover', () => {
                button.style.background = 'rgba(122, 162, 247, 0.2)';
            });
            
            button.addEventListener('mouseout', () => {
                button.style.background = isTerminalMode ? 'rgba(122, 162, 247, 0.3)' : 'rgba(122, 162, 247, 0.1)';
            });
            
            // Add to header
            if (terminalHeader) {
                const buttons = terminalHeader.querySelectorAll('button');
                if (buttons.length > 0) {
                    const lastButton = buttons[buttons.length - 1];
                    lastButton.parentNode.insertBefore(button, lastButton.nextSibling);
                } else {
                    terminalHeader.appendChild(button);
                }
            } else if (terminalArea) {
                // Create header if none exists
                const header = document.createElement('div');
                header.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    background: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                `;
                header.appendChild(button);
                terminalArea.insertBefore(header, terminalArea.firstChild);
            }
            
            // Button click handler
            button.addEventListener('click', () => {
                toggleBrowserTerminal(terminalArea, button);
            });
        }
        
        function toggleBrowserTerminal(terminalArea, button) {
            if (isTerminalMode) {
                // Disconnect and restore original content
                if (socket) {
                    socket.disconnect();
                    socket = null;
                    terminalId = null;
                }
                
                if (terminalContainer) {
                    terminalContainer.remove();
                    terminalContainer = null;
                }
                
                if (originalContent) {
                    originalContent.style.display = '';
                }
                
                button.innerHTML = '🌐 Browser Terminal';
                button.style.background = 'rgba(122, 162, 247, 0.1)';
                isTerminalMode = false;
                
            } else {
                // Connect to terminal server
                console.log('Connecting to terminal server...');
                
                // Find content area
                let contentArea = terminalArea;
                const possibleContents = terminalArea.querySelectorAll(
                    '.xterm, .terminal-content, [class*="terminal__content"], [class*="Terminal__content"]'
                );
                
                if (possibleContents.length > 0) {
                    contentArea = possibleContents[0];
                }
                
                // Save and hide original content
                originalContent = contentArea;
                originalContent.style.display = 'none';
                
                // Create terminal container
                terminalContainer = document.createElement('div');
                terminalContainer.style.cssText = `
                    width: 100%;
                    height: 100%;
                    background: #1a1b26;
                    color: #c0caf5;
                    padding: 10px;
                    font-family: Monaco, Menlo, monospace;
                    font-size: 13px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    position: relative;
                `;
                
                // Add to parent
                const parent = contentArea.parentElement || terminalArea;
                parent.appendChild(terminalContainer);
                
                // Show connecting message
                terminalContainer.innerHTML = '<div style="color: #7aa2f7;">🔌 Connecting to terminal server...</div>';
                
                // Connect to server
                connectToTerminalServer(terminalContainer, button);
            }
        }
        
        function connectToTerminalServer(container, button) {
            socket = io('http://localhost:8080', {
                transports: ['websocket'],
                reconnection: true
            });
            
            let outputBuffer = '';
            
            socket.on('connect', () => {
                console.log('Connected to terminal server');
                container.innerHTML = '<div style="color: #9ece6a;">✅ Connected! Initializing terminal...</div>';
                
                // Create terminal
                socket.emit('create-terminal', {
                    cols: 80,
                    rows: 24
                });
                
                // Update button
                button.innerHTML = '💬 Chat Mode';
                button.style.background = 'rgba(122, 162, 247, 0.3)';
                isTerminalMode = true;
            });
            
            socket.on('terminal-created', (data) => {
                console.log('Terminal created:', data);
                terminalId = data.id;
                container.innerHTML = '';
                outputBuffer = '';
                
                // Create input area
                const inputLine = document.createElement('div');
                inputLine.style.cssText = `
                    display: flex;
                    align-items: center;
                    margin-top: 5px;
                `;
                
                const prompt = document.createElement('span');
                prompt.style.color = '#7aa2f7';
                prompt.textContent = '$ ';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.style.cssText = `
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #c0caf5;
                    font-family: inherit;
                    font-size: inherit;
                    margin-left: 5px;
                `;
                
                inputLine.appendChild(prompt);
                inputLine.appendChild(input);
                container.appendChild(inputLine);
                
                // Focus input
                input.focus();
                
                // Handle input
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const command = input.value;
                        if (command.trim()) {
                            // Show command in output
                            const cmdDiv = document.createElement('div');
                            cmdDiv.innerHTML = `<span style="color: #7aa2f7;">$ </span>${escapeHtml(command)}`;
                            container.insertBefore(cmdDiv, inputLine);
                            
                            // Send to terminal
                            socket.emit('terminal-input', {
                                id: terminalId,
                                data: command + '\r\n'
                            });
                            
                            input.value = '';
                        }
                    }
                });
            });
            
            socket.on('terminal-data', (data) => {
                if (data.id === terminalId) {
                    // Parse and display output
                    outputBuffer += data.data;
                    
                    // Simple ANSI color support
                    const coloredOutput = outputBuffer
                        .replace(/\x1b\[31m/g, '<span style="color: #f7768e;">')
                        .replace(/\x1b\[32m/g, '<span style="color: #9ece6a;">')
                        .replace(/\x1b\[33m/g, '<span style="color: #e0af68;">')
                        .replace(/\x1b\[34m/g, '<span style="color: #7aa2f7;">')
                        .replace(/\x1b\[35m/g, '<span style="color: #bb9af7;">')
                        .replace(/\x1b\[36m/g, '<span style="color: #7dcfff;">')
                        .replace(/\x1b\[0m/g, '</span>')
                        .replace(/\r\n/g, '\n')
                        .replace(/\r/g, '\n');
                    
                    const outputDiv = document.createElement('div');
                    outputDiv.innerHTML = coloredOutput;
                    
                    const inputLine = container.querySelector('input')?.parentElement;
                    if (inputLine) {
                        container.insertBefore(outputDiv, inputLine);
                    } else {
                        container.appendChild(outputDiv);
                    }
                    
                    // Scroll to bottom
                    container.scrollTop = container.scrollHeight;
                    
                    // Clear buffer after display
                    outputBuffer = '';
                }
            });
            
            socket.on('disconnect', () => {
                console.log('Disconnected from terminal server');
                if (container) {
                    container.innerHTML += '<div style="color: #f7768e;">❌ Disconnected from terminal server</div>';
                }
            });
            
            socket.on('connect_error', (error) => {
                console.error('Terminal connection error:', error);
                container.innerHTML = `
                    <div style="color: #f7768e;">
                        ❌ Could not connect to terminal server<br>
                        <br>
                        Make sure the server is running:<br>
                        <code style="background: rgba(255,255,255,0.1); padding: 4px; border-radius: 4px;">
                            npm run terminal-server
                        </code>
                    </div>
                `;
                
                // Revert button
                button.innerHTML = '🌐 Browser Terminal';
                button.style.background = 'rgba(122, 162, 247, 0.1)';
                isTerminalMode = false;
            });
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Start monitoring for IDE
        waitForIDE();
    }
})();