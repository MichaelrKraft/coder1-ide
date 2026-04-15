'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Presentation } from 'lucide-react';

interface MarpPreviewProps {
  activeFile?: string | null;
  editorContent?: string;
}

function hasMarpFrontmatter(content: string): boolean {
  return /^---[\s\S]*?marp:\s*true[\s\S]*?---/m.test(content);
}

function isMarpFile(activeFile: string | null | undefined, content: string): boolean {
  if (!activeFile?.endsWith('.md')) return false;
  return hasMarpFrontmatter(content);
}

export default function MarpPreview({ activeFile, editorContent = '' }: MarpPreviewProps) {
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout>();

  const isMarp = isMarpFile(activeFile, editorContent);

  useEffect(() => {
    if (!isMarp || !editorContent) {
      setRenderedHtml(null);
      setSlideCount(0);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/marp-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editorContent }),
        });
        if (!res.ok) throw new Error('Render failed');
        const data = await res.json();
        setRenderedHtml(data.html);
        setSlideCount(data.slideCount || 1);
      } catch {
        setError('Failed to render slides');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editorContent, isMarp]);

  if (!isMarp) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Presentation className="w-12 h-12 text-text-muted mb-4" />
        <h3 className="text-lg font-medium text-text-secondary mb-2">Marp Slides Preview</h3>
        <p className="text-sm text-text-muted max-w-xs leading-relaxed">
          Open a <code className="text-coder1-cyan bg-bg-tertiary px-1 rounded">.md</code> file with{' '}
          <code className="text-coder1-cyan bg-bg-tertiary px-1 rounded">marp: true</code>{' '}
          in the frontmatter to preview slides.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-coder1-cyan/20 bg-bg-primary/50 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <Presentation className="w-3.5 h-3.5 text-coder1-cyan" />
          <span className="text-coder1-cyan font-medium">Marp Preview</span>
          {slideCount > 0 && (
            <span className="text-text-muted">
              {slideCount} slide{slideCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {loading && (
          <span className="text-xs text-coder1-cyan animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-coder1-cyan rounded-full animate-pulse" />
            Rendering...
          </span>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden bg-[#1e1e2e]">
        {error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-sm px-4 text-center">
            {error}
          </div>
        ) : renderedHtml ? (
          <iframe
            srcDoc={renderedHtml}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Marp presentation preview"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            {loading ? 'Rendering slides...' : 'Waiting for content...'}
          </div>
        )}
      </div>
    </div>
  );
}
