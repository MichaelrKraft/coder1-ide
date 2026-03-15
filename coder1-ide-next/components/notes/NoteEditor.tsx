'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type * as monaco from 'monaco-editor';

const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <span className="text-[#6b7280] text-xs">Loading editor...</span>
      </div>
    ),
  }
);

export interface NoteEditorProps {
  notePath: string;
  initialContent: string;
  onSave: (content: string) => void;
  onClose?: () => void;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export default function NoteEditor({ notePath, initialContent, onSave, onClose }: NoteEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [splitView, setSplitView] = useState(false);
  const [previewContent, setPreviewContent] = useState(initialContent);
  const currentContentRef = useRef(initialContent);

  const triggerSave = useCallback((content: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(content);
      setSaveStatus('saved');
    }, 1500);
  }, [onSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;

      editor.setValue(initialContent);
      currentContentRef.current = initialContent;

      editor.updateOptions({
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", Menlo, monospace',
        wordWrap: 'on',
        lineNumbers: 'off',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        overviewRulerLanes: 0,
        renderValidationDecorations: 'off' as const,
      });

      // Register [[wikilink]] completion provider for markdown
      monacoInstance.languages.registerCompletionItemProvider('markdown', {
        triggerCharacters: ['['],
        provideCompletionItems(model, position) {
          const lineUpToCursor = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          // Only trigger after [[
          if (!lineUpToCursor.endsWith('[[')) {
            return { suggestions: [] };
          }

          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Fetch note titles and return as completion items
          return fetch('/api/vault?list=true')
            .then((res) => res.json())
            .then((notes: Array<{ title: string; path: string }>) => ({
              suggestions: notes.map((note) => ({
                label: note.title,
                kind: monacoInstance.languages.CompletionItemKind.Reference,
                insertText: `${note.title}]]`,
                detail: note.path,
                range,
              })),
            }))
            .catch(() => ({ suggestions: [] }));
        },
      });
    },
    [initialContent]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      const content = value ?? '';
      currentContentRef.current = content;
      setSaveStatus('unsaved');
      if (splitView) setPreviewContent(content);
      triggerSave(content);
    },
    [splitView, triggerSave]
  );

  const statusColor: Record<SaveStatus, string> = {
    saved: 'text-[#4b5563]',
    saving: 'text-[#8b5cf6]',
    unsaved: 'text-[#fb923c]',
  };

  const statusLabel: Record<SaveStatus, string> = {
    saved: 'Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved',
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2a2a] flex-shrink-0">
        <span className="text-xs text-[#6b7280] truncate max-w-[60%]">{notePath}</span>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${statusColor[saveStatus]}`}>{statusLabel[saveStatus]}</span>
          <button
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              splitView
                ? 'border-[#6366f1] text-[#8b5cf6]'
                : 'border-[#2a2a2a] text-[#6b7280] hover:border-[#4b5563]'
            }`}
            onClick={() => {
              setSplitView((v) => !v);
              if (!splitView) setPreviewContent(currentContentRef.current);
            }}
          >
            Split
          </button>
          {onClose && (
            <button
              className="text-xs text-[#6b7280] hover:text-[#e2e8f0] transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        <div className={splitView ? 'w-1/2 h-full border-r border-[#2a2a2a]' : 'w-full h-full'}>
          <Editor
            height="100%"
            language="markdown"
            theme="vs-dark"
            defaultValue={initialContent}
            onMount={handleEditorDidMount}
            onChange={handleChange}
            options={{ minimap: { enabled: false }, wordWrap: 'on', automaticLayout: true }}
          />
        </div>

        {splitView && (
          <div className="w-1/2 h-full overflow-y-auto bg-[#0d0d0d]">
            {/* Lazy-load NoteViewer to avoid circular dep issues */}
            <NoteViewerPreview content={previewContent} />
          </div>
        )}
      </div>
    </div>
  );
}

// Inline minimal markdown preview to avoid circular imports
function NoteViewerPreview({ content }: { content: string }) {
  // Render as preformatted plain text fallback — NoteViewer can be swapped in by parent if needed
  return (
    <pre className="px-4 py-3 text-xs text-[#e2e8f0] font-mono whitespace-pre-wrap leading-relaxed">
      {content}
    </pre>
  );
}
