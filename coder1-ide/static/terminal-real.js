// Real Terminal Integration with xterm.js and Socket.IO
class RealTerminal {
    constructor() {
        this.socket = null;
        this.term = null;
        this.fitAddon = null;
        this.container = null;
        this.isConnected = false;
    }
    
    async initialize(container) {
        this.container = container;
        
        // Load required libraries
        await this.loadDependencies();
        
        // Create terminal instance
        this.term = new Terminal({
            theme: {
                background: '#1a1b26',
                foreground: '#c0caf5',
                cursor: '#c0caf5',
                selection: 'rgba(192, 202, 245, 0.3)',
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
            },
            fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
            tabStopWidth: 8,
            screenReaderMode: false
        });
        
        // Add fit addon
        this.fitAddon = new FitAddon.FitAddon();
        this.term.loadAddon(this.fitAddon);
        
        // Open terminal in container
        this.term.open(container);
        this.fitAddon.fit();
        
        // Connect to WebSocket
        await this.connectWebSocket();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.fitAddon) {
                this.fitAddon.fit();
            }
        });
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            // Try different connection URLs in order
            const urls = [
                'http://127.0.0.1:10000',
                'http://localhost:10000',
                `http://${window.location.hostname}:10000`
            ];
            
            let connected = false;
            let attempts = 0;
            
            const tryConnect = () => {
                if (attempts >= urls.length) {
                    this.showError('Failed to connect to terminal server. Please check if the server is running.');
                    reject(new Error('All connection attempts failed'));
                    return;
                }
                
                const url = urls[attempts];
                console.log(`Attempting to connect to terminal server at ${url}`);
                
                this.socket = io(url + '/terminal', {
                    transports: ['websocket'],
                    reconnectionAttempts: 3,
                    reconnectionDelay: 1000,
                    timeout: 5000
                });
                
                const timeoutId = setTimeout(() => {
                    if (!connected) {
                        console.log(`Connection to ${url} timed out`);
                        this.socket.disconnect();
                        attempts++;
                        tryConnect();
                    }
                }, 5000);
                
                this.socket.on('connect', () => {
                    clearTimeout(timeoutId);
                    connected = true;
                    this.isConnected = true;
                    console.log('✅ Connected to terminal server');
                    
                    // Create terminal
                    this.socket.emit('terminal:create', {
                        cols: this.term.cols,
                        rows: this.term.rows,
                        cwd: '/Users/michaelkraft'
                    });
                    
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    clearTimeout(timeoutId);
                    console.log(`Connection error for ${url}:`, error.message);
                    if (!connected) {
                        this.socket.disconnect();
                        attempts++;
                        tryConnect();
                    }
                });
                
                this.socket.on('terminal:created', (data) => {
                    console.log('Terminal created with PID:', data.pid);
                    this.term.write(`\x1b[32m✅ Terminal Ready (PID: ${data.pid})\x1b[0m\r\n`);
                });
                
                this.socket.on('terminal:data', (data) => {
                    this.term.write(data);
                });
                
                this.socket.on('terminal:exit', (data) => {
                    this.term.write('\r\n\x1b[31m[Terminal exited');
                    if (data.exitCode !== undefined) {
                        this.term.write(` with code ${data.exitCode}`);
                    }
                    this.term.write(']\x1b[0m\r\n');
                    this.isConnected = false;
                });
                
                this.socket.on('terminal:error', (data) => {
                    this.term.write(`\r\n\x1b[31mError: ${data.message}\x1b[0m\r\n`);
                });
                
                this.socket.on('disconnect', () => {
                    this.isConnected = false;
                    console.log('Disconnected from terminal server');
                });
                
                // Send terminal input to server
                this.term.onData((data) => {
                    if (this.isConnected && this.socket) {
                        this.socket.emit('terminal:data', data);
                    }
                });
                
                // Handle resize
                this.term.onResize((size) => {
                    if (this.isConnected && this.socket) {
                        this.socket.emit('terminal:resize', {
                            cols: size.cols,
                            rows: size.rows
                        });
                    }
                });
            };
            
            tryConnect();
        });
    }
    
    async loadDependencies() {
        // Check if dependencies are already loaded
        if (window.Terminal && window.FitAddon && window.io) {
            return;
        }
        
        const dependencies = [
            {
                test: () => window.Terminal,
                script: 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js',
                css: 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css'
            },
            {
                test: () => window.FitAddon,
                script: 'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js'
            },
            {
                test: () => window.io,
                script: 'https://cdn.socket.io/4.7.5/socket.io.min.js'
            }
        ];
        
        for (const dep of dependencies) {
            if (!dep.test()) {
                // Load CSS if specified
                if (dep.css) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = dep.css;
                    document.head.appendChild(link);
                }
                
                // Load script
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = dep.script;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
        }
    }
    
    showError(message) {
        if (this.term) {
            this.term.write(`\x1b[31m${message}\x1b[0m\r\n`);
        } else if (this.container) {
            this.container.innerHTML = `<div style="color: #f7768e; padding: 20px;">${message}</div>`;
        }
    }
    
    reconnect() {
        if (!this.isConnected && this.socket) {
            this.socket.connect();
        }
    }
    
    dispose() {
        if (this.socket) {
            this.socket.disconnect();
        }
        if (this.term) {
            this.term.dispose();
        }
    }
}

// Export for use
window.RealTerminal = RealTerminal;