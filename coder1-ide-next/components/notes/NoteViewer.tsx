'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

export interface NoteViewerProps {
  content: string;
  onWikilinkClick: (target: string) => void;
}

/**
 * Convert [[target|alias]] and [[target]] to markdown links with a custom wikilink:// scheme.
 * react-markdown's `a` component then intercepts these and calls onWikilinkClick.
 */
function preprocessContent(raw: string): string {
  return raw.replace(
    /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g,
    (_, target: string, alias?: string) =>
      `[${alias ?? target}](wikilink://${encodeURIComponent(target.trim())})`
  );
}

export default function NoteViewer({ content, onWikilinkClick }: NoteViewerProps) {
  const processed = preprocessContent(content);

  const [hoverPreview, setHoverPreview] = useState<{
    target: string;
    x: number;
    y: number;
  } | null>(null);

  const previewCache = useRef<Map<string, { title: string; excerpt: string; tagCount: number } | 'loading' | 'error'>>(new Map());
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWikilinkHover = useCallback(async (target: string, rect: DOMRect) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoverPreview({ target, x: rect.left, y: rect.bottom });

    if (previewCache.current.has(target)) return;

    previewCache.current.set(target, 'loading');
    try {
      const res = await fetch(`/api/vault?path=${encodeURIComponent(target)}`);
      if (!res.ok) {
        previewCache.current.set(target, 'error');
        return;
      }
      const note = await res.json();
      previewCache.current.set(target, {
        title: note.title || target,
        excerpt: (note.content || '').replace(/^---[\s\S]*?---\n/, '').slice(0, 100),
        tagCount: (note.tags || []).length,
      });
      setHoverPreview(prev => prev?.target === target ? { ...prev } : prev);
    } catch {
      previewCache.current.set(target, 'error');
    }
  }, []);

  const handleWikilinkLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setHoverPreview(null);
    }, 150);
  }, []);

  // Clean up pending hide timeout on unmount to prevent setState-after-unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="prose prose-invert prose-sm max-w-none px-4 py-3 text-[#e2e8f0] text-sm leading-relaxed">
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          a({ href, children }) {
            if (href?.startsWith('wikilink://')) {
              const target = decodeURIComponent(href.slice('wikilink://'.length));
              return (
                <button
                  className="text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-2 bg-transparent border-none cursor-pointer p-0"
                  onClick={() => onWikilinkClick(target)}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    handleWikilinkHover(target, rect);
                  }}
                  onMouseLeave={handleWikilinkLeave}
                >
                  {children}
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06b6d4] hover:text-[#22d3ee] underline"
              >
                {children}
              </a>
            );
          },
          code({ children, className }) {
            const isBlock = className?.startsWith('language-');
            if (isBlock) {
              return (
                <pre className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3 overflow-x-auto">
                  <code className="text-[#fb923c] text-xs font-mono">{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-[#1a1a1a] text-[#fb923c] px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            );
          },
          h1({ children }) {
            return <h1 className="text-[#00D9FF] text-xl font-bold mt-4 mb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-[#8b5cf6] text-lg font-semibold mt-3 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-[#06b6d4] text-base font-semibold mt-3 mb-1">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-[#6b7280] pl-3 text-[#9ca3af] italic my-2">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
      {hoverPreview && (() => {
        const cached = previewCache.current.get(hoverPreview.target);
        const flipUp = hoverPreview.y + 140 > (typeof window !== 'undefined' ? window.innerHeight : 800);
        return (
          <div
            className="fixed z-50 bg-[#12121f] border border-[#2a2a4e] rounded-lg shadow-2xl p-3 w-60 text-xs pointer-events-none"
            style={{
              left: Math.min(hoverPreview.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250),
              top: flipUp ? undefined : hoverPreview.y + 6,
              bottom: flipUp ? (typeof window !== 'undefined' ? window.innerHeight - hoverPreview.y + 6 : undefined) : undefined,
            }}
          >
            {!cached || cached === 'loading' ? (
              <div className="space-y-1.5 animate-pulse">
                <div className="h-3 bg-[#2a2a4e] rounded w-3/4" />
                <div className="h-2 bg-[#2a2a4e] rounded w-full" />
                <div className="h-2 bg-[#2a2a4e] rounded w-2/3" />
              </div>
            ) : cached === 'error' ? (
              <p className="text-[#6b7280]">Note not found</p>
            ) : (
              <>
                <p className="font-medium text-[#e2e8f0] mb-1 truncate">{cached.title}</p>
                {cached.excerpt && (
                  <p className="text-[#9ca3af] leading-relaxed line-clamp-3">{cached.excerpt}</p>
                )}
                {cached.tagCount > 0 && (
                  <p className="text-[#6b7280] mt-1.5">{cached.tagCount} tag{cached.tagCount !== 1 ? 's' : ''}</p>
                )}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
