import { useState, useEffect } from 'react'
import PtyTerminal from './PtyTerminal'
import './IDE.css'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  content?: string
}

function IDE() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [terminalHeight, setTerminalHeight] = useState<number>(300)
  const [isDragging, setIsDragging] = useState(false)
  
  // Mock file system for now
  const [fileTree] = useState<FileNode[]>([
    {
      name: 'project',
      type: 'folder',
      children: [
        { name: 'claude.md', type: 'file', content: '# Claude Configuration\n\nThis file contains project-specific instructions for Claude.' },
        { name: 'rules.md', type: 'file', content: '# Project Rules\n\n1. Follow best practices\n2. Write clean code\n3. Document everything' },
        { name: 'src', type: 'folder', children: [
          { name: 'index.js', type: 'file', content: '// Main application entry point\nconsole.log("Hello, World!");' },
          { name: 'app.css', type: 'file', content: '/* Application styles */\nbody {\n  margin: 0;\n  padding: 0;\n}' }
        ]}
      ]
    }
  ])

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file.name)
      setFileContent(file.content || '')
    }
  }

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node, index) => (
      <div key={`${depth}-${index}`}>
        <div 
          className={`file-item ${selectedFile === node.name ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 10}px` }}
          onClick={() => handleFileClick(node)}
        >
          <span className={`file-icon ${node.type}`}>
            {node.type === 'folder' ? '📁' : '📄'}
          </span>
          <span className="file-name">{node.name}</span>
        </div>
        {node.type === 'folder' && node.children && (
          <div className="folder-contents">
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newHeight = window.innerHeight - e.clientY - 40
      setTerminalHeight(Math.max(100, Math.min(600, newHeight)))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  return (
    <div className="ide-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Header */}
      <div className="ide-header glassmorphism">
        <h1>Coder1 IDE v2</h1>
        <div className="header-actions">
          <button className="prd-button">Generate PRD</button>
        </div>
      </div>

      {/* Main content area */}
      <div className="ide-main">
        {/* File Explorer */}
        <div className="ide-sidebar glassmorphism">
          <div className="sidebar-header">
            <h3>Explorer</h3>
          </div>
          <div className="file-tree">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="ide-content">
          <div className="editor-section glassmorphism">
            <div className="editor-header">
              <span>{selectedFile || 'Select a file'}</span>
            </div>
            <div className="editor-content">
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="code-editor"
                placeholder="Select a file to edit..."
              />
            </div>
          </div>

          <div className="preview-section glassmorphism">
            <div className="preview-header">
              <span>Preview</span>
            </div>
            <div className="preview-content">
              <iframe
                title="preview"
                className="preview-iframe"
                srcDoc="<html><body><h1>Preview will appear here</h1></body></html>"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Section */}
      <div 
        className="ide-terminal glassmorphism"
        style={{ height: `${terminalHeight}px` }}
      >
        <div 
          className="terminal-resize-handle"
          onMouseDown={handleMouseDown}
        />
        <div className="terminal-header">
          <span>Terminal</span>
          <span className="terminal-info">Claude CLI Ready</span>
        </div>
        <div className="terminal-content">
          <PtyTerminal />
        </div>
      </div>
    </div>
  )
}

export default IDE