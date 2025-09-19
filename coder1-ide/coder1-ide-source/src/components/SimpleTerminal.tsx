import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

const SimpleTerminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>('');
  const [status, setStatus] = useState('Initializing...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize XTerm
    try {
      setStatus('Creating XTerm instance...');
      const xterm = new XTerminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#a9b1d6',
          black: '#32344a',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#ad8ee6',
          cyan: '#449dab',
          white: '#787c99',
          brightBlack: '#444b6a',
          brightRed: '#ff7a93',
          brightGreen: '#b9f27c',
          brightYellow: '#ff9e64',
          brightBlue: '#7da6ff',
          brightMagenta: '#bb9af7',
          brightCyan: '#0db9d7',
          brightWhite: '#acb0d0',
        }
      });

      xtermRef.current = xterm;
      xterm.open(terminalRef.current);

      // Add fit addon
      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      xterm.loadAddon(fitAddon);
      fitAddon.fit();

      setStatus('Connecting to server...');

      // Connect to Socket.IO
      const socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected');
        setStatus('Connected! Creating terminal session...');
        setIsConnected(true);
        
        // Request terminal creation
        socket.emit('terminal:create', {
          cols: xterm.cols,
          rows: xterm.rows
        });
      });

      socket.on('terminal:created', (data: { id: string; pid: number }) => {
        console.log('Terminal created:', data);
        sessionIdRef.current = data.id;
        setStatus(`Terminal ready! Session: ${data.id}`);
        xterm.write('\r\n🚀 Terminal connected!\r\n\r\n');
      });

      // Handle terminal output
      socket.on('terminal:data', (data: { id: string; data: string }) => {
        if (data.id === sessionIdRef.current) {
          xterm.write(data.data);
        }
      });

      socket.on('terminal:output', (data: { id: string; data: string }) => {
        if (data.id === sessionIdRef.current) {
          xterm.write(data.data);
        }
      });

      // Handle terminal input
      xterm.onData((data: string) => {
        if (sessionIdRef.current) {
          socket.emit('terminal:input', {
            id: sessionIdRef.current,
            data: data
          });
          socket.emit('terminal:data', {
            id: sessionIdRef.current,
            data: data
          });
        }
      });

      // Handle resize
      const handleResize = () => {
        if (fitAddon) {
          fitAddon.fit();
          if (sessionIdRef.current && socket.connected) {
            socket.emit('terminal:resize', {
              id: sessionIdRef.current,
              cols: xterm.cols,
              rows: xterm.rows
            });
          }
        }
      };

      window.addEventListener('resize', handleResize);

      socket.on('disconnect', () => {
        setIsConnected(false);
        setStatus('Disconnected from server');
        xterm.write('\r\n⚠️ Connection lost. Reconnecting...\r\n');
      });

      socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error);
        setStatus(`Connection error: ${error.message}`);
      });

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (socket) {
          socket.disconnect();
        }
        if (xterm) {
          xterm.dispose();
        }
      };
    } catch (error) {
      console.error('Terminal initialization error:', error);
      setStatus(`Error: ${error}`);
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: '#1a1b26'
    }}>
      <div style={{
        padding: '8px',
        backgroundColor: '#24283b',
        color: '#a9b1d6',
        fontSize: '12px',
        borderBottom: '1px solid #414868',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%',
          backgroundColor: isConnected ? '#9ece6a' : '#f7768e'
        }}></span>
        <span>{status}</span>
      </div>
      <div 
        ref={terminalRef} 
        style={{ 
          flexGrow: 1,
          padding: '10px'
        }}
      />
    </div>
  );
};

export default SimpleTerminal;