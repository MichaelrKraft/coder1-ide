import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Circle, GitBranch, Save, Code } from 'lucide-react';
import { OpenFile } from './IDE';
import './CodeEditor.css';

interface CodeEditorProps {
  files: OpenFile[];
  activeFile: string;
  onFileChange: (path: string, content: string) => void;
  onFileClose: (path: string) => void;
  onFileSelect: (path: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  activeFile,
  onFileChange,
  onFileClose,
  onFileSelect
}) => {
  const editorRef = useRef<any>(null);

  const currentFile = files.find(f => f.path === activeFile);


  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Configure Tokyo Night theme
    editor.updateOptions({
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Monaco, monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on'
    });
    
    // Simulate AI typing
    setTimeout(() => {
      simulateAITyping(editor);
    }, 2000);
  };

  const simulateAITyping = (editor: any) => {
    const newCode = `import React, { useState, useEffect } from 'react';
import './App.css';

// AI-generated component with enhanced features
function App() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // AI suggestion: Add loading state
    if (count > 10) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [count]);

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Enhanced React Dashboard</h1>
        <p>Count: {count}</p>
        {isLoading && <div className="loading">Processing...</div>}
        <button onClick={handleIncrement} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Increment'}
        </button>
      </header>
    </div>
  );
}

export default App;`;

    // Simulate typing effect
    const lines = newCode.split('\n');
    let currentLine = 0;
    
    const typeNextLine = () => {
      if (currentLine < lines.length) {
        const lineContent = lines.slice(0, currentLine + 1).join('\n');
        onFileChange(activeFile, lineContent);
        currentLine++;
        setTimeout(typeNextLine, 100);
      }
    };
    
    setTimeout(typeNextLine, 1000);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'tsx':
      case 'ts':
        return <Code className="file-icon typescript" size={16} />;
      case 'jsx':
      case 'js':
        return <Code className="file-icon javascript" size={16} />;
      case 'css':
        return <Circle className="file-icon css" size={16} />;
      default:
        return <Code className="file-icon default" size={16} />;
    }
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="tabs">
          {files.map(file => (
            <div
              key={file.path}
              className={`tab ${file.path === activeFile ? 'active' : ''}`}
              onClick={() => onFileSelect(file.path)}
            >
              <div className="tab-content">
                {getFileIcon(file.name)}
                <span className="tab-name">{file.name}</span>
                {file.isDirty && <Circle className="dirty-indicator" size={8} />}
              </div>
              
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClose(file.path);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="editor-actions">
          <button className="action-btn" title="Save">
            <Save size={16} />
          </button>
          <button className="action-btn" title="Git Status">
            <GitBranch size={16} />
          </button>
        </div>
      </div>

      <div className="editor-content">
        {currentFile ? (
          <div className="editor-wrapper">
            <Editor
              height="100%"
              defaultLanguage={currentFile.language}
              language={currentFile.language}
              value={currentFile.content}
              onChange={(value) => onFileChange(activeFile, value || '')}
              onMount={handleEditorDidMount}
              options={{
                theme: 'vs-dark',
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Monaco, monospace',
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                glyphMargin: true,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                renderWhitespace: 'selection'
              }}
            />
          </div>
        ) : (
          <div className="editor-placeholder">
            <Code size={48} className="placeholder-icon" />
            <h3>No file selected</h3>
            <p>Select a file from the explorer to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
};