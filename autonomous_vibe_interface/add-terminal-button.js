// Simple script to add terminal button to Coder1 IDE
// Run this in the browser console on the IDE page

(function() {
    console.log('Adding Browser Terminal button...');
    
    // Load Socket.IO if not present
    if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        script.onload = () => addTerminalButton();
        document.head.appendChild(script);
    } else {
        addTerminalButton();
    }
    
    function addTerminalButton() {
        // Create the button
        const button = document.createElement('button');
        button.innerHTML = '🌐 Browser Terminal';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        let isConnected = false;
        let socket = null;
        let terminalDiv = null;
        
        button.onclick = () => {
            if (!isConnected) {
                // Create terminal window
                terminalDiv = document.createElement('div');
                terminalDiv.style.cssText = `
                    position: fixed;
                    bottom: 70px;
                    right: 20px;
                    width: 600px;
                    height: 400px;
                    background: #1a1b26;
                    border: 2px solid #7aa2f7;
                    border-radius: 8px;
                    padding: 10px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                `;
                
                // Terminal header
                const header = document.createElement('div');
                header.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #7aa2f7;
                `;
                header.innerHTML = `
                    <span style="color: #7aa2f7; font-weight: bold;">Browser Terminal</span>
                    <button id="closeTerminal" style="background: none; border: none; color: #f7768e; cursor: pointer; font-size: 20px;">×</button>
                `;
                
                // Terminal content
                const content = document.createElement('div');
                content.id = 'terminalContent';
                content.style.cssText = `
                    flex: 1;
                    overflow-y: auto;
                    color: #c0caf5;
                    font-family: Monaco, Menlo, monospace;
                    font-size: 13px;
                    white-space: pre-wrap;
                `;
                content.innerHTML = '🔌 Connecting to terminal server...';
                
                terminalDiv.appendChild(header);
                terminalDiv.appendChild(content);
                document.body.appendChild(terminalDiv);
                
                // Close button
                document.getElementById('closeTerminal').onclick = () => {
                    if (socket) socket.disconnect();
                    terminalDiv.remove();
                    isConnected = false;
                    button.innerHTML = '🌐 Browser Terminal';
                };
                
                // Connect to terminal
                socket = io('http://localhost:3001', {
                    transports: ['websocket']
                });
                
                let terminalId = null;
                
                socket.on('connect', () => {
                    console.log('Connected to terminal server');
                    content.innerHTML = '✅ Connected! Initializing terminal...';
                    socket.emit('create-terminal', { cols: 80, rows: 24 });
                });
                
                socket.on('terminal-created', (data) => {
                    terminalId = data.id;
                    content.innerHTML = '';
                    
                    // Create input
                    const inputLine = document.createElement('div');
                    inputLine.style.cssText = 'display: flex; align-items: center;';
                    inputLine.innerHTML = '<span style="color: #7aa2f7;">$ </span>';
                    
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
                    
                    inputLine.appendChild(input);
                    content.appendChild(inputLine);
                    input.focus();
                    
                    input.onkeydown = (e) => {
                        if (e.key === 'Enter' && input.value.trim()) {
                            const cmd = input.value;
                            const cmdLine = document.createElement('div');
                            cmdLine.innerHTML = '<span style="color: #7aa2f7;">$ </span>' + cmd;
                            content.insertBefore(cmdLine, inputLine);
                            
                            socket.emit('terminal-input', {
                                id: terminalId,
                                data: cmd + '\\r\\n'
                            });
                            
                            input.value = '';
                        }
                    };
                });
                
                socket.on('terminal-data', (data) => {
                    if (data.id === terminalId) {
                        const output = document.createElement('div');
                        output.textContent = data.data;
                        const inputLine = content.querySelector('input')?.parentElement;
                        if (inputLine) {
                            content.insertBefore(output, inputLine);
                        }
                        content.scrollTop = content.scrollHeight;
                    }
                });
                
                socket.on('connect_error', () => {
                    content.innerHTML = `
                        <div style="color: #f7768e;">
                            ❌ Could not connect to terminal server<br><br>
                            Make sure the server is running:<br>
                            <code style="background: rgba(255,255,255,0.1); padding: 4px;">npm run terminal-server</code>
                        </div>
                    `;
                });
                
                isConnected = true;
                button.innerHTML = '❌ Close Terminal';
            } else {
                // Close terminal
                if (socket) socket.disconnect();
                if (terminalDiv) terminalDiv.remove();
                isConnected = false;
                button.innerHTML = '🌐 Browser Terminal';
            }
        };
        
        document.body.appendChild(button);
        console.log('✅ Browser Terminal button added!');
    }
})();