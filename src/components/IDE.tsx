import React, { useState, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { LivePreview } from './LivePreview';
import { Terminal } from './Terminal';
import { Header } from './Header';
import { GeneratedComponentDisplay } from './GeneratedComponentDisplay';
import './IDE.css';

interface IDEProps {}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  isOpen?: boolean;
  content?: string;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

const IDE: React.FC<IDEProps> = () => {
  const [files, setFiles] = useState<FileNode[]>([
    {
      name: 'src',
      type: 'directory',
      path: '/src',
      isOpen: true,
      children: [
        {
          name: 'components',
          type: 'directory',
          path: '/src/components',
          isOpen: true,
          children: [
            {
              name: 'App.tsx',
              type: 'file',
              path: '/src/components/App.tsx',
              content: `import React from 'react';
import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>React Dashboard</h1>
        <p>Count: {count}</p>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
      </header>
    </div>
  );
}

export default App;`
            },
            {
              name: 'Dashboard.tsx',
              type: 'file',
              path: '/src/components/Dashboard.tsx',
              content: `import React from 'react';
import { Chart } from './Chart';

export const Dashboard = () => {
  return (
    <div className="dashboard">
      <h2>Analytics Dashboard</h2>
      <div className="chart-container">
        <Chart />
      </div>
    </div>
  );
};`
            }
          ]
        },
        {
          name: 'styles',
          type: 'directory',
          path: '/src/styles',
          children: [
            {
              name: 'globals.css',
              type: 'file',
              path: '/src/styles/globals.css',
              content: `/* Global styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #1a1b26;
  color: #c0caf5;
}`
            }
          ]
        }
      ]
    },
    {
      name: 'package.json',
      type: 'file',
      path: '/package.json',
      content: `{
  "name": "react-dashboard",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "chart.js": "^4.3.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}`
    }
  ]);

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([
    {
      path: '/src/components/App.tsx',
      name: 'App.tsx',
      content: `import React from 'react';
import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>React Dashboard</h1>
        <p>Count: {count}</p>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
      </header>
    </div>
  );
}

export default App;`,
      language: 'typescript',
      isDirty: false
    }
  ]);

  const [activeFile, setActiveFile] = useState<string>('/src/components/App.tsx');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [isInspectorEnabled, setIsInspectorEnabled] = useState(false);
  const [showComponentDisplay, setShowComponentDisplay] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [elementContext, setElementContext] = useState<any>(null);

  const handleFileOpen = (filePath: string) => {
    const file = findFileByPath(files, filePath);
    if (file && file.type === 'file') {
      const existingFile = openFiles.find(f => f.path === filePath);
      if (!existingFile) {
        const newFile: OpenFile = {
          path: filePath,
          name: file.name,
          content: file.content || '',
          language: getLanguageFromExtension(file.name),
          isDirty: false
        };
        setOpenFiles([...openFiles, newFile]);
      }
      setActiveFile(filePath);
    }
  };

  const handleFileClose = (filePath: string) => {
    setOpenFiles(openFiles.filter(f => f.path !== filePath));
    if (activeFile === filePath) {
      const remainingFiles = openFiles.filter(f => f.path !== filePath);
      setActiveFile(remainingFiles.length > 0 ? remainingFiles[0].path : '');
    }
  };

  const handleFileChange = (filePath: string, content: string) => {
    setOpenFiles(openFiles.map(f => 
      f.path === filePath 
        ? { ...f, content, isDirty: true }
        : f
    ));
    
    // Update the file in the file tree as well
    updateFileContent(files, filePath, content);
  };

  const findFileByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) {
        return node;
      }
      if (node.children) {
        const found = findFileByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const updateFileContent = (nodes: FileNode[], path: string, content: string) => {
    for (const node of nodes) {
      if (node.path === path) {
        node.content = content;
        return;
      }
      if (node.children) {
        updateFileContent(node.children, path, content);
      }
    }
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      default:
        return 'text';
    }
  };

  const toggleTerminal = () => {
    setIsTerminalOpen(!isTerminalOpen);
  };

  const handleInspectorToggle = (enabled: boolean) => {
    setIsInspectorEnabled(enabled);
  };

  const handleElementSelected = (element: HTMLElement, context: any) => {
    setSelectedElement(element);
    setElementContext(context);
    console.log('Element selected in IDE:', element, context);
  };

  // Listen for Magic UI generation events to show component display
  useEffect(() => {
    const handleMagicUIGenerated = (event: CustomEvent) => {
      setShowComponentDisplay(true);
    };

    window.addEventListener('magic-ui-generated', handleMagicUIGenerated as EventListener);
    
    return () => {
      window.removeEventListener('magic-ui-generated', handleMagicUIGenerated as EventListener);
    };
  }, []);

  return (
    <div className="ide">
      <Header 
        onTerminalToggle={toggleTerminal} 
        onInspectorToggle={handleInspectorToggle}
        isInspectorEnabled={isInspectorEnabled}
      />
      
      <div className="ide-content">
        <PanelGroup direction="horizontal" className="panel-group">
          {/* File Explorer Panel */}
          <Panel defaultSize={25} minSize={15} maxSize={40} className="panel">
            <FileTree 
              files={files} 
              onFileOpen={handleFileOpen}
              onFileToggle={(path) => {
                const file = findFileByPath(files, path);
                if (file && file.type === 'directory') {
                  file.isOpen = !file.isOpen;
                  setFiles([...files]);
                }
              }}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle horizontal" />

          {/* Editor and Terminal Panel */}
          <Panel defaultSize={50} minSize={30} className="panel">
            <div className="editor-container">
              <PanelGroup direction="vertical" className="panel-group">
                <Panel 
                  defaultSize={isTerminalOpen ? 70 : 100} 
                  minSize={40} 
                  className="panel"
                >
                  <CodeEditor
                    files={openFiles}
                    activeFile={activeFile}
                    onFileChange={handleFileChange}
                    onFileClose={handleFileClose}
                    onFileSelect={setActiveFile}
                  />
                </Panel>

                {isTerminalOpen && (
                  <>
                    <PanelResizeHandle className="resize-handle vertical" />
                    <Panel 
                      defaultSize={30} 
                      minSize={20} 
                      maxSize={60} 
                      className="panel"
                    >
                      <Terminal selectedElement={selectedElement} elementContext={elementContext} />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle horizontal" />

          {/* Live Preview Panel */}
          <Panel defaultSize={25} minSize={15} maxSize={40} className="panel">
            <LivePreview 
              isInspectorEnabled={isInspectorEnabled} 
              onElementSelected={handleElementSelected}
            />
          </Panel>
        </PanelGroup>
      </div>
      
      {/* Generated Component Display Overlay */}
      <GeneratedComponentDisplay 
        isVisible={showComponentDisplay} 
        onClose={() => setShowComponentDisplay(false)}
      />
    </div>
  );
};

export default IDE;