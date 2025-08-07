// Simple Terminal Button Injector
(function() {
    console.log('🔘 Simple Terminal Button Injector starting...');
    
    // Function to add the terminal button
    function addTerminalButton() {
        // Check if button already exists
        if (document.querySelector('.real-terminal-btn')) {
            return;
        }
        
        // Find terminal header
        const terminalHeader = document.querySelector('.terminal-header');
        if (!terminalHeader) {
            console.log('Terminal header not found yet');
            return false;
        }
        
        console.log('Found terminal header, adding button...');
        
        // Create button
        const btn = document.createElement('button');
        btn.className = 'terminal-control-btn real-terminal-btn';
        btn.innerHTML = '🖥️ Real Terminal';
        btn.title = 'Open Real System Terminal';
        btn.style.cssText = `
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
        
        // Add click handler
        btn.onclick = function() {
            alert('Real Terminal clicked!\n\nThe terminal integration requires:\n1. The server to be running (npm start)\n2. WebSocket connection to work\n\nDue to the macOS/Node.js issue, this may not work in the browser.\n\nTry using Terminal.app and running: claude');
            
            // Try to initialize real terminal
            if (window.RealTerminal) {
                console.log('RealTerminal class found, initializing...');
                // Terminal initialization code would go here
            } else {
                console.log('RealTerminal class not found');
            }
        };
        
        // Add to header
        terminalHeader.appendChild(btn);
        console.log('✅ Terminal button added!');
        return true;
    }
    
    // Try to add button immediately
    if (!addTerminalButton()) {
        // If not ready, wait for terminal to appear
        const observer = new MutationObserver(() => {
            if (addTerminalButton()) {
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also try periodically
        const interval = setInterval(() => {
            if (addTerminalButton()) {
                clearInterval(interval);
            }
        }, 1000);
        
        // Stop trying after 30 seconds
        setTimeout(() => {
            clearInterval(interval);
            observer.disconnect();
        }, 30000);
    }
})();