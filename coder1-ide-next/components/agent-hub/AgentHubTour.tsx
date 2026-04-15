'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'center' | 'auto';
  highlightColor?: 'accent';
}

interface OnboardingTourProps {
  onClose: () => void;
  onComplete?: () => void;
}

const PRIMARY = '#00D9FF';
const ACCENT = '#8b5cf6';

const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', title: 'Welcome to Agent Hub', content: 'Meet your AI team. Create, manage, and teach autonomous agents that work alongside you.', target: 'agent-hub-welcome', position: 'center' },
  { id: 'sidebar', title: 'Your Command Center', content: 'Navigate between dashboard, agents, tasks, and projects. Everything for your AI team lives here.', target: 'agent-hub-sidebar', position: 'auto' },
  { id: 'agents-list', title: 'Your AI Team', content: 'Each agent has a role and skills. Click any agent to chat with it, teach it new workflows, or assign tasks.', target: 'agent-hub-agents-list', position: 'auto', highlightColor: 'accent' },
  { id: 'command-center', title: 'Chat with Your Agent', content: 'Talk to agents directly through the CommandCenter. Messages are routed through Claude Code on your machine.', target: 'agent-hub-command-center', position: 'auto' },
  { id: 'teach-button', title: 'Teach by Doing', content: 'Select an agent, then click "Teach" in the chat panel to walk your agent through a workflow step by step and convert it into a reusable skill.', target: 'agent-hub-teach-button', position: 'center', highlightColor: 'accent' },
  { id: 'tasks', title: 'Task Board', content: 'Assign work to your agents and track progress. Tasks run autonomously in isolated git worktrees with approval gates.', target: 'agent-hub-tasks', position: 'auto' },
  { id: 'dashboard-stats', title: 'Track Everything', content: 'Monitor runs, costs, and success rates at a glance. Your agents improve over time as skills mature from Draft to Reliable.', target: 'agent-hub-dashboard-stats', position: 'auto' },
];

const TOOLTIP_W = 340;
const TOOLTIP_H = 180;
const PAD = 16;

export default function AgentHubTour({ onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 1200, h: 800 });

  const step = TOUR_STEPS[currentStep];
  const borderColor = step.highlightColor === 'accent' ? ACCENT : PRIMARY;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // SSR-safe viewport tracking
  useEffect(() => {
    const update = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Find target element and track its rect
  useEffect(() => {
    const find = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setHighlightRect(el ? el.getBoundingClientRect() : null);
    };
    find();
    const interval = setInterval(find, 200);
    window.addEventListener('resize', find);
    return () => { clearInterval(interval); window.removeEventListener('resize', find); };
  }, [step.target]);

  // Calculate tooltip position
  useEffect(() => {
    if (step.position === 'center' || !highlightRect) {
      setTooltipPos({ x: (viewportSize.w - TOOLTIP_W) / 2, y: (viewportSize.h - TOOLTIP_H) / 2 });
      return;
    }
    const r = highlightRect;
    let x = r.left + r.width / 2 - TOOLTIP_W / 2;
    let y = r.bottom + PAD;
    if (y + TOOLTIP_H > viewportSize.h - PAD) y = r.top - TOOLTIP_H - PAD;
    // Clamp to viewport so tooltip never gets cut off at edges
    x = Math.max(PAD, Math.min(viewportSize.w - TOOLTIP_W - PAD, x));
    y = Math.max(PAD, Math.min(viewportSize.h - TOOLTIP_H - PAD, y));
    setTooltipPos({ x, y });
  }, [highlightRect, step.position, viewportSize]);

  const next = useCallback(() => {
    if (isLast) { onComplete?.(); onClose(); } else setCurrentStep((s) => s + 1);
  }, [isLast, onClose, onComplete]);

  const back = useCallback(() => { if (currentStep > 0) setCurrentStep((s) => s - 1); }, [currentStep]);

  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const r = highlightRect;
  const pad = 6;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* SVG overlay with mask cutout */}
      <svg width={viewportSize.w} height={viewportSize.h} viewBox={`0 0 ${viewportSize.w} ${viewportSize.h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {r && <rect x={r.left - pad} y={r.top - pad} width={r.width + pad * 2} height={r.height + pad * 2} rx={8} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight border glow */}
      {r && (
        <div style={{ position: 'absolute', left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2, border: `3px solid ${borderColor}`, borderRadius: 8, boxShadow: `0 0 24px 8px ${borderColor}44`, pointerEvents: 'none', transition: 'all 0.3s ease' }} />
      )}

      {/* Tooltip card */}
      <div style={{ position: 'absolute', left: tooltipPos.x, top: tooltipPos.y, width: TOOLTIP_W, background: 'rgba(10,10,10,0.96)', border: `1px solid ${borderColor}66`, borderRadius: 12, backdropFilter: 'blur(8px)', padding: '20px', transition: 'left 0.3s ease, top 0.3s ease' }}>
        {/* Step counter */}
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Step {currentStep + 1} of {TOUR_STEPS.length}</div>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#1e293b', borderRadius: 2, marginBottom: 14 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: borderColor, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>{step.title}</div>
        {/* Content */}
        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 18 }}>{step.content}</div>
        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {currentStep > 0 && (
            <button onClick={back} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: '#1e293b', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: 'transparent', color: '#475569', border: 'none', cursor: 'pointer' }}>Skip</button>
          <button onClick={next} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: borderColor, color: '#000', border: 'none', cursor: 'pointer' }}>{isLast ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
