'use client';

import React, { useRef, useEffect } from 'react';
import type { Terminal as XTermTerminal } from '@xterm/xterm';
import type { FitAddon as FitAddonType } from '@xterm/addon-fit';
import type { FlightEvent } from '@/lib/flight-recorder/types';

// Dynamic imports for xterm — SSR-incompatible
let XTerm: typeof import('@xterm/xterm').Terminal | undefined;
let FitAddonClass: typeof import('@xterm/addon-fit').FitAddon | undefined;

if (typeof window !== 'undefined') {
  const xtermModule = require('@xterm/xterm');
  const fitModule = require('@xterm/addon-fit');
  XTerm = xtermModule.Terminal;
  FitAddonClass = fitModule.FitAddon;
  require('@xterm/xterm/css/xterm.css');
}

interface TerminalReplayProps {
  /** Current event to display -- when this changes, write output to terminal */
  currentEvent: FlightEvent | null;
  /** Terminal snapshot buffer to restore state (for seeking) */
  snapshot?: string;
  /** Increment to clear terminal and start fresh */
  resetSignal?: number;
}

export default function TerminalReplay({
  currentEvent,
  snapshot,
  resetSignal,
}: TerminalReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddonType | null>(null);

  // Initialize xterm on mount
  useEffect(() => {
    if (!XTerm || !FitAddonClass || !containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#00D9FF',
        black: '#1e1e2e',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#cba6f7',
        cyan: '#00D9FF',
        white: '#cdd6f4',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      cursorBlink: false,
      disableStdin: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddonClass();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Write output when current event changes
  useEffect(() => {
    if (!currentEvent || !xtermRef.current) return;

    if (currentEvent.type === 'terminal:output' && typeof currentEvent.data.output === 'string') {
      xtermRef.current.write(currentEvent.data.output);
    }
    if (currentEvent.type === 'terminal:input' && typeof currentEvent.data.input === 'string') {
      xtermRef.current.write(currentEvent.data.input);
    }
  }, [currentEvent]);

  // Restore from snapshot when seeking
  useEffect(() => {
    if (snapshot === undefined || !xtermRef.current) return;
    xtermRef.current.reset();
    xtermRef.current.write(snapshot);
  }, [snapshot]);

  // Reset terminal
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0 && xtermRef.current) {
      xtermRef.current.reset();
    }
  }, [resetSignal]);

  return (
    <div className="h-full w-full bg-[#0a0a0a] rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center px-3 py-1.5 bg-gray-900 border-b border-gray-700">
        <div className="w-2 h-2 rounded-full bg-cyan-400 mr-2 opacity-70" />
        <span className="text-xs text-gray-400 font-mono">Terminal Replay</span>
      </div>
      <div ref={containerRef} className="h-[calc(100%-32px)] w-full" />
    </div>
  );
}
