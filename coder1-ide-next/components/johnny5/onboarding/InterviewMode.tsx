'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  RefreshCw,
  Loader2,
  Plus,
  X,
  Lightbulb,
  Zap,
  Settings,
} from 'lucide-react';
import {
  matchCapabilities,
  MOCK_USER_PROFILE,
  INTERVIEW_QUESTIONS,
  type UserProfile,
  type MatchedCapability,
} from '@/services/johnny5/capability-matcher';
import CapabilityCard from './CapabilityCard';
import UserProfileSummary from './UserProfileSummary';

type InterviewStep = 'intro' | 'questions' | 'capabilities' | 'complete';

interface InterviewModeProps {
  className?: string;
  onComplete?: (profile: UserProfile, enabledCapabilities: string[]) => void;
}

/**
 * InterviewMode - Discovers what Johnny5 can do for the user
 *
 * From Alex Finn: "The issue most people have when they use any AI tool is
 * they don't hunt the unknown unknowns... you want to spend a lot of time saying
 * 'Hey here's everything about me, what can you do for me?'"
 *
 * Features:
 * - Multi-step interview to learn about the user
 * - Profile summary showing what Johnny5 learned
 * - Matched capabilities with relevance scores
 * - One-click enable for suggested features
 * - Warm, welcoming onboarding experience
 */
export default function InterviewMode({
  className = '',
  onComplete,
}: InterviewModeProps) {
  // State
  const [step, setStep] = useState<InterviewStep>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(MOCK_USER_PROFILE);
  const [capabilities, setCapabilities] = useState<MatchedCapability[]>([]);
  const [showProfile, setShowProfile] = useState(true);

  // Question answers state
  const [answers, setAnswers] = useState<Record<string, string[]>>({
    roles: [],
    platforms: [],
    projects: [],
    goals: [],
    proactivity: ['medium'],
  });

  // Text input state for text-list questions
  const [textInput, setTextInput] = useState('');

  // Fetch profile and capabilities on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/johnny5/onboarding/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setProfile(data.data);
          // Pre-fill answers from profile
          setAnswers({
            roles: data.data.roles || [],
            platforms: data.data.platforms || [],
            projects: data.data.projects || [],
            goals: data.data.goals || [],
            proactivity: [data.data.preferences?.proactivityLevel || 'medium'],
          });
        }
      }
    } catch {
      // Use mock data on error
    }
  };

  const fetchCapabilities = async () => {
    setLoading(true);
    try {
      // Build profile from answers
      const updatedProfile: UserProfile = {
        ...profile,
        roles: answers.roles,
        platforms: answers.platforms,
        projects: answers.projects,
        goals: answers.goals,
        preferences: {
          ...profile.preferences,
          proactivityLevel: answers.proactivity[0] as 'low' | 'medium' | 'high',
        },
        updatedAt: new Date(),
      };

      // Save profile
      await fetch('/api/johnny5/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });

      setProfile(updatedProfile);

      // Fetch matched capabilities
      const response = await fetch('/api/johnny5/onboarding/capabilities');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCapabilities(data.data);
        } else {
          // Fallback to local matching
          setCapabilities(matchCapabilities(updatedProfile));
        }
      } else {
        setCapabilities(matchCapabilities(updatedProfile));
      }
    } catch {
      // Fallback to local matching
      setCapabilities(matchCapabilities(profile));
    } finally {
      setLoading(false);
    }
  };

  // Handle question navigation
  const handleNext = () => {
    if (currentQuestion < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setTextInput('');
    } else {
      setStep('capabilities');
      fetchCapabilities();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      setStep('intro');
    }
  };

  // Handle answer changes
  const handleMultiSelectToggle = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleSingleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [value] }));
  };

  const handleAddTextItem = (questionId: string) => {
    if (textInput.trim()) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), textInput.trim()],
      }));
      setTextInput('');
    }
  };

  const handleRemoveTextItem = (questionId: string, index: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: prev[questionId].filter((_, i) => i !== index),
    }));
  };

  // Handle capability toggle
  const handleCapabilityToggle = (id: string, enabled: boolean) => {
    setCapabilities((prev) =>
      prev.map((cap) => (cap.id === id ? { ...cap, enabled } : cap))
    );
  };

  // Enable all capabilities
  const handleEnableAll = () => {
    setCapabilities((prev) => prev.map((cap) => ({ ...cap, enabled: true })));
  };

  // Complete onboarding
  const handleComplete = () => {
    setStep('complete');
    const enabledIds = capabilities.filter((c) => c.enabled).map((c) => c.id);
    onComplete?.(profile, enabledIds);
  };

  // Count enabled capabilities
  const enabledCount = useMemo(
    () => capabilities.filter((c) => c.enabled).length,
    [capabilities]
  );

  // Current question data
  const currentQ = INTERVIEW_QUESTIONS[currentQuestion];

  // Progress percentage
  const progressPercent =
    step === 'intro'
      ? 0
      : step === 'questions'
      ? ((currentQuestion + 1) / INTERVIEW_QUESTIONS.length) * 60
      : step === 'capabilities'
      ? 80
      : 100;

  return (
    <div className={`h-full flex flex-col bg-bg-primary ${className}`}>
      {/* Progress Bar */}
      <div className="h-1 bg-bg-tertiary">
        <div
          className="h-full bg-gradient-to-r from-coder1-cyan to-purple-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {step === 'intro' && (
          <IntroStep onStart={() => setStep('questions')} />
        )}

        {step === 'questions' && currentQ && (
          <QuestionStep
            question={currentQ}
            currentIndex={currentQuestion}
            totalQuestions={INTERVIEW_QUESTIONS.length}
            answers={answers[currentQ.id] || []}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onMultiSelectToggle={(value) =>
              handleMultiSelectToggle(currentQ.id, value)
            }
            onSingleSelect={(value) => handleSingleSelect(currentQ.id, value)}
            onAddTextItem={() => handleAddTextItem(currentQ.id)}
            onRemoveTextItem={(index) =>
              handleRemoveTextItem(currentQ.id, index)
            }
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {step === 'capabilities' && (
          <CapabilitiesStep
            loading={loading}
            profile={profile}
            capabilities={capabilities}
            showProfile={showProfile}
            enabledCount={enabledCount}
            onToggleProfile={() => setShowProfile(!showProfile)}
            onCapabilityToggle={handleCapabilityToggle}
            onEnableAll={handleEnableAll}
            onComplete={handleComplete}
            onRefresh={fetchCapabilities}
            onEditProfile={() => {
              setStep('questions');
              setCurrentQuestion(0);
            }}
          />
        )}

        {step === 'complete' && (
          <CompleteStep enabledCount={enabledCount} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center">
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-coder1-cyan/30 to-purple-500/20 flex items-center justify-center">
          <Mic className="w-10 h-10 text-coder1-cyan" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-black" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-3">
        Interview Mode
      </h1>

      <p className="text-text-secondary max-w-md mb-6 leading-relaxed">
        Let&apos;s discover what Johnny5 can do for{' '}
        <span className="text-coder1-cyan font-semibold">you</span>. In just a
        few questions, I&apos;ll learn about your work and suggest capabilities
        you might not know existed.
      </p>

      {/* Quote */}
      <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default max-w-md mb-8">
        <p className="text-sm text-text-muted italic">
          &quot;The issue most people have when they use any AI tool is they
          don&apos;t hunt the unknown unknowns... you want to spend a lot of
          time saying &apos;Hey here&apos;s everything about me, what can you do
          for me?&apos;&quot;
        </p>
        <p className="text-xs text-coder1-cyan mt-2">- Alex Finn</p>
      </div>

      <button
        onClick={onStart}
        className="
          flex items-center gap-2 px-6 py-3 rounded-xl
          bg-coder1-cyan text-black font-bold
          hover:bg-coder1-cyan/90 transition-all
          shadow-[0_0_20px_rgba(0,217,255,0.3)]
        "
      >
        Start Interview
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

interface QuestionStepProps {
  question: (typeof INTERVIEW_QUESTIONS)[number];
  currentIndex: number;
  totalQuestions: number;
  answers: string[];
  textInput: string;
  onTextInputChange: (value: string) => void;
  onMultiSelectToggle: (value: string) => void;
  onSingleSelect: (value: string) => void;
  onAddTextItem: () => void;
  onRemoveTextItem: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}

function QuestionStep({
  question,
  currentIndex,
  totalQuestions,
  answers,
  textInput,
  onTextInputChange,
  onMultiSelectToggle,
  onSingleSelect,
  onAddTextItem,
  onRemoveTextItem,
  onNext,
  onBack,
}: QuestionStepProps) {
  const canContinue =
    question.type === 'text-list' ? true : answers.length > 0;

  return (
    <div className="flex flex-col min-h-[500px] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <span className="text-sm text-text-muted">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Question */}
      <div className="flex-1">
        <h2 className="text-xl font-bold text-text-primary mb-6">
          {question.question}
        </h2>

        {/* Multi-select options */}
        {question.type === 'multi-select' && question.options && (
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => onMultiSelectToggle(option.value)}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${
                    answers.includes(option.value)
                      ? 'bg-coder1-cyan/10 border-coder1-cyan shadow-[0_0_10px_rgba(0,217,255,0.15)]'
                      : 'bg-bg-tertiary border-border-default hover:border-coder1-cyan/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      answers.includes(option.value)
                        ? 'text-coder1-cyan'
                        : 'text-text-primary'
                    }`}
                  >
                    {option.label}
                  </span>
                  {answers.includes(option.value) && (
                    <Check className="w-4 h-4 text-coder1-cyan" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Single-select options */}
        {question.type === 'single-select' && question.options && (
          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => onSingleSelect(option.value)}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${
                    answers.includes(option.value)
                      ? 'bg-coder1-cyan/10 border-coder1-cyan shadow-[0_0_10px_rgba(0,217,255,0.15)]'
                      : 'bg-bg-tertiary border-border-default hover:border-coder1-cyan/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      answers.includes(option.value)
                        ? 'text-coder1-cyan'
                        : 'text-text-primary'
                    }`}
                  >
                    {option.label}
                  </span>
                  {answers.includes(option.value) && (
                    <Check className="w-4 h-4 text-coder1-cyan" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Text list input */}
        {question.type === 'text-list' && (
          <div className="space-y-4">
            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => onTextInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddTextItem();
                  }
                }}
                placeholder={question.placeholder}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-bg-tertiary border border-border-default
                  text-text-primary placeholder-text-muted
                  focus:outline-none focus:border-coder1-cyan
                "
              />
              <button
                onClick={onAddTextItem}
                disabled={!textInput.trim()}
                className="
                  px-4 py-3 rounded-xl
                  bg-coder1-cyan text-black font-semibold
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:bg-coder1-cyan/90 transition-all
                "
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Added items */}
            {answers.length > 0 && (
              <div className="space-y-2">
                {answers.map((item, idx) => (
                  <div
                    key={idx}
                    className="
                      flex items-center justify-between gap-2 p-3 rounded-lg
                      bg-coder1-cyan/10 border border-coder1-cyan/30
                    "
                  >
                    <span className="text-sm text-text-primary">{item}</span>
                    <button
                      onClick={() => onRemoveTextItem(idx)}
                      className="text-text-muted hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="
            w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
            bg-coder1-cyan text-black font-bold
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-coder1-cyan/90 transition-all
          "
        >
          {currentIndex < totalQuestions - 1 ? 'Continue' : 'See What I Can Do'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface CapabilitiesStepProps {
  loading: boolean;
  profile: UserProfile;
  capabilities: MatchedCapability[];
  showProfile: boolean;
  enabledCount: number;
  onToggleProfile: () => void;
  onCapabilityToggle: (id: string, enabled: boolean) => void;
  onEnableAll: () => void;
  onComplete: () => void;
  onRefresh: () => void;
  onEditProfile: () => void;
}

function CapabilitiesStep({
  loading,
  profile,
  capabilities,
  showProfile,
  enabledCount,
  onToggleProfile,
  onCapabilityToggle,
  onEnableAll,
  onComplete,
  onRefresh,
  onEditProfile,
}: CapabilitiesStepProps) {
  // Split capabilities into enabled and suggested
  const enabledCapabilities = capabilities.filter((c) => c.enabled);
  const suggestedCapabilities = capabilities.filter((c) => !c.enabled);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <Loader2 className="w-10 h-10 text-coder1-cyan animate-spin mb-4" />
        <p className="text-text-secondary">
          Analyzing your profile and matching capabilities...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-400" />
            Here&apos;s What I Can Do For You
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Based on your profile, I found {capabilities.length} capabilities
            you might find useful.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-coder1-cyan/10 text-text-muted hover:text-coder1-cyan transition-all"
            title="Refresh suggestions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleProfile}
            className={`
              p-2 rounded-lg transition-all
              ${showProfile ? 'bg-coder1-cyan/20 text-coder1-cyan' : 'bg-bg-tertiary text-text-muted hover:text-coder1-cyan'}
            `}
            title="Toggle profile view"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Summary (Collapsible) */}
      {showProfile && (
        <UserProfileSummary
          profile={profile}
          onEdit={onEditProfile}
        />
      )}

      {/* Enabled Capabilities */}
      {enabledCapabilities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="text-sm font-bold text-text-primary">
              Enabled ({enabledCapabilities.length})
            </h3>
          </div>
          <div className="space-y-3">
            {enabledCapabilities.map((cap) => (
              <CapabilityCard
                key={cap.id}
                capability={cap}
                onToggle={onCapabilityToggle}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Capabilities */}
      {suggestedCapabilities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-text-primary">
                Suggested ({suggestedCapabilities.length})
              </h3>
            </div>
            <button
              onClick={onEnableAll}
              className="text-xs text-coder1-cyan hover:underline"
            >
              Enable All
            </button>
          </div>
          <div className="space-y-3">
            {suggestedCapabilities.map((cap) => (
              <CapabilityCard
                key={cap.id}
                capability={cap}
                onToggle={onCapabilityToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-4 border-t border-border-default flex items-center justify-between gap-4">
        <button
          onClick={onEditProfile}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-bg-tertiary text-text-secondary text-sm font-semibold
            hover:bg-coder1-cyan/10 hover:text-coder1-cyan transition-all
          "
        >
          Tell Me More About Yourself
        </button>

        <button
          onClick={onComplete}
          className="
            flex items-center gap-2 px-6 py-2 rounded-lg
            bg-coder1-cyan text-black font-bold
            hover:bg-coder1-cyan/90 transition-all
            shadow-[0_0_15px_rgba(0,217,255,0.2)]
          "
        >
          Done ({enabledCount} Enabled)
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CompleteStep({ enabledCount }: { enabledCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
        <Check className="w-8 h-8 text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-text-primary mb-3">
        You&apos;re All Set!
      </h2>

      <p className="text-text-secondary max-w-md mb-6">
        Johnny5 now knows what you need. You&apos;ve enabled{' '}
        <span className="text-coder1-cyan font-semibold">
          {enabledCount} capabilities
        </span>{' '}
        that will work proactively in the background.
      </p>

      <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default max-w-md">
        <p className="text-sm text-text-muted">
          Check the <span className="text-coder1-cyan">Morning Brief</span> tab
          tomorrow to see what Johnny5 accomplished while you were away.
        </p>
      </div>
    </div>
  );
}
