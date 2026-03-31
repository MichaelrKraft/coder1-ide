'use client';

import React, {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import { Clock } from 'lucide-react';
import { fuzzyScore } from '@/lib/fuzzy-match';
import type { SlashCommand } from '@/types/slash-command';

export interface SlashCommandTypeaheadHandle {
  handleKey: (key: string) => void;
}

interface SlashCommandTypeaheadProps {
  query: string;
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onSelect: (command: SlashCommand) => void;
  onDismiss: () => void;
  commands: SlashCommand[];
  isLoading: boolean;
  recentSlugs: string[];
}

const SlashCommandTypeahead = forwardRef<
  SlashCommandTypeaheadHandle,
  SlashCommandTypeaheadProps
>(function SlashCommandTypeahead(
  { query, isOpen, anchorRef, onSelect, onDismiss, commands, isLoading, recentSlugs },
  ref
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, above: true });
  const listRef = useRef<HTMLDivElement>(null);

  // Compute filtered + ranked commands
  const filtered = useMemo(() => {
    if (isLoading) return [];
    if (!query) {
      const recent = commands.filter((c) => recentSlugs.includes(c.slug));
      const rest = commands.filter((c) => !recentSlugs.includes(c.slug));
      return [...recent, ...rest].slice(0, 10);
    }
    return commands
      .map((c) => ({
        cmd: c,
        score: Math.max(
          fuzzyScore(query, c.slug),
          fuzzyScore(query, c.name),
          fuzzyScore(query, c.description) * 0.5
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ cmd }) => cmd);
  }, [query, commands, isLoading, recentSlugs]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length, query]);

  // Compute position from anchor
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(filtered.length * 52 + 36, 350);
    const above = rect.top > dropdownHeight + 20;

    setPosition({
      top: above ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      above,
    });
  }, [isOpen, filtered.length, anchorRef]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Expose keyboard handler to parent
  useImperativeHandle(ref, () => ({
    handleKey(key: string) {
      if (key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (key === 'Enter' || key === 'Tab') {
        if (filtered[selectedIndex]) onSelect(filtered[selectedIndex]);
      } else if (key === 'Escape') {
        onDismiss();
      }
    },
  }));

  if (!isOpen) return null;

  return (
    <div
      className="fixed bg-bg-secondary border border-border-default rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{
        top: position.top,
        left: position.left,
        width: Math.max(position.width, 320),
        zIndex: 9999,
        maxHeight: 350,
      }}
    >
      {/* Command list */}
      <div ref={listRef} className="overflow-y-auto flex-1">
        {isLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                <div className="h-3 w-16 bg-bg-tertiary rounded" />
                <div className="h-3 flex-1 bg-bg-tertiary rounded" />
              </div>
            ))}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-muted text-center">
            No matching commands
          </div>
        )}

        {!isLoading &&
          filtered.map((cmd, i) => {
            const isRecent = recentSlugs.includes(cmd.slug);
            const isSelected = i === selectedIndex;
            return (
              <div
                key={cmd.slug}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary/60'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent textarea blur
                  onSelect(cmd);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {/* Slug */}
                <span className="font-mono text-xs text-coder1-cyan shrink-0 flex items-center gap-1">
                  {isRecent && <Clock className="w-2.5 h-2.5 text-text-muted" />}
                  /{cmd.slug}
                </span>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-text-primary">{cmd.name}</span>
                  <span className="text-[10px] text-text-muted ml-1.5 truncate">{cmd.description}</span>
                </div>

                {/* Category badge + args hint */}
                <div className="flex items-center gap-1 shrink-0">
                  {cmd.hasArguments && (
                    <span className="text-[10px] text-text-muted italic">[args]</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 bg-bg-primary rounded text-text-muted">
                    {cmd.category}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer hint */}
      <div className="border-t border-border-default px-3 py-1.5 text-[10px] text-text-muted flex gap-3 shrink-0">
        <span>↑↓ navigate</span>
        <span>·</span>
        <span>↵ select</span>
        <span>·</span>
        <span>esc dismiss</span>
      </div>
    </div>
  );
});

export default SlashCommandTypeahead;
