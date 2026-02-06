'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ListChecks,
  Play,
  Check,
  SkipForward,
  ChevronLeft,
  Plus,
  Clipboard,
  Send,
  Pause,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  getWorkflowEngine,
  type Workflow,
  type WorkflowStep,
  type WorkflowTemplate,
  type WorkflowTemplatePlaceholder,
} from '@/services/johnny5/workflow-engine';

// ============================================================================
// Types
// ============================================================================

interface WorkflowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'list' | 'detail' | 'create';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_COLORS: Record<Workflow['category'], string> = {
  feature: 'bg-blue-500/20 text-blue-400',
  bugfix: 'bg-red-500/20 text-red-400',
  refactor: 'bg-purple-500/20 text-purple-400',
  test: 'bg-green-500/20 text-green-400',
  deploy: 'bg-orange-500/20 text-orange-400',
  custom: 'bg-coder1-cyan/20 text-coder1-cyan',
};

const STATUS_COLORS: Record<Workflow['status'], string> = {
  active: 'bg-green-500/20 text-green-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-neutral-500/20 text-neutral-400',
};

const STEP_STATUS_COLORS: Record<WorkflowStep['status'], string> = {
  pending: 'border-neutral-600 text-neutral-500',
  in_progress: 'border-coder1-cyan text-coder1-cyan',
  completed: 'border-green-500 text-green-500',
  skipped: 'border-yellow-500 text-yellow-500',
};

// ============================================================================
// Component
// ============================================================================

export default function WorkflowBuilder({ isOpen, onClose }: WorkflowBuilderProps) {
  const [view, setView] = useState<View>('list');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);

  // Custom workflow state
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customSteps, setCustomSteps] = useState<
    Array<{ title: string; description: string; promptTemplate: string }>
  >([{ title: '', description: '', promptTemplate: '' }]);

  const engine = useMemo(() => getWorkflowEngine(), []);
  const templates = useMemo(() => engine.getTemplates(), [engine]);

  // Load workflows and listen for updates
  const refreshWorkflows = useCallback(() => {
    setWorkflows(engine.getWorkflows());
  }, [engine]);

  useEffect(() => {
    refreshWorkflows();

    const handler = () => refreshWorkflows();
    window.addEventListener('johnny5:workflowUpdate', handler);
    return () => window.removeEventListener('johnny5:workflowUpdate', handler);
  }, [refreshWorkflows]);

  // Derived state
  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId],
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSelectWorkflow = useCallback((id: string) => {
    setSelectedWorkflowId(id);
    setExpandedSteps(new Set());
    setEditingNotes(null);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'detail') {
      setSelectedWorkflowId(null);
      setView('list');
    } else if (view === 'create') {
      setSelectedTemplateId(null);
      setPlaceholderValues({});
      setCustomName('');
      setCustomDescription('');
      setCustomSteps([{ title: '', description: '', promptTemplate: '' }]);
      setView('list');
    }
  }, [view]);

  const handleNewWorkflow = useCallback(() => {
    setSelectedTemplateId(null);
    setPlaceholderValues({});
    setCustomName('');
    setCustomDescription('');
    setCustomSteps([{ title: '', description: '', promptTemplate: '' }]);
    setView('create');
  }, []);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        const values: Record<string, string> = {};
        for (const p of template.placeholders) {
          values[p.key] = '';
        }
        setPlaceholderValues(values);
      }
    },
    [templates],
  );

  const handleCreateFromTemplate = useCallback(() => {
    if (!selectedTemplateId) return;
    try {
      const workflow = engine.createFromTemplate(selectedTemplateId, placeholderValues);
      setSelectedWorkflowId(workflow.id);
      setSelectedTemplateId(null);
      setPlaceholderValues({});
      setView('detail');
    } catch {
      // Template not found -- ignore.
    }
  }, [engine, selectedTemplateId, placeholderValues]);

  const handleCreateCustom = useCallback(() => {
    if (!customName.trim()) return;
    const validSteps = customSteps.filter((s) => s.title.trim() && s.promptTemplate.trim());
    if (validSteps.length === 0) return;

    const workflow = engine.createCustom(customName, customDescription, validSteps);
    setSelectedWorkflowId(workflow.id);
    setCustomName('');
    setCustomDescription('');
    setCustomSteps([{ title: '', description: '', promptTemplate: '' }]);
    setView('detail');
  }, [engine, customName, customDescription, customSteps]);

  const handleStepStatus = useCallback(
    (stepId: string, status: WorkflowStep['status']) => {
      if (!selectedWorkflowId) return;
      engine.updateStepStatus(selectedWorkflowId, stepId, status);
    },
    [engine, selectedWorkflowId],
  );

  const handleSaveNotes = useCallback(
    (stepId: string) => {
      if (!selectedWorkflowId) return;
      const step = selectedWorkflow?.steps.find((s) => s.id === stepId);
      if (step) {
        engine.updateStepStatus(selectedWorkflowId, stepId, step.status, notesDraft);
      }
      setEditingNotes(null);
      setNotesDraft('');
    },
    [engine, selectedWorkflowId, selectedWorkflow, notesDraft],
  );

  const handleSendToTerminal = useCallback((text: string) => {
    window.dispatchEvent(
      new CustomEvent('johnny5:sendToTerminal', { detail: { text } }),
    );
  }, []);

  const handleCopyPrompt = useCallback((stepId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStepId(stepId);
    setTimeout(() => setCopiedStepId(null), 2000);
  }, []);

  const toggleStepExpanded = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const handleCompleteWorkflow = useCallback(() => {
    if (!selectedWorkflowId) return;
    engine.completeWorkflow(selectedWorkflowId);
  }, [engine, selectedWorkflowId]);

  const handleDeleteWorkflow = useCallback(() => {
    if (!selectedWorkflowId) return;
    engine.deleteWorkflow(selectedWorkflowId);
    setSelectedWorkflowId(null);
    setView('list');
  }, [engine, selectedWorkflowId]);

  const handlePauseResume = useCallback(() => {
    if (!selectedWorkflow) return;
    if (selectedWorkflow.status === 'active') {
      engine.pauseWorkflow(selectedWorkflow.id);
    } else if (selectedWorkflow.status === 'paused') {
      engine.resumeWorkflow(selectedWorkflow.id);
    }
  }, [engine, selectedWorkflow]);

  const addCustomStep = useCallback(() => {
    setCustomSteps((prev) => [...prev, { title: '', description: '', promptTemplate: '' }]);
  }, []);

  const removeCustomStep = useCallback((index: number) => {
    setCustomSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCustomStep = useCallback(
    (index: number, field: 'title' | 'description' | 'promptTemplate', value: string) => {
      setCustomSteps((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Early return
  // -----------------------------------------------------------------------

  if (!isOpen) return null;

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderProgressBar = (completed: number, total: number) => {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-bg-primary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? '#22c55e' : '#00D9FF',
            }}
          />
        </div>
        <span className="text-[10px] text-text-muted whitespace-nowrap">
          {completed}/{total}
        </span>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // View: Workflow List
  // -----------------------------------------------------------------------

  const renderListView = () => (
    <>
      {/* New Workflow button */}
      <div className="px-4 py-2">
        <button
          onClick={handleNewWorkflow}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Workflow
        </button>
      </div>

      {/* Workflow cards */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {workflows.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-xs">
            No workflows yet. Create one from a template or build your own.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => handleSelectWorkflow(workflow.id)}
                className="text-left p-3 bg-bg-tertiary border border-border-default rounded-lg hover:border-coder1-cyan/30 hover:bg-bg-tertiary/80 transition-all group"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xs font-semibold text-text-primary group-hover:text-coder1-cyan transition-colors">
                    {workflow.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[workflow.category]}`}
                    >
                      {workflow.category}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${STATUS_COLORS[workflow.status]}`}
                    >
                      {workflow.status}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted line-clamp-1 mb-2">
                  {workflow.description}
                </p>
                {renderProgressBar(workflow.completedSteps, workflow.totalSteps)}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // -----------------------------------------------------------------------
  // View: Workflow Detail
  // -----------------------------------------------------------------------

  const renderDetailView = () => {
    if (!selectedWorkflow) return null;

    return (
      <div className="flex-1 overflow-auto">
        {/* Workflow info */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] text-text-muted mb-2">{selectedWorkflow.description}</p>
          {renderProgressBar(selectedWorkflow.completedSteps, selectedWorkflow.totalSteps)}
        </div>

        {/* Step list */}
        <div className="px-4 pb-2 space-y-1.5">
          {selectedWorkflow.steps.map((step, index) => {
            const isExpanded = expandedSteps.has(step.id);
            const isEditing = editingNotes === step.id;
            const isCopied = copiedStepId === step.id;

            return (
              <div
                key={step.id}
                className="bg-bg-tertiary border border-border-default rounded-lg overflow-hidden"
              >
                {/* Step header */}
                <button
                  onClick={() => toggleStepExpanded(step.id)}
                  className="w-full flex items-center gap-2.5 p-2.5 text-left hover:bg-bg-secondary/30 transition-all"
                >
                  {/* Status indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${STEP_STATUS_COLORS[step.status]}`}
                  >
                    {step.status === 'completed' && <Check className="w-3 h-3" />}
                    {step.status === 'skipped' && <SkipForward className="w-2.5 h-2.5" />}
                    {step.status === 'in_progress' && (
                      <div className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse" />
                    )}
                    {step.status === 'pending' && (
                      <span className="text-[9px] font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs font-medium ${
                        step.status === 'completed'
                          ? 'text-text-muted line-through'
                          : step.status === 'in_progress'
                            ? 'text-coder1-cyan'
                            : 'text-text-primary'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>

                  {/* Expand chevron */}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-0 space-y-2">
                    {/* Description */}
                    <p className="text-[10px] text-text-muted pl-7">{step.description}</p>

                    {/* Prompt template */}
                    <div className="ml-7 p-2 bg-bg-primary/80 border border-border-default rounded-md">
                      <pre className="text-[10px] text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                        {step.promptTemplate}
                      </pre>
                    </div>

                    {/* Action buttons */}
                    <div className="ml-7 flex flex-wrap gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendToTerminal(step.promptTemplate);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        Send to Terminal
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPrompt(step.id, step.promptTemplate);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-bg-secondary text-text-muted hover:text-text-secondary transition-all"
                      >
                        <Clipboard className="w-3 h-3" />
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                      {step.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepStatus(step.id, 'completed');
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                        >
                          <Check className="w-3 h-3" />
                          Complete
                        </button>
                      )}
                      {step.status !== 'skipped' && step.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepStatus(step.id, 'skipped');
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
                        >
                          <SkipForward className="w-3 h-3" />
                          Skip
                        </button>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="ml-7">
                      {isEditing ? (
                        <div className="space-y-1">
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1.5 bg-bg-primary border border-border-default rounded-md text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 resize-none"
                            placeholder="Add notes about this step..."
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveNotes(step.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingNotes(null);
                                setNotesDraft('');
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-medium text-text-muted hover:text-text-secondary transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingNotes(step.id);
                            setNotesDraft(step.notes ?? '');
                          }}
                          className="text-[10px] text-text-muted hover:text-coder1-cyan transition-all"
                        >
                          {step.notes ? (
                            <span className="italic">{step.notes}</span>
                          ) : (
                            '+ Add notes'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Workflow actions */}
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {selectedWorkflow.status !== 'completed' && (
            <button
              onClick={handleCompleteWorkflow}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
            >
              <Check className="w-3 h-3" />
              Complete Workflow
            </button>
          )}
          {(selectedWorkflow.status === 'active' || selectedWorkflow.status === 'paused') && (
            <button
              onClick={handlePauseResume}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
            >
              {selectedWorkflow.status === 'active' ? (
                <>
                  <Pause className="w-3 h-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Resume
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDeleteWorkflow}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // View: Create Workflow
  // -----------------------------------------------------------------------

  const renderCreateView = () => {
    if (selectedTemplate) {
      // Template fill form
      return (
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-3">
            <div className="p-3 bg-bg-tertiary border border-border-default rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-text-primary">{selectedTemplate.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[selectedTemplate.category]}`}>
                  {selectedTemplate.category}
                </span>
              </div>
              <p className="text-[10px] text-text-muted">{selectedTemplate.description}</p>
              <p className="text-[10px] text-text-muted mt-1">{selectedTemplate.steps.length} steps</p>
            </div>

            {selectedTemplate.placeholders.map((placeholder: WorkflowTemplatePlaceholder) => (
              <div key={placeholder.key}>
                <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1">
                  {placeholder.label}
                </label>
                <input
                  type="text"
                  value={placeholderValues[placeholder.key] ?? ''}
                  onChange={(e) =>
                    setPlaceholderValues((prev) => ({ ...prev, [placeholder.key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                  placeholder={placeholder.description}
                />
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handleCreateFromTemplate}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Workflow
            </button>
          </div>
        </div>
      );
    }

    // Template picker + custom option
    return (
      <div className="flex-1 overflow-auto px-4 pb-4">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 mt-2">
          Choose a template
        </p>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              className="text-left p-3 bg-bg-tertiary border border-border-default rounded-lg hover:border-coder1-cyan/30 hover:bg-bg-tertiary/80 transition-all group"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-coder1-cyan/10 flex items-center justify-center shrink-0">
                  <ListChecks className="w-4 h-4 text-coder1-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-text-primary group-hover:text-coder1-cyan transition-colors">
                      {template.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[template.category]}`}>
                      {template.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted line-clamp-2">{template.description}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{template.steps.length} steps</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom workflow option */}
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
          Or build your own
        </p>
        <div className="p-3 bg-bg-tertiary border border-border-default rounded-lg space-y-3">
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Workflow Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
              placeholder="e.g., Setup Monorepo"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
              placeholder="What this workflow accomplishes"
            />
          </div>

          {/* Custom steps */}
          <div className="space-y-2">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Steps</p>
            {customSteps.map((step, index) => (
              <div key={index} className="p-2 bg-bg-primary/50 border border-border-default rounded-md space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Step {index + 1}</span>
                  {customSteps.length > 1 && (
                    <button
                      onClick={() => removeCustomStep(index)}
                      className="text-red-400 hover:text-red-300 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateCustomStep(index, 'title', e.target.value)}
                  className="w-full px-2 py-1 bg-bg-primary border border-border-default rounded text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                  placeholder="Step title"
                />
                <input
                  type="text"
                  value={step.description}
                  onChange={(e) => updateCustomStep(index, 'description', e.target.value)}
                  className="w-full px-2 py-1 bg-bg-primary border border-border-default rounded text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                  placeholder="Step description"
                />
                <textarea
                  value={step.promptTemplate}
                  onChange={(e) => updateCustomStep(index, 'promptTemplate', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 bg-bg-primary border border-border-default rounded text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 resize-none font-mono"
                  placeholder="Prompt to send to Claude Code for this step"
                />
              </div>
            ))}
            <button
              onClick={addCustomStep}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium text-text-muted hover:text-coder1-cyan hover:bg-bg-secondary/50 border border-dashed border-border-default transition-all"
            >
              <Plus className="w-3 h-3" />
              Add Step
            </button>
          </div>

          <button
            onClick={handleCreateCustom}
            disabled={!customName.trim() || customSteps.every((s) => !s.title.trim() || !s.promptTemplate.trim())}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Custom Workflow
          </button>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const headerTitle = (() => {
    if (view === 'detail' && selectedWorkflow) return selectedWorkflow.name;
    if (view === 'create' && selectedTemplate) return selectedTemplate.name;
    if (view === 'create') return 'New Workflow';
    return 'Workflow Orchestrator';
  })();

  return (
    <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          {(view === 'detail' || view === 'create') && (
            <button
              onClick={handleBack}
              className="p-1 rounded hover:bg-bg-tertiary text-text-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <ListChecks className="w-4 h-4 text-coder1-cyan" />
          <span className="text-sm font-semibold text-text-primary">{headerTitle}</span>
          {view === 'detail' && selectedWorkflow && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${STATUS_COLORS[selectedWorkflow.status]}`}>
              {selectedWorkflow.status}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {view === 'list' && renderListView()}
      {view === 'detail' && renderDetailView()}
      {view === 'create' && renderCreateView()}
    </div>
  );
}
