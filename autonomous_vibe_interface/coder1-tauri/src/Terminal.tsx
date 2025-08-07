import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { invoke } from '@tauri-apps/api/core'
import '@xterm/xterm/css/xterm.css'
import './Terminal.css'

function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [currentLine, setCurrentLine] = useState('')

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    console.log('Initializing terminal...')

    // Create terminal instance
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
    })

    // Create and load fit addon
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    // Open terminal in the DOM
    term.open(terminalRef.current)
    
    // Wait a bit for DOM to be ready, then fit
    setTimeout(() => {
      fitAddon.fit()
      
      // Write welcome message
      term.writeln('Welcome to Coder1 IDE v2 Terminal')
      term.writeln('Type "claude" to launch Claude Code CLI')
      term.writeln('')
      term.write('$ ')
    }, 100)

    // Store references
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    let currentCommand = ''

    // Handle terminal input
    term.onData(async (data) => {
      if (data === '\r') {
        // Enter key - execute command
        if (currentCommand.trim()) {
          term.write('\n')
          
          try {
            // Execute command via Tauri
            const output = await invoke<string>('execute_command', { 
              command: currentCommand.trim() 
            })
            
            // Display output
            if (output) {
              output.split('\n').forEach(line => {
                term.writeln(line)
              })
            }
          } catch (error) {
            term.writeln(`Error: ${error}`)
          }
          
          currentCommand = ''
          term.write('$ ')
        } else {
          term.write('\n$ ')
        }
      } else if (data === '\x7F') {
        // Backspace
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data === '\x03') {
        // Ctrl+C
        currentCommand = ''
        term.write('^C\n$ ')
      } else if (data.charCodeAt(0) >= 32) {
        // Regular character
        currentCommand += data
        term.write(data)
      }
    })

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  return <div ref={terminalRef} className="terminal-container" />
}

export default TerminalComponent