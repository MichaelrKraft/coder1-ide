'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface ClaudeMdSectionGuideProps {
  content: string;
}

interface SectionCheck {
  name: string;
  present: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const RECOMMENDED_SECTIONS = [
  'Project Overview',
  'Tech Stack',
  'Key Directories',
  'Development Commands',
  'Code Standards',
  'Git Workflow',
  'Team Contacts',
] as const;

function detectSections(content: string): SectionCheck[] {
  const lines = content.split('\n');
  // Extract H2 header names
  const h2Headers = new Set<string>();
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      h2Headers.add(m[1].trim());
    }
  }

  return RECOMMENDED_SECTIONS.map((name) => ({
    name,
    present: h2Headers.has(name),
  }));
}

// ============================================================================
// Component
// ============================================================================

export function ClaudeMdSectionGuide({
  content,
}: ClaudeMdSectionGuideProps): React.ReactElement {
  const sections = detectSections(content);
  const presentCount = sections.filter((s) => s.present).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
          Sections
        </span>
        <span className="text-xs text-text-muted">
          {presentCount}/{sections.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {sections.map((section) => (
          <li key={section.name} className="flex items-center gap-2">
            {section.present ? (
              <svg
                className="w-3.5 h-3.5 text-green-500 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-text-muted/40 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
              </svg>
            )}
            <span
              className={`text-xs ${
                section.present ? 'text-text-primary' : 'text-text-muted'
              }`}
            >
              {section.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
