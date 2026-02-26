'use client';

import React from 'react';
import { FileText, Tag } from 'lucide-react';
import type { OnboardingSession } from '@/types/onboarding';

interface OnboardingArchitectureTourProps {
  teamContext: OnboardingSession['teamContext'];
}

export default function OnboardingArchitectureTour({
  teamContext,
}: OnboardingArchitectureTourProps): React.ReactElement {
  const { claudeMdContent, techStack, projectDescription } = teamContext;

  // Show first 50 lines of CLAUDE.md
  const claudeMdPreview = claudeMdContent
    ? claudeMdContent.split('\n').slice(0, 50).join('\n')
    : '';

  const techTags = techStack
    ? techStack.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Project Architecture</h3>
        <p className="text-sm text-text-muted mt-1">
          Familiarize yourself with the team&apos;s codebase and conventions.
        </p>
      </div>

      {/* CLAUDE.md section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-medium text-text-primary">CLAUDE.md</h4>
        </div>

        {claudeMdPreview ? (
          <div className="relative">
            <pre className="text-xs text-text-secondary bg-bg-primary border border-border-default rounded-lg p-3 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap">
              {claudeMdPreview}
            </pre>
            {claudeMdContent.split('\n').length > 50 && (
              <p className="text-xs text-text-muted mt-1">
                Showing first 50 lines. Full file available in the repository.
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-bg-primary border border-border-default rounded-lg">
            <p className="text-sm text-text-muted">
              Your team hasn&apos;t set up their CLAUDE.md yet.
            </p>
            <p className="text-xs text-text-muted mt-1">
              Ask a team admin to configure it via Settings → Team Brain.
            </p>
          </div>
        )}
      </div>

      {/* Tech stack */}
      {techTags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-orange-400" />
            <h4 className="text-sm font-medium text-text-primary">Tech Stack</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {techTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Project description */}
      {projectDescription && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-1">About the project</h4>
          <p className="text-sm text-text-secondary">{projectDescription}</p>
        </div>
      )}
    </div>
  );
}
