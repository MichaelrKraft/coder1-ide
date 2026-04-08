'use client';

import React, { useEffect, useRef } from 'react';

export interface TemplateContext {
  date: string;
  activeFile: string;
}

export interface NoteTemplate {
  id: string;
  label: string;
  icon: string;
  buildContent: (ctx: TemplateContext) => string;
  buildFilename: (ctx: TemplateContext) => string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'daily-note',
    label: 'Daily Note',
    icon: '',
    buildFilename: (ctx) => ctx.date,
    buildContent: (ctx) =>
      `# ${ctx.date}\n\n## Today's Goals\n- \n\n## Notes\n\n## End of Day\n`,
  },
  {
    id: 'adr',
    label: 'Architecture Decision Record',
    icon: '',
    buildFilename: (ctx) => `ADR-${ctx.date}`,
    buildContent: (ctx) =>
      `# ADR: \n\n**Date**: ${ctx.date}\n**Status**: Proposed\n\n## Context\n\n## Decision\n\n## Consequences\n`,
  },
  {
    id: 'bug-post-mortem',
    label: 'Bug Post-Mortem',
    icon: '',
    buildFilename: (ctx) => `Bug-Post-Mortem-${ctx.date}`,
    buildContent: (ctx) =>
      `# Bug Post-Mortem\n\n**Date**: ${ctx.date}\n**File**: ${ctx.activeFile || 'unknown'}\n\n## Summary\n\n## Root Cause\n\n## Fix\n\n## Prevention\n`,
  },
  {
    id: 'feature-brief',
    label: 'Feature Brief',
    icon: '',
    buildFilename: (ctx) => `Feature-Brief-${ctx.date}`,
    buildContent: (ctx) =>
      `# Feature Brief: \n\n**Date**: ${ctx.date}\n\n## Problem\n\n## Proposed Solution\n\n## Acceptance Criteria\n- [ ] \n`,
  },
  {
    id: 'meeting-notes',
    label: 'Meeting Notes',
    icon: '',
    buildFilename: (ctx) => `Meeting-${ctx.date}`,
    buildContent: (ctx) =>
      `# Meeting: \n\n**Date**: ${ctx.date}\n**Attendees**: \n\n## Agenda\n\n## Notes\n\n## Action Items\n- [ ] \n`,
  },
];

interface TemplatePickerModalProps {
  anchorRef: React.RefObject<HTMLButtonElement>;
  onSelect: (template: NoteTemplate) => void;
  onDismiss: () => void;
}

export default function TemplatePickerModal({
  anchorRef,
  onSelect,
  onDismiss,
}: TemplatePickerModalProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onDismiss]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;

  return (
    <div
      ref={pickerRef}
      style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 50 }}
      className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-lg shadow-xl p-1 w-52"
    >
      {NOTE_TEMPLATES.map((template) => (
        <button
          key={template.id}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#2a2a4e] cursor-pointer text-sm text-[#e2e8f0] transition-colors"
          onClick={() => onSelect(template)}
        >
          <span>{template.label}</span>
        </button>
      ))}
    </div>
  );
}
