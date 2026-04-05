'use client';

import { BUILT_IN_TEMPLATES, type AgentTemplate } from '@/lib/agent-hub/templates';

interface Props {
  onSelect: (template: AgentTemplate) => void;
  onSkip: () => void;
}

export default function AgentTemplateSelector({ onSelect, onSkip }: Props) {
  return (
    <div className="px-5 py-4 border-b border-border-default">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Start from a template
        </p>
        <button
          onClick={onSkip}
          className="text-[10px] text-text-muted hover:text-coder1-cyan transition-colors"
        >
          or start from scratch
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {BUILT_IN_TEMPLATES.map(template => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className="group text-left p-2.5 rounded-lg border border-border-default bg-bg-tertiary hover:border-coder1-cyan/40 hover:bg-coder1-cyan/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{template.icon}</span>
              <span className="text-xs font-medium text-text-secondary group-hover:text-coder1-cyan transition-colors">
                {template.name}
              </span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
