'use client';

import React from 'react';
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
    </div>
  );
}
