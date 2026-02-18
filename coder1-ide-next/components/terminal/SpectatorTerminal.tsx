'use client';

import React, { useEffect, useRef } from 'react';
import { Eye } from '@/lib/icons';
import './Terminal.css';

// Dynamic imports for xterm to prevent SSR issues
let XTerm: any;
let FitAddon: any;

if (typeof window !== 'undefined') {
  const xtermModule = require('@xterm/xterm');
  const fitModule = require('@xterm/addon-fit');
  XTerm = xtermModule.Terminal;
  FitAddon = fitModule.FitAddon;
  require('@xterm/xterm/css/xterm.css');
}

interface SpectatorTerminalProps {
  sessionId: string;
  sharerUsername: string;
  scrollback: string;
  cols: number;
  rows: number;
  onExit: () => void;
  socketRef: React.RefObject<any>;
}

export default function SpectatorTerminal({
  sessionId,
  sharerUsername,
  scrollback,
  cols,
  rows,
  onExit,
  socketRef,
}: SpectatorTerminalProps) {
  const terminalElRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);

  useEffect(() => {
    if (!terminalElRef.current || !XTerm || !FitAddon) return;

    const term = new XTerm({
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#bb9af7',
        black: '#414868',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#c0caf5',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      scrollback: 10000,
      cols,
      rows,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalElRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Defer fit and scrollback write to next animation frame so the browser
    // has time to lay out the container. Writing content synchronously after
    // open() can crash xterm when the RenderService dimensions are not ready.
    requestAnimationFrame(() => {
      if (!xtermRef.current) return; // Disposed during cleanup
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Container may not be fully rendered yet
      }
      if (scrollback) {
        xtermRef.current.write(scrollback);
      }
    });

    // Socket event handlers
    const socket = socketRef.current;
    if (!socket) {
      // Still return cleanup to prevent xterm leak
      return () => {
        term.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
      };
    }

    const handleData = ({ sessionId: sid, data }: { sessionId: string; data: string }) => {
      if (sid === sessionId && xtermRef.current) {
        xtermRef.current.write(data);
      }
    };

    const handleResize = ({ sessionId: sid, cols: newCols, rows: newRows }: { sessionId: string; cols: number; rows: number }) => {
      if (sid === sessionId && xtermRef.current) {
        xtermRef.current.resize(newCols, newRows);
      }
    };

    const handleShareStopped = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid === sessionId && xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[38;5;208m[Sharing ended]\x1b[0m');
        setTimeout(() => {
          onExit();
        }, 2000);
      }
    };

    socket.on('spectator:data', handleData);
    socket.on('spectator:resize', handleResize);
    socket.on('spectator:share:stopped', handleShareStopped);

    return () => {
      socket.off('spectator:data', handleData);
      socket.off('spectator:resize', handleResize);
      socket.off('spectator:share:stopped', handleShareStopped);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
    // Note: onExit intentionally excluded from deps to prevent xterm re-creation on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, scrollback, cols, rows, socketRef]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      style={{ background: '#1a1b26' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          background: 'rgba(251, 146, 60, 0.15)',
          borderBottom: '1px solid rgba(251, 146, 60, 0.4)',
        }}
      >
        <div className="flex items-center gap-2 text-sm text-orange-400">
          <Eye className="w-4 h-4" />
          <span className="font-medium">Spectating {sharerUsername}</span>
        </div>
        <button
          onClick={onExit}
          className="terminal-control-btn px-3 py-1 text-xs font-medium rounded-md"
          style={{
            borderColor: 'rgba(251, 146, 60, 0.6)',
            color: '#fb923c',
          }}
        >
          Exit
        </button>
      </div>

      {/* Read-only terminal */}
      <div
        className="flex-1 p-2"
        style={{
          border: '1px solid rgba(251, 146, 60, 0.25)',
          borderTop: 'none',
        }}
      >
        <div ref={terminalElRef} className="h-full w-full" />
      </div>
    </div>
  );
}
