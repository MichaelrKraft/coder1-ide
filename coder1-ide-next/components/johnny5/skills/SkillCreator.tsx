'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Zap,
  Clock,
  TrendingUp,
  Hand,
  Code,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Johnny5Skill } from '@/types/johnny5';

type SkillCategory = 'productivity' | 'research' | 'monitoring' | 'communication' | 'development';
type SkillTrigger = 'scheduled' | 'event' | 'manual' | 'trend';

interface SkillCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (skill: Omit<Johnny5Skill, 'id' | 'createdAt' | 'usageCount' | 'successRate' | 'lastUsed'>) => Promise<void>;
  editingSkill?: Johnny5Skill;
}

/**
 * SkillCreator - Modal for creating or editing Johnny5 skills
 *
 * Features:
 * - Name and description inputs
 * - Trigger type selector
 * - Category selector
 * - Code editor with syntax highlighting (simplified)
 * - Dependencies input
 * - Validation feedback
 */
export default function SkillCreator({
  isOpen,
  onClose,
  onSave,
  editingSkill,
}: SkillCreatorProps) {
  const [name, setName] = useState(editingSkill?.name || '');
  const [description, setDescription] = useState(editingSkill?.description || '');
  const [trigger, setTrigger] = useState<SkillTrigger>(editingSkill?.trigger || 'manual');
  const [category, setCategory] = useState<SkillCategory>(editingSkill?.category || 'productivity');
  const [code, setCode] = useState(editingSkill?.code || getDefaultCode('manual'));
  const [dependencies, setDependencies] = useState(editingSkill?.dependencies?.join(', ') || '');
  const [enabled, setEnabled] = useState(editingSkill?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Trigger options
  const triggerOptions: { value: SkillTrigger; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: 'manual',
      label: 'Manual',
      icon: <Hand className="w-4 h-4" />,
      description: 'Run on demand when you trigger it',
    },
    {
      value: 'scheduled',
      label: 'Scheduled',
      icon: <Clock className="w-4 h-4" />,
      description: 'Run at specific times (daily, weekly)',
    },
    {
      value: 'event',
      label: 'Event',
      icon: <Zap className="w-4 h-4" />,
      description: 'Run when a specific event occurs',
    },
    {
      value: 'trend',
      label: 'Trend',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Run when a trend is detected',
    },
  ];

  // Category options
  const categoryOptions: { value: SkillCategory; label: string; emoji: string }[] = [
    { value: 'productivity', label: 'Productivity', emoji: '⚡' },
    { value: 'research', label: 'Research', emoji: '🔍' },
    { value: 'monitoring', label: 'Monitoring', emoji: '📊' },
    { value: 'communication', label: 'Communication', emoji: '💬' },
    { value: 'development', label: 'Development', emoji: '💻' },
  ];

  // Get default code template based on trigger type
  function getDefaultCode(triggerType: SkillTrigger): string {
    const templates: Record<SkillTrigger, string> = {
      manual: `async function execute(context) {
  // Your skill logic here
  const { params } = context;

  // Example: Process input
  const result = await context.api.runTask({
    description: "My custom task",
    params
  });

  return { success: true, result };
}`,
      scheduled: `async function execute(context) {
  // This runs on a schedule
  const now = new Date();

  // Example: Generate a daily report
  const data = await context.api.gatherMetrics();

  return {
    success: true,
    timestamp: now,
    data
  };
}`,
      event: `async function execute(context) {
  // This runs when an event occurs
  const { event, payload } = context;

  // Example: Handle a file change event
  if (event === 'file_changed') {
    await context.api.analyzeFile(payload.path);
  }

  return { handled: true };
}`,
      trend: `async function execute(context) {
  // This runs when a trend is detected
  const { trend, data } = context;

  // Example: Analyze the trend
  const analysis = await context.api.analyzeTrend(data);

  return { trend, analysis };
}`,
    };
    return templates[triggerType];
  }

  // Handle trigger change - update code template if code is still default
  const handleTriggerChange = (newTrigger: SkillTrigger) => {
    const currentDefault = getDefaultCode(trigger);
    if (code.trim() === currentDefault.trim()) {
      setCode(getDefaultCode(newTrigger));
    }
    setTrigger(newTrigger);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push('Skill name is required');
    }
    if (!description.trim()) {
      newErrors.push('Description is required');
    }
    if (!code.includes('async function execute')) {
      newErrors.push('Code must contain an async execute function');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        trigger,
        category,
        code,
        dependencies: dependencies.split(',').map(d => d.trim()).filter(Boolean),
        enabled,
        createdBy: editingSkill?.createdBy || 'user',
      });
      onClose();
    } catch (error) {
      setErrors(['Failed to save skill. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setName(editingSkill?.name || '');
      setDescription(editingSkill?.description || '');
      setTrigger(editingSkill?.trigger || 'manual');
      setCategory(editingSkill?.category || 'productivity');
      setCode(editingSkill?.code || getDefaultCode('manual'));
      setDependencies(editingSkill?.dependencies?.join(', ') || '');
      setEnabled(editingSkill?.enabled ?? true);
      setErrors([]);
    }
  }, [isOpen, editingSkill]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-bg-primary border border-border-default rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-coder1-cyan" />
            <h2 className="text-lg font-bold text-text-primary">
              {editingSkill ? 'Edit Skill' : 'Create New Skill'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-130px)] space-y-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              {errors.map((error, i) => (
                <p key={i} className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Skill Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Analytics Report"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg
                text-sm text-text-primary placeholder-text-muted
                focus:outline-none focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill do?"
              rows={2}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg
                text-sm text-text-primary placeholder-text-muted resize-none
                focus:outline-none focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/30"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Trigger Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {triggerOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTriggerChange(option.value)}
                  className={`
                    flex items-start gap-2 p-3 rounded-lg border transition-all text-left
                    ${trigger === option.value
                      ? 'bg-coder1-cyan/10 border-coder1-cyan/50'
                      : 'bg-bg-secondary border-border-default hover:border-coder1-cyan/30'
                    }
                  `}
                >
                  <span className={trigger === option.value ? 'text-coder1-cyan' : 'text-text-muted'}>
                    {option.icon}
                  </span>
                  <div>
                    <span className={`text-xs font-semibold ${trigger === option.value ? 'text-coder1-cyan' : 'text-text-primary'}`}>
                      {option.label}
                    </span>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCategory(option.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all
                    ${category === option.value
                      ? 'bg-coder1-cyan/10 border-coder1-cyan/50 text-coder1-cyan'
                      : 'bg-bg-secondary border-border-default text-text-secondary hover:border-coder1-cyan/30'
                    }
                  `}
                >
                  <span>{option.emoji}</span>
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Editor */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary mb-1.5">
              <Code className="w-3.5 h-3.5" />
              Skill Code
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg
                text-xs text-text-primary font-mono leading-relaxed resize-none
                focus:outline-none focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/30"
            />
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Dependencies (comma-separated)
            </label>
            <input
              type="text"
              value={dependencies}
              onChange={(e) => setDependencies(e.target.value)}
              placeholder="e.g., calendar, email, github"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg
                text-sm text-text-primary placeholder-text-muted
                focus:outline-none focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/30"
            />
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
            <div>
              <p className="text-sm font-semibold text-text-primary">Enable Skill</p>
              <p className="text-xs text-text-muted">Skill will be active and ready to run</p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`
                relative w-12 h-6 rounded-full transition-all duration-200
                ${enabled
                  ? 'bg-coder1-cyan/30 border border-coder1-cyan/50'
                  : 'bg-bg-tertiary border border-border-default'
                }
              `}
            >
              <span
                className={`
                  absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200
                  ${enabled ? 'left-6 bg-coder1-cyan' : 'left-0.5 bg-text-muted'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-default">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary
              bg-bg-secondary border border-border-default rounded-lg hover:bg-bg-tertiary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-bg-primary
              bg-coder1-cyan rounded-lg hover:bg-coder1-cyan/90 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {editingSkill ? 'Save Changes' : 'Create Skill'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
