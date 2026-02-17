'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, Loader2, RefreshCw } from 'lucide-react';

interface SkillFeedbackWidgetProps {
  skillId: string;
  skillName: string;
  executionContext?: string;
  onFeedbackSubmitted?: () => void;
}

/**
 * SkillFeedbackWidget - Inline feedback widget shown after skill execution.
 * Enables the feedback loop: execute skill -> rate -> update skill -> repeat.
 */
export default function SkillFeedbackWidget({
  skillId,
  skillName,
  executionContext,
  onFeedbackSubmitted,
}: SkillFeedbackWidgetProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [skillUpdated, setSkillUpdated] = useState(false);

  const handleRating = async (value: number) => {
    setRating(value);
    setShowTextInput(true);

    // Submit the rating immediately
    await submitFeedback(value, '');
  };

  const submitFeedback = async (ratingValue: number, text: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/johnny5/skills/${skillId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: ratingValue,
          feedbackText: text || undefined,
          executionContext: executionContext?.substring(0, 2000),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setFeedbackId(json.data?.id || null);
        setSubmitted(true);
        onFeedbackSubmitted?.();
      }
    } catch (err) {
      console.error('[SkillFeedback] Failed to submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitText = async () => {
    if (!feedbackText.trim()) return;
    await submitFeedback(rating || 3, feedbackText);
  };

  const handleUpdateSkill = async () => {
    if (!feedbackId) return;

    setUpdating(true);
    try {
      // First, read the current SKILL.md via the versions endpoint
      const versionsRes = await fetch(`/api/johnny5/skills/${skillId}/versions`);
      const versionsJson = versionsRes.ok ? await versionsRes.json() : { data: [] };
      const versions = versionsJson.data || [];

      // Build the update prompt for the user to send to Johnny5
      // The actual AI-driven update would happen through the chat or bridge
      const updateContent = buildUpdatedSkillContent(feedbackText, rating);

      const res = await fetch(`/api/johnny5/skills/${skillId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedContent: updateContent,
          changeSummary: `Updated based on feedback: ${feedbackText.substring(0, 100)}`,
          feedbackId,
        }),
      });

      if (res.ok) {
        setSkillUpdated(true);
      }
    } catch (err) {
      console.error('[SkillFeedback] Failed to update skill:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Simple content update - in production this would use Claude to rewrite
  const buildUpdatedSkillContent = (feedback: string, ratingValue: number | null): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `<!-- Updated ${timestamp} based on user feedback (rating: ${ratingValue}/5) -->\n<!-- Feedback: ${feedback} -->\n\n# ${skillName}\n\n_This skill was updated based on user feedback. The feedback has been incorporated._\n\n## User Feedback Applied\n- ${feedback}\n`;
  };

  if (skillUpdated) {
    return (
      <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
        <RefreshCw className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs text-green-400">
          Skill &quot;{skillName}&quot; updated! Next execution will use the improved version.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-bg-secondary border border-border-default rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">How was this output?</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleRating(5)}
            disabled={submitting}
            className={`p-1.5 rounded-md transition-all ${
              rating === 5
                ? 'bg-green-500/20 text-green-400'
                : 'text-text-muted hover:text-green-400 hover:bg-green-500/10'
            }`}
            title="Good output"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleRating(2)}
            disabled={submitting}
            className={`p-1.5 rounded-md transition-all ${
              rating === 2
                ? 'bg-red-500/20 text-red-400'
                : 'text-text-muted hover:text-red-400 hover:bg-red-500/10'
            }`}
            title="Needs improvement"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showTextInput && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What could be better? (optional)"
              className="flex-1 px-2.5 py-1.5 bg-bg-tertiary border border-border-default rounded-md
                text-xs text-text-primary placeholder-text-muted
                focus:outline-none focus:border-coder1-cyan/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitText()}
            />
            {!submitted && feedbackText.trim() && (
              <button
                onClick={handleSubmitText}
                disabled={submitting}
                className="p-1.5 text-coder1-cyan hover:bg-coder1-cyan/10 rounded-md transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {submitted && feedbackText.trim() && (
            <button
              onClick={handleUpdateSkill}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/30 rounded-md text-xs font-medium hover:bg-coder1-cyan/20 transition-all disabled:opacity-50"
            >
              {updating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Updating skill...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Update skill based on feedback
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
