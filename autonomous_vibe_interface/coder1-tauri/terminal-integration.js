// Tauri Terminal Integration for Coder1 IDE
// This integrates with tauri-plugin-pty to provide real terminal support

import { invoke } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

let terminal = null;
let fitAddon = null;
let ptyId = null;

export async function initializeTerminal(containerId) {
    try {
        // Create xterm.js terminal
        terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff',
                selection: 'rgba(255, 255, 255, 0.3)'
            }
        });

        // Add fit addon
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Mount terminal to DOM
        const container = document.getElementById(containerId);
        terminal.open(container);
        fitAddon.fit();

        // Create PTY process
        ptyId = await invoke('plugin:pty|spawn', {
            shell: '/bin/bash',
            args: ['-l'],
            cols: terminal.cols,
            rows: terminal.rows,
            cwd: process.env.HOME,
            env: {
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                PATH: `/opt/homebrew/bin:${process.env.PATH}`,
                FORCE_COLOR: '1',
                DISABLE_ERROR_REPORTING: '1',
                DISABLE_TELEMETRY: '1',
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
                TERM_PROGRAM: 'Coder1 IDE',
                TERM_PROGRAM_VERSION: '1.0.0'
            }
        });

        // Handle terminal input
        terminal.onData(async (data) => {
            if (ptyId) {
                await invoke('plugin:pty|write', {
                    id: ptyId,
                    data: data
                });
            }
        });

        // Handle PTY output
        window.__TAURI__.event.listen(`pty-output-${ptyId}`, (event) => {
            terminal.write(new Uint8Array(event.payload));
        });

        // Handle resize
        terminal.onResize(async ({ cols, rows }) => {
            if (ptyId) {
                fitAddon.fit();
                await invoke('plugin:pty|resize', {
                    id: ptyId,
                    cols: cols,
                    rows: rows
                });
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            fitAddon.fit();
        });

        // Write welcome message
        terminal.writeln('🚀 Coder1 IDE Terminal Ready!');
        terminal.writeln('You can now run the claude command with full TTY support');
        terminal.writeln('');

        return { terminal, ptyId };
    } catch (error) {
        console.error('Failed to initialize terminal:', error);
        throw error;
    }
}

export async function destroyTerminal() {
    if (ptyId) {
        try {
            await invoke('plugin:pty|kill', { id: ptyId });
        } catch (error) {
            console.error('Failed to kill PTY:', error);
        }
    }
    
    if (terminal) {
        terminal.dispose();
    }
    
    terminal = null;
    fitAddon = null;
    ptyId = null;
}

// Export for use in React components
export default {
    initializeTerminal,
    destroyTerminal
};