import { useState, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import './Terminal.css'

function SimpleTerminal() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([
    'Welcome to Coder1 IDE v2 Terminal',
    'Type "claude" to launch Claude Code CLI',
    ''
  ])
  const outputRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Add command to output
    setOutput(prev => [...prev, `$ ${input}`])
    
    try {
      // Execute command
      const result = await invoke<string>('execute_command', { 
        command: input.trim() 
      })
      
      // Add result to output
      setOutput(prev => [...prev, result])
    } catch (error) {
      setOutput(prev => [...prev, `Error: ${error}`])
    }
    
    setInput('')
  }
  
  return (
    <div className="simple-terminal">
      <div className="terminal-output" ref={outputRef}>
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="terminal-input-form">
        <span>$ </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="terminal-input"
          autoFocus
        />
      </form>
    </div>
  )
}

export default SimpleTerminal