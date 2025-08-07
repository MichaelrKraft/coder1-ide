// Advanced Terminal Integration with xterm.js
(function() {
    'use strict';
    
    console.log('🔧 Loading xterm.js terminal integration...');
    
    // Load required libraries
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    function loadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
    
    // Initialize when page loads
    window.addEventListener('load', async function() {
        try {
            // Load xterm.js CSS
            loadCSS('https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css');
            
            // Load Socket.IO
            if (typeof io === 'undefined') {
                await loadScript('https://cdn.socket.io/4.7.5/socket.io.min.js');
            }
            
            // Load xterm.js
            await loadScript('https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js');
            await loadScript('https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js');
            
            console.log('✅ All libraries loaded');
            initializeXtermTerminal();
            
        } catch (error) {
            console.error('Failed to load dependencies:', error);
        }
    });
    
    function initializeXtermTerminal() {
        // Create floating button
        const button = document.createElement('button');
        button.innerHTML = '🖥️ Terminal';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        };
        
        let isOpen = false;
        let socket = null;
        let term = null;
        let terminalContainer = null;
        
        button.onclick = () => {
            if (!isOpen) {
                // Create terminal container
                terminalContainer = document.createElement('div');
                terminalContainer.style.cssText = `
                    position: fixed;
                    bottom: 70px;
                    right: 20px;
                    width: 800px;
                    height: 500px;
                    background: #000;
                    border: 2px solid #0066cc;
                    border-radius: 8px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                `;
                
                // Header
                const header = document.createElement('div');
                header.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: #1a1b26;
                    border-bottom: 1px solid #0066cc;
                    border-radius: 6px 6px 0 0;
                `;
                header.innerHTML = `
                    <span style="color: #fff; font-weight: bold;">
                        <span style="color: #0066cc;">●</span> Terminal - Connected to localhost:3001
                    </span>
                    <button id="closeXterm" style="background: none; border: none; color: #ff5555; cursor: pointer; font-size: 20px; padding: 0 5px;">×</button>
                `;
                
                // Terminal div
                const termDiv = document.createElement('div');
                termDiv.id = 'xterm-container';
                termDiv.style.cssText = 'flex: 1; padding: 5px; overflow: hidden;';
                
                terminalContainer.appendChild(header);
                terminalContainer.appendChild(termDiv);
                document.body.appendChild(terminalContainer);
                
                // Close button handler
                document.getElementById('closeXterm').onclick = closeTerminal;
                
                // Initialize xterm.js
                term = new Terminal({
                    cursorBlink: true,
                    fontSize: 14,
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    theme: {
                        background: '#1a1b26',
                        foreground: '#c0caf5',
                        cursor: '#c0caf5',
                        black: '#15161e',
                        red: '#f7768e',
                        green: '#9ece6a',
                        yellow: '#e0af68',
                        blue: '#7aa2f7',
                        magenta: '#bb9af7',
                        cyan: '#7dcfff',
                        white: '#a9b1d6',
                        brightBlack: '#414868',
                        brightRed: '#f7768e',
                        brightGreen: '#9ece6a',
                        brightYellow: '#e0af68',
                        brightBlue: '#7aa2f7',
                        brightMagenta: '#bb9af7',
                        brightCyan: '#7dcfff',
                        brightWhite: '#c0caf5'
                    }
                });
                
                const fitAddon = new FitAddon.FitAddon();
                term.loadAddon(fitAddon);
                term.open(termDiv);
                fitAddon.fit();
                
                // Connect to terminal server
                socket = io('http://localhost:3001', {
                    transports: ['websocket']
                });
                
                socket.on('connect', () => {
                    console.log('Connected to terminal server');
                    term.write('\\r\\n\\x1b[32m✓\\x1b[0m Connected to terminal server\\r\\n\\r\\n');
                    
                    // Create terminal with size
                    socket.emit('create-terminal', {
                        cols: term.cols,
                        rows: term.rows
                    });
                });
                
                let terminalId = null;
                
                socket.on('terminal-created', (data) => {
                    terminalId = data.id;
                    console.log('Terminal created:', terminalId);
                    
                    // Send terminal input to server
                    term.onData((data) => {
                        socket.emit('terminal-input', {
                            id: terminalId,
                            data: data
                        });
                    });
                    
                    // Handle resize
                    term.onResize(({ cols, rows }) => {
                        socket.emit('terminal-resize', {
                            id: terminalId,
                            cols: cols,
                            rows: rows
                        });
                    });
                });
                
                // Receive terminal output
                socket.on('terminal-data', (data) => {
                    if (data.id === terminalId) {
                        term.write(data.data);
                    }
                });
                
                socket.on('terminal-exit', (data) => {
                    if (data.id === terminalId) {
                        term.write('\\r\\n\\x1b[31mTerminal exited\\x1b[0m\\r\\n');
                    }
                });
                
                socket.on('connect_error', (error) => {
                    term.write('\\r\\n\\x1b[31m✗\\x1b[0m Failed to connect to terminal server\\r\\n');
                    term.write('\\r\\nMake sure terminal server is running:\\r\\n');
                    term.write('  \\x1b[33mnpm run terminal-server\\x1b[0m\\r\\n');
                });
                
                // Handle window resize
                window.addEventListener('resize', () => {
                    if (fitAddon && terminalContainer.style.display !== 'none') {
                        fitAddon.fit();
                    }
                });
                
                isOpen = true;
                button.innerHTML = '❌ Close';
                button.style.background = '#ff5555';
                
            } else {
                closeTerminal();
            }
        };
        
        function closeTerminal() {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            if (term) {
                term.dispose();
                term = null;
            }
            if (terminalContainer) {
                terminalContainer.remove();
                terminalContainer = null;
            }
            isOpen = false;
            button.innerHTML = '🖥️ Terminal';
            button.style.background = '#0066cc';
        }
        
        document.body.appendChild(button);
        console.log('✅ Xterm.js terminal button added!');
    }
})();