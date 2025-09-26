'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type * as monaco from 'monaco-editor';
import { WelcomeScreen } from './WelcomeScreen';

// Dynamically import HeroSection to avoid SSR issues
const HeroSection = dynamic(
  () => import('@/components/HeroSection'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <span className="text-text-muted">Loading...</span>
      </div>
    )
  }
);

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
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  file?: string | null;
  onTourStart?: () => void;
}

export default function MonacoEditor({ 
  value,
  language = 'typescript',
  theme = 'vs-dark',
  fontSize = 14,
  onChange,
  onMount,
  file,
  onTourStart
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [setupViewed, setSetupViewed] = useState<boolean | null>(null);
  const [heroSectionDismissed, setHeroSectionDismissed] = useState<boolean | null>(null);

  // Configure Monaco Editor to use CDN for reliable loading
  useEffect(() => {
    const configureMonaco = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { loader } = await import('@monaco-editor/react');
          loader.config({
            paths: {
              vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
            }
          });
        }
      } catch (error) {
        console.warn('Monaco loader configuration failed, using default:', error);
      }
    };
    configureMonaco();
  }, []);

  // Check if this is the user's first time
  useEffect(() => {
    // For returning users, always mark setup as viewed
    const viewed = localStorage.getItem('coder1-bridge-setup-viewed');
    if (viewed === null) {
      // First time user - will show WelcomeScreen
      console.log('🟡 MonacoEditor: First-time user detected, showing WelcomeScreen');
      setSetupViewed(false);
    } else {
      // Returning user - skip WelcomeScreen, prepare for HeroSection
      console.log('🟢 MonacoEditor: Returning user detected, preparing HeroSection');
      setSetupViewed(true);
    }
    
    // Check if hero was already dismissed during navigation (not refresh)
    const dismissed = sessionStorage.getItem('coder1-hero-dismissed');
    
    // Modern navigation detection using PerformanceNavigationTiming API
    const isPageReload = (() => {
      try {
        if (typeof window !== 'undefined' && window.performance) {
          // Use modern PerformanceNavigationTiming API
          const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navigationEntries.length > 0) {
            const navigationType = navigationEntries[0].type;
            console.log('🔍 Navigation type detected:', navigationType);
            return navigationType === 'reload';
          }
        }
        // Fallback: assume it's a fresh page load if no navigation info
        return true;
      } catch (error) {
        console.warn('Navigation detection failed, assuming fresh page load:', error);
        return true;
      }
    })();
    
    // Simplified logic: Always show hero section on page load for returning users,
    // unless it was explicitly dismissed in the current session (and not a reload)
    if (isPageReload || !dismissed) {
      console.log('🎯 MonacoEditor: Showing hero section (page reload or not dismissed)');
      setHeroSectionDismissed(false);
      // Clear sessionStorage on any page reload to ensure hero shows
      if (isPageReload && typeof window !== 'undefined') {
        sessionStorage.removeItem('coder1-hero-dismissed');
      }
    } else {
      console.log('🔴 MonacoEditor: Hero section was dismissed in this session');
      setHeroSectionDismissed(true);
    }
  }, []);

  // Update font size when prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize });
    }
  }, [fontSize]);

  // Listen for tour events and session refresh events
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

    const handleSessionRefreshed = () => {
      // Reset editor to clean welcome state on browser refresh
      console.log('🔄 MonacoEditor: Session refresh detected, resetting to welcome screen');
      setHeroSectionDismissed(false);
      
      // Clear editor content and reset to welcome message
      if (editorRef.current) {
        editorRef.current.setValue('// Welcome to Coder1 IDE\n// Open a file to start coding');
      }
    };

    window.addEventListener('tour:addCode', handleTourAddCode as EventListener);
    window.addEventListener('tour:clearCode', handleTourClearCode);
    window.addEventListener('sessionRefreshed', handleSessionRefreshed as EventListener);
    
    return () => {
      window.removeEventListener('tour:addCode', handleTourAddCode as EventListener);
      window.removeEventListener('tour:clearCode', handleTourClearCode);
      window.removeEventListener('sessionRefreshed', handleSessionRefreshed as EventListener);
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
    
    // Call the onMount prop if provided
    if (onMount) {
      onMount(editor);
    }
    
    // Configure Monaco theme to match our IDE
    monaco.editor.defineTheme('coder1-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280' },
        { token: 'keyword', foreground: '8b5cf6' },
        { token: 'string', foreground: '06b6d4' },
        { token: 'number', foreground: '00D9FF' },
        // Enhanced Markdown syntax highlighting
        { token: 'markup.heading', foreground: '00D9FF', fontStyle: 'bold' },
        { token: 'markup.heading.1', foreground: '00D9FF', fontStyle: 'bold' },
        { token: 'markup.heading.2', foreground: '8b5cf6', fontStyle: 'bold' },
        { token: 'markup.heading.3', foreground: '06b6d4', fontStyle: 'bold' },
        { token: 'markup.bold', foreground: 'ffffff', fontStyle: 'bold' },
        { token: 'markup.italic', foreground: 'ffffff', fontStyle: 'italic' },
        { token: 'markup.list', foreground: '00D9FF' },
        { token: 'markup.quote', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'markup.inline.raw', foreground: 'fb923c' },
        { token: 'markup.fenced_code', foreground: 'fb923c' },
        { token: 'punctuation.definition.markdown', foreground: '6b7280' },
        { token: 'meta.link.inline.markdown', foreground: '06b6d4' },
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

  // Show welcome screen or hero section if no file is open and no value provided
  if (!file && value === undefined) {
    console.log('🎯 MonacoEditor state:', { file, value, setupViewed, heroSectionDismissed });
    
    // Wait for localStorage to be checked (avoid SSR issues)
    if (setupViewed === null || heroSectionDismissed === null) {
      return <div className="flex items-center justify-center h-full bg-bg-primary">
        <span className="text-text-muted">Loading...</span>
      </div>;
    }
    
    // If HeroSection was dismissed in this session, show empty editor
    if (heroSectionDismissed === true) {
      console.log('🟡 HeroSection was already dismissed in this session, showing editor');
      // Show empty editor with welcome message
      return (
        <div className="h-full w-full monaco-editor-container">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            language="javascript"
            value="// Welcome back to Coder1 IDE\n// Open a file or drag & drop files to start coding\n// Type 'claude' in the terminal below to start Claude Code\n"
            theme={theme}
            onMount={handleEditorDidMount}
            onChange={onChange}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                useShadows: false,
              },
              renderValidationDecorations: 'off' as const,
            }}
          />
        </div>
      );
    }
    
    if (!setupViewed) {
      // First time user - show bridge setup instructions
      console.log('🔵 Showing WelcomeScreen for first-time user');
      // DON'T automatically mark as viewed - let user dismiss it manually
      // This ensures they can see it until they're ready
      return (
        <div className="relative h-full">
          <WelcomeScreen 
            onDismiss={() => {
              // Mark as viewed when user explicitly dismisses
              console.log('🎆 WelcomeScreen dismissed, marking setup as viewed');
              if (typeof window !== 'undefined') {
                localStorage.setItem('coder1-bridge-setup-viewed', 'true');
                console.log('💾 Stored setup completion in localStorage');
              }
              setSetupViewed(true);
            }}
            onBridgeClick={() => {
              // Bridge button now handles itself in WelcomeScreen
              console.log('🌉 Bridge button clicked in WelcomeScreen');
            }}
          />
        </div>
      );
    } else {
      // Returning user - show the hero section with dismiss and tour callbacks
      console.log('🟢 Showing HeroSection for returning user');
      return <HeroSection 
        onDismiss={() => {
          console.log('🔴 HeroSection dismissed by user interaction');
          // Mark as dismissed for this component instance
          setHeroSectionDismissed(true);
          // Also store in sessionStorage to prevent re-showing on navigation within same session
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('coder1-hero-dismissed', 'true');
            console.log('💾 Stored hero dismissal in sessionStorage');
          }
        }}
        onTourStart={() => {
          console.log('🎯 Interactive Tour started from HeroSection');
          // Don't dismiss hero section when tour starts
          // The tour will handle hero visibility
          if (onTourStart) {
            onTourStart();
          }
        }}
      />;
    }
  }

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