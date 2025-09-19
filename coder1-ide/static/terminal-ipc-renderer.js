// Terminal IPC Renderer - Uses Electron IPC instead of WebSocket
class TerminalIPCRenderer {
    constructor() {
        this.terminal = null;
        this.fitAddon = null;
        this.terminalId = null;
        this.container = null;
        this.isInitialized = false;
    }
    
    async initialize(container) {
        this.container = container;
        
        // Load xterm.js dependencies
        await this.loadDependencies();
        
        // Create terminal
        this.terminal = new Terminal({
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
            scrollback: 1000
        });
        
        // Add fit addon
        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        
        // Open terminal in container
        this.terminal.open(container);
        this.fitAddon.fit();
        
        // Set up IPC communication
        await this.setupIPC();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.fitAddon) {
                this.fitAddon.fit();
            }
        });
        
        this.isInitialized = true;
    }
    
    async setupIPC() {
        // Create terminal session via IPC
        const result = await window.electronAPI.terminal.create({
            cols: this.terminal.cols,
            rows: this.terminal.rows,
            cwd: process.env.HOME || '/Users/michaelkraft'
        });
        
        if (result.success) {
            this.terminalId = result.id;
            console.log('Terminal created with ID:', this.terminalId);
            
            // Listen for terminal output
            window.electronAPI.terminal.onData((data) => {
                if (data.id === this.terminalId) {
                    this.terminal.write(data.data);
                }
            });
            
            // Listen for terminal exit
            window.electronAPI.terminal.onExit((data) => {
                if (data.id === this.terminalId) {
                    this.terminal.write('\r\n\x1b[31m[Terminal exited');
                    if (data.exitCode !== undefined) {
                        this.terminal.write(` with code ${data.exitCode}`);
                    }
                    this.terminal.write(']\x1b[0m\r\n');
                    this.terminalId = null;
                }
            });
            
            // Send terminal input via IPC
            this.terminal.onData((data) => {
                if (this.terminalId) {
                    window.electronAPI.terminal.write(this.terminalId, data);
                }
            });
            
            // Handle resize
            this.terminal.onResize((size) => {
                if (this.terminalId) {
                    window.electronAPI.terminal.resize(this.terminalId, size.cols, size.rows);
                }
            });
        } else {
            this.terminal.write('\x1b[31mFailed to create terminal: ' + result.error + '\x1b[0m\r\n');
        }
    }
    
    async loadDependencies() {
        // Check if already loaded
        if (window.Terminal && window.FitAddon) {
            return;
        }
        
        // Load xterm.css
        if (!document.querySelector('link[href*="xterm.css"]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
            document.head.appendChild(css);
        }
        
        // Load xterm.js
        if (!window.Terminal) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Load fit addon
        if (!window.FitAddon) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }
    
    dispose() {
        if (this.terminalId) {
            window.electronAPI.terminal.close(this.terminalId);
        }
        if (this.terminal) {
            this.terminal.dispose();
        }
        window.electronAPI.terminal.removeAllListeners();
    }
    
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            if (this.fitAddon) {
                this.fitAddon.fit();
            }
        }
    }
    
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
}

// Export for use
window.TerminalIPCRenderer = TerminalIPCRenderer;