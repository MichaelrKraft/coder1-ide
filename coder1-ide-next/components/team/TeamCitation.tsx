'use client';

import React from 'react';

interface TeamCitationProps {
  username: string;
}

export default function TeamCitation({ username }: TeamCitationProps) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-coder1-cyan/10 text-coder1-cyan text-xs font-medium">
      <span className="text-[10px]">@</span>
      {username}
    </span>
  );
}

/**
 * Parse a message string and replace [team:@username] patterns with TeamCitation components.
 * Only parse in assistant messages, never in user messages or code blocks.
 * Handles usernames with hyphens and dots.
 */
export function parseTeamCitations(text: string, isAssistantMessage: boolean): (string | React.ReactElement)[] {
  if (!isAssistantMessage) return [text];

  // Regex handles usernames with word chars, hyphens, and dots
  const pattern = /\[team:@([\w.-]+)\]/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the citation component
    parts.push(<TeamCitation key={`citation-${match.index}`} username={match[1]} />);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
