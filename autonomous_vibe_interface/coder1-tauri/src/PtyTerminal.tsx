import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import './Terminal.css'

interface TerminalOutput {
  id: string
  data: string
}

function PtyTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [terminal, setTerminal] = useState<Terminal | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal
    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Monaco", "Fira Code", monospace',
      fontSize: 14,
      theme: {
        background: 'transparent',
        foreground: '#ffffff',
        cursor: '#8b5cf6',
        cursorAccent: '#ffffff',
        selection: 'rgba(139, 92, 246, 0.3)',
        black: '#0a0a0a',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e5e5e5',
        brightBlack: '#374151',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      cursorBlink: true,
      convertEol: true,
      allowTransparency: true,
    })

    // Create fit addon
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    term.open(terminalRef.current)
    fitAddon.fit()
    
    setTerminal(term)
    fitAddonRef.current = fitAddon

    // Create PTY session
    const initPty = async () => {
      try {
        const id = await invoke<string>('create_pty_session')
        setSessionId(id)
        
        // Listen for terminal output
        const unlisten = await listen<TerminalOutput>('terminal-output', (event) => {
          if (event.payload.id === id) {
            term.write(event.payload.data)
          }
        })
        
        // Handle terminal input
        term.onData(async (data) => {
          if (id) {
            await invoke('write_to_pty', { sessionId: id, data })
          }
        })

        // Handle resize
        const handleResize = () => {
          if (fitAddon) {
            fitAddon.fit()
            const { rows, cols } = term
            invoke('resize_pty', { sessionId: id, rows, cols })
          }
        }
        
        window.addEventListener('resize', handleResize)
        
        return () => {
          unlisten()
          window.removeEventListener('resize', handleResize)
          if (id) {
            invoke('close_pty_session', { sessionId: id })
          }
        }
      } catch (error) {
        console.error('Failed to create PTY session:', error)
        term.write('\r\nFailed to create terminal session\r\n')
      }
    }

    const cleanupPromise = initPty()

    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup())
      term.dispose()
    }
  }, [])

  return (
    <div className="terminal-container">
      <div ref={terminalRef} className="xterm-terminal" />
    </div>
  )
}

export default PtyTerminal