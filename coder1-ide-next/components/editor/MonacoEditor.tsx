'use client';

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type * as monaco from 'monaco-editor';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(
  () => import('@monaco-editor/react'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <span className="text-text-muted">Loading editor...</span>
      </div>
    )
  }
);

interface MonacoEditorProps {
  value?: string;
  language?: string;
  theme?: string;
  fontSize?: number;
  onChange?: (value: string | undefined) => void;
  file?: string | null;
}

export default function MonacoEditor({ 
  value,
  language = 'typescript',
  theme = 'vs-dark',
  fontSize = 14,
  onChange,
  file 
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Update font size when prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize });
    }
  }, [fontSize]);

  // Listen for tour:addCode and tour:clearCode events
  useEffect(() => {
    const handleTourAddCode = (event: CustomEvent) => {
      if (editorRef.current && event.detail?.code) {
        editorRef.current.setValue(event.detail.code);
      }
    };

    const handleTourClearCode = () => {
      if (editorRef.current) {
        editorRef.current.setValue('');
      }
    };

    window.addEventListener('tour:addCode', handleTourAddCode as EventListener);
    window.addEventListener('tour:clearCode', handleTourClearCode);
    
    return () => {
      window.removeEventListener('tour:addCode', handleTourAddCode as EventListener);
      window.removeEventListener('tour:clearCode', handleTourClearCode);
    };
  }, []);

  // Cleanup function to dispose editor when component unmounts
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure Monaco theme to match our IDE
    monaco.editor.defineTheme('coder1-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280' },
        { token: 'keyword', foreground: '8b5cf6' },
        { token: 'string', foreground: '06b6d4' },
        { token: 'number', foreground: '00D9FF' },
      ],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editor.selectionBackground': '#00D9FF30',
        'editorCursor.foreground': '#00D9FF',
        'editorLineNumber.foreground': '#6b7280',
        'editorLineNumber.activeForeground': '#00D9FF',
        'editor.inactiveSelectionBackground': '#00D9FF20',
      },
    });
    
    monaco.editor.setTheme('coder1-dark');
    
    // Configure editor options
    editor.updateOptions({
      fontSize: fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      // Disable overview ruler (removes red bars)
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      // Configure scrollbar to hide decorations
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
      // Disable error decorations
      renderValidationDecorations: 'off' as const,
    });
  };

  // Support both file-based and value-based content
  const getFileContent = (filePath: string | null) => {
    if (!filePath) {
      return '// Welcome to Coder1 IDE\n// Open a file to start coding';
    }
    
    if (filePath.endsWith('.tsx')) {
      return `import React from 'react';\n\nconst Component = () => {\n  return (\n    <div>\n      <h1>Hello from Coder1 IDE</h1>\n    </div>\n  );\n};\n\nexport default Component;`;
    }
    
    if (filePath.endsWith('.json')) {
      return `{\n  "name": "coder1-project",\n  "version": "1.0.0",\n  "description": "AI-powered development"\n}`;
    }
    
    return `// File: ${filePath}\n// Content will be loaded from file system`;
  };

  const getLanguage = (filePath: string | null) => {
    if (!filePath) return 'javascript';
    if (filePath.endsWith('.tsx')) return 'typescript';
    if (filePath.endsWith('.ts')) return 'typescript';
    if (filePath.endsWith('.jsx')) return 'javascript';
    if (filePath.endsWith('.js')) return 'javascript';
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.css')) return 'css';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  // Use provided value or fall back to file-based content
  const editorValue = value !== undefined ? value : getFileContent(file || null);
  const editorLanguage = language || (file ? getLanguage(file) : 'javascript');

  return (
    <div className="h-full w-full monaco-editor-container">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        language={editorLanguage}
        value={editorValue}
        theme={theme}
        onMount={handleEditorDidMount}
        onChange={onChange}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          // Disable overview ruler (removes red bars)
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          // Configure scrollbar to hide decorations
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
          // Disable error decorations
          renderValidationDecorations: 'off' as const,
        }}
      />
    </div>
  );
}