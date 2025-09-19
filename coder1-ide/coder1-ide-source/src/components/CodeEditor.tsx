import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import prettierService from '../services/PrettierServiceBrowser';
import { useClaudeCodeIntegration } from '../hooks/useClaudeCodeIntegration';
import repositoryIntelliSense from '../services/RepositoryIntelliSense';
import './CodeEditor.css';

// Configure Monaco loader to use unpkg.com instead of cdn.jsdelivr.net (CSP fix)
loader.config({
  paths: {
    vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs'
  }
});

interface CodeEditorProps {
  value?: string;
  language?: string;
  theme?: string;
  onChange?: (value: string | undefined) => void;
  onSave?: () => void;
  readOnly?: boolean;
  fileName?: string;
  onEditorMount?: (editor: any) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value = '',
  language = 'typescript',
  theme = 'tokyo-night',
  onChange,
  onSave,
  readOnly = false,
  fileName = 'untitled',
  onEditorMount
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [autoFixAvailable, setAutoFixAvailable] = useState<string | null>(null);
  
  // Hook up Claude Code integration
  const { formatCurrentDocument: formatWithHook } = useClaudeCodeIntegration(editorRef, fileName);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    modelRef.current = editor.getModel();
    
    // Initialize Repository IntelliSense
    try {
      repositoryIntelliSense.initialize(monaco);
      console.log('✅ Repository IntelliSense activated');
    } catch (error) {
      console.warn('Repository IntelliSense initialization failed:', error);
    }
    
    // Pass editor reference to parent
    if (onEditorMount) {
      onEditorMount(editor);
    }

    // Set up keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave();
      }
    });

    // Add Prettier format command (Alt+Shift+F)
    editor.addAction({
      id: 'prettier.formatDocument',
      label: 'Format Document with Prettier',
      keybindings: [
        monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
      ],
      contextMenuGroupId: 'format',
      contextMenuOrder: 1.5,
      run: async (editor: any) => {
        await formatDocument();
      }
    });

    // Focus editor
    editor.focus();
    
    // Apply theme again to ensure it's loaded
    monaco.editor.setTheme('tokyo-night');
  }, [onEditorMount, onSave]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (onChange) {
      onChange(value);
    }
    // Clear format error when user edits
    if (formatError) {
      setFormatError(null);
      setAutoFixAvailable(null);
    }
  }, [onChange, formatError]);

  const formatDocument = useCallback(async () => {
    if (!editorRef.current) return;

    const currentValue = editorRef.current.getValue();
    const result = await prettierService.formatCode(currentValue, fileName);

    if (result.success && result.formatted) {
      editorRef.current.setValue(result.formatted);
      setFormatError(null);
      setAutoFixAvailable(null);
    } else if (result.error) {
      setFormatError(result.error);
      if (result.formatted) {
        setAutoFixAvailable(result.formatted);
      }
    }
  }, [fileName]);

  const applyAutoFix = useCallback(() => {
    if (autoFixAvailable && editorRef.current) {
      editorRef.current.setValue(autoFixAvailable);
      setFormatError(null);
      setAutoFixAvailable(null);
    }
  }, [autoFixAvailable]);

  // Memory cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup Monaco editor resources
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing editor:', error);
        }
      }
      
      // Cleanup model
      if (modelRef.current) {
        try {
          modelRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing model:', error);
        }
      }
      
      // Clear references
      editorRef.current = null;
      monacoRef.current = null;
      modelRef.current = null;
    };
  }, []);

  // Detect language from file extension
  const detectLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sh': 'shell',
      'bash': 'shell',
      'ps1': 'powershell',
      'sql': 'sql',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const detectedLanguage = detectLanguage(fileName);

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('CodeEditor props:', { value, fileName, detectedLanguage });
  }

  const handleEditorWillMount = (monaco: any) => {
    // Define Tokyo Night theme before editor mounts
    monaco.editor.defineTheme('tokyo-night', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7' },
        { token: 'string', foreground: '9ece6a' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'type', foreground: '7aa2f7' },
        { token: 'function', foreground: '7dcfff' },
        { token: 'variable', foreground: 'c0caf5' },
        { token: 'constant', foreground: 'ff9e64' },
        { token: 'parameter', foreground: 'e0af68' },
        { token: 'property', foreground: '73daca' },
        { token: 'punctuation', foreground: '9abdf5' },
        { token: 'operator', foreground: '89ddff' },
      ],
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5',
        'editor.lineHighlightBackground': '#24283b',
        'editor.selectionBackground': '#364a82',
        'editor.inactiveSelectionBackground': '#2a2e48',
        'editorCursor.foreground': '#c0caf5',
        'editorLineNumber.foreground': '#565f89',
        'editorLineNumber.activeForeground': '#737aa2',
        'editorIndentGuide.background': '#24283b',
        'editorIndentGuide.activeBackground': '#3b4261',
        'editor.wordHighlightBackground': '#364a82',
        'editor.wordHighlightStrongBackground': '#364a82',
        'editorBracketMatch.background': '#3b4261',
        'editorBracketMatch.border': '#7aa2f7',
        'editorGutter.background': '#1a1b26',
        'scrollbar.shadow': '#00000030',
        'scrollbarSlider.background': '#565f8930',
        'scrollbarSlider.hoverBackground': '#565f8950',
        'scrollbarSlider.activeBackground': '#565f8970',
      },
    });
  };

  return (
    <div className="code-editor">
      {formatError && (
        <div className="format-error-banner">
          <span className="error-message">Format Error: {formatError}</span>
          {autoFixAvailable && (
            <button className="auto-fix-button" onClick={applyAutoFix}>
              Apply Auto-Fix
            </button>
          )}
          <button className="dismiss-button" onClick={() => setFormatError(null)}>
            ×
          </button>
        </div>
      )}
      <Editor
        height="100%"
        defaultLanguage={detectedLanguage}
        language={detectedLanguage}
        value={value || ''}
        theme="tokyo-night"
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        loading={<div style={{ padding: '20px', color: '#c0caf5' }}>Loading editor...</div>}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", Monaco, Menlo, "Courier New", monospace',
          fontLigatures: true,
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          readOnly,
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          wordWrap: 'on',
          lineNumbers: 'on',
          rulers: [],
          folding: true,
          showFoldingControls: 'mouseover',
        }}
      />
    </div>
  );
};

export default CodeEditor;