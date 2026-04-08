'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, RefreshCw, Code, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

interface SkillConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (skillName: string, skillContent: string) => Promise<void>;
  onRegenerate: () => void;
  generatedContent: string;
  agentName: string;
}

const SECRET_PATTERNS = [
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_.-]{20,}/ },
  { name: 'Connection String', pattern: /(postgres|mongodb|mysql):\/\// },
  { name: 'API Key', pattern: /(?:api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[A-Za-z0-9_.-]{16,}/i },
];

function parseFrontmatter(content: string): { name: string; description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { name: '', description: '', body: content };
  const frontmatter = match[1];
  const body = match[2];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || '',
    body: body.trim(),
  };
}

function validateSkill(name: string, description: string, content: string) {
  const issues: string[] = [];
  if (!name) {
    issues.push('Skill name is required');
  } else if (!/^[a-z0-9-]+$/.test(name) || name.length > 50) {
    issues.push('Name must be lowercase alphanumeric with hyphens, max 50 chars');
  }
  if (!description.trim()) {
    issues.push('Description is required');
  }
  if (!/##\s+(Instructions|Process)/i.test(content)) {
    issues.push('Missing ## Instructions or ## Process section');
  }
  return { valid: issues.length === 0, issues };
}

function detectSecrets(content: string): string[] {
  const found: string[] = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(content)) found.push(name);
  }
  return found;
}

function renderPreview(markdown: string): string {
  return markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-xs font-semibold text-text-secondary mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold text-text-secondary mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold text-text-secondary mt-4 mb-2">$1</h1>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-bg-tertiary rounded text-coder1-cyan text-[11px]">$1</code>')
    .replace(/^```[\s\S]*?```$/gm, (block) => {
      const inner = block.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      return `<pre class="bg-bg-tertiary rounded p-2 my-2 text-[11px] font-mono text-text-secondary overflow-x-auto">${inner}</pre>`;
    })
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 ml-2 text-xs text-text-muted"><span class="text-text-muted">-</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br/>');
}

export default function SkillConversionModal({
  isOpen,
  onClose,
  onSave,
  onRegenerate,
  generatedContent,
  agentName,
}: SkillConversionModalProps) {
  const [skillName, setSkillName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(generatedContent);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; issues: string[] }>({ valid: true, issues: [] });
  const [secrets, setSecrets] = useState<string[]>([]);

  // Parse frontmatter and initialize fields when content changes
  useEffect(() => {
    const parsed = parseFrontmatter(generatedContent);
    setSkillName(parsed.name);
    setDescription(parsed.description);
    setContent(generatedContent);
  }, [generatedContent]);

  // Re-validate whenever inputs change
  useEffect(() => {
    setValidation(validateSkill(skillName, description, content));
    setSecrets(detectSecrets(content));
  }, [skillName, description, content]);

  // Escape key closes modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSave = useCallback(async () => {
    if (!validation.valid) return;
    setSaving(true);
    setError('');
    try {
      await onSave(skillName, content);
      onClose();
    } catch {
      setError('Failed to save skill. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [validation.valid, skillName, content, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-bg-primary border border-border-default rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <h2 className="text-sm font-semibold text-text-secondary">
            Skill Preview
            <span className="ml-2 text-xs font-normal text-text-muted">from {agentName}</span>
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Name & Description fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Skill Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                placeholder="my-skill-name"
                className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary font-mono outline-none focus:border-coder1-cyan transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Description <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What this skill does"
                className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-coder1-cyan transition-colors"
              />
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 border-b border-border-default">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-b-2 -mb-px ${
                viewMode === 'preview'
                  ? 'text-coder1-cyan border-coder1-cyan'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              <Eye size={12} /> Preview
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-b-2 -mb-px ${
                viewMode === 'raw'
                  ? 'text-coder1-cyan border-coder1-cyan'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              <Code size={12} /> Raw
            </button>
          </div>

          {/* Content area */}
          {viewMode === 'preview' ? (
            <div
              className="bg-bg-secondary border border-border-default rounded p-3 text-xs text-text-muted min-h-[200px] max-h-[300px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: renderPreview(parseFrontmatter(content).body) }}
            />
          ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-bg-secondary border border-border-default rounded p-3 text-xs text-text-primary font-mono min-h-[200px] max-h-[300px] resize-none outline-none focus:border-coder1-cyan transition-colors"
              spellCheck={false}
            />
          )}

          {/* Secret detection warning */}
          {secrets.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-900/15 border border-amber-500/30 rounded">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400">Potential secrets detected</p>
                <p className="text-[11px] text-amber-400/70 mt-0.5">
                  Found: {secrets.join(', ')}. Review and remove before saving.
                </p>
              </div>
            </div>
          )}

          {/* Validation panel */}
          <div className="space-y-1">
            {validation.issues.length > 0 ? (
              validation.issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-400">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>{issue}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-green-400">
                <CheckCircle size={11} className="shrink-0" />
                <span>All checks passed</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted border border-border-default rounded hover:text-text-secondary hover:border-text-muted/40 transition-colors"
          >
            <RefreshCw size={12} /> Regenerate
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !validation.valid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={12} />
              {saving ? 'Saving...' : 'Save & Bind to Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
