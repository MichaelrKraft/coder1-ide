'use client';

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Key,
  Shield,
  MessageSquare,
  FileText,
  Terminal,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface SetupWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

type WizardStep = 'welcome' | 'apikey' | 'permissions' | 'complete';

type ValidationStatus = 'idle' | 'validating' | 'success' | 'error';

interface Permissions {
  readFiles: boolean;
  suggestCode: boolean;
  executeTerminal: boolean;
  externalRequests: boolean;
}

/**
 * SetupWizard Component
 *
 * Simplified 4-step setup flow for Johnny5:
 * 1. Welcome - Introduction
 * 2. API Key - Connect to Claude with validation
 * 3. Permissions - Set permissions and proactivity
 * 4. Complete - Quick start tips
 */
export default function SetupWizard({
  onComplete,
  onSkip,
  className,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState('');
  const [validatedModel, setValidatedModel] = useState('');

  // Permissions state
  const [permissions, setPermissions] = useState<Permissions>({
    readFiles: true,
    suggestCode: true,
    executeTerminal: false,
    externalRequests: false,
  });
  const [proactivityLevel, setProactivityLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  const steps: WizardStep[] = ['welcome', 'apikey', 'permissions', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  // Validate API key
  const validateApiKey = useCallback(async () => {
    if (!apiKey.trim()) {
      setValidationError('Please enter your API key');
      return;
    }

    setValidationStatus('validating');
    setValidationError('');

    try {
      const response = await fetch('/api/johnny5/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-api-key',
          apiKey: apiKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setValidationStatus('success');
        setValidatedModel(data.data?.model || 'claude-3-5-sonnet');
        setValidationError('');
      } else {
        setValidationStatus('error');
        setValidationError(data.error || 'Validation failed');
      }
    } catch {
      setValidationStatus('error');
      setValidationError('Network error. Please check your connection.');
    }
  }, [apiKey]);

  // Save configuration
  const saveConfiguration = useCallback(async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/johnny5/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-config',
          apiKey: apiKey.trim(),
          permissions,
          proactivityLevel,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error('Failed to save configuration:', data.error);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, permissions, proactivityLevel]);

  // Navigate to next step
  const goNext = async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      // Save config before going to complete
      if (steps[nextIndex] === 'complete') {
        await saveConfiguration();
      }
      setCurrentStep(steps[nextIndex]);
    }
  };

  // Navigate to previous step
  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  // Toggle helper
  const Toggle = ({
    enabled,
    onChange,
    color = 'cyan'
  }: {
    enabled: boolean;
    onChange: () => void;
    color?: 'cyan' | 'yellow' | 'orange';
  }) => {
    const colors = {
      cyan: enabled ? 'bg-coder1-cyan' : 'bg-bg-secondary',
      yellow: enabled ? 'bg-yellow-500' : 'bg-bg-secondary',
      orange: enabled ? 'bg-orange-500' : 'bg-bg-secondary',
    };

    return (
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-all ${colors[color]}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
            enabled ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            {/* Johnny5 Avatar */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-coder1-cyan/20 to-purple-500/20 flex items-center justify-center border border-coder1-cyan/30">
              <Sparkles className="w-12 h-12 text-coder1-cyan" />
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Meet Johnny5
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-8">
              Your autonomous AI teammate that learns and grows with you.
              Let&apos;s get you set up in just a few steps.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <MessageSquare className="w-6 h-6 text-coder1-cyan mx-auto mb-2" />
                <p className="text-xs text-text-muted">Natural Chat</p>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <FileText className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-text-muted">Code Review</p>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <Shield className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-text-muted">Your Control</p>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Takes about 2 minutes to complete
            </p>
          </div>
        );

      case 'apikey':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-coder1-cyan/10 flex items-center justify-center">
                <Key className="w-7 h-7 text-coder1-cyan" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Connect to Claude
              </h2>
              <p className="text-sm text-text-muted">
                Enter your Anthropic API key to power Johnny5
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              {/* API Key Input */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Anthropic API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (validationStatus !== 'idle') {
                        setValidationStatus('idle');
                        setValidationError('');
                      }
                    }}
                    placeholder="sk-ant-..."
                    className={`
                      w-full px-4 py-3 rounded-lg bg-bg-secondary border text-text-primary
                      placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all
                      ${validationStatus === 'error'
                        ? 'border-red-500 focus:ring-red-500/30'
                        : validationStatus === 'success'
                        ? 'border-green-500 focus:ring-green-500/30'
                        : 'border-border-default focus:ring-coder1-cyan/30 focus:border-coder1-cyan'
                      }
                    `}
                  />
                  {validationStatus === 'success' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                  {validationStatus === 'error' && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* Validation Status Messages */}
                {validationStatus === 'success' && (
                  <p className="mt-2 text-sm text-green-500 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Key validated! Connected to {validatedModel}
                  </p>
                )}
                {validationStatus === 'error' && validationError && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationError}
                  </p>
                )}
              </div>

              {/* Validate Button */}
              <button
                onClick={validateApiKey}
                disabled={validationStatus === 'validating' || !apiKey.trim()}
                className={`
                  w-full py-3 rounded-lg font-medium text-sm transition-all
                  flex items-center justify-center gap-2
                  ${validationStatus === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-coder1-cyan hover:bg-coder1-cyan/90 text-black'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {validationStatus === 'validating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating...
                  </>
                ) : validationStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Key Validated
                  </>
                ) : (
                  'Validate Key'
                )}
              </button>

              {/* Get API Key Link */}
              <p className="text-center text-sm text-text-muted">
                Don&apos;t have a key?{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coder1-cyan hover:underline inline-flex items-center gap-1"
                >
                  Get one from Anthropic
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Set Johnny5&apos;s Permissions
              </h2>
              <p className="text-sm text-text-muted">
                Control what Johnny5 can do in your project
              </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              {/* Read Files */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-coder1-cyan/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-coder1-cyan" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">
                        Read files in your project
                      </h4>
                      <p className="text-xs text-text-muted">
                        Analyze code and understand context
                      </p>
                    </div>
                  </div>
                  <Toggle
                    enabled={permissions.readFiles}
                    onChange={() => setPermissions(p => ({ ...p, readFiles: !p.readFiles }))}
                  />
                </div>
              </div>

              {/* Suggest Code */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">
                        Suggest code changes
                      </h4>
                      <p className="text-xs text-text-muted">
                        Provide code suggestions and improvements
                      </p>
                    </div>
                  </div>
                  <Toggle
                    enabled={permissions.suggestCode}
                    onChange={() => setPermissions(p => ({ ...p, suggestCode: !p.suggestCode }))}
                  />
                </div>
              </div>

              {/* Execute Terminal */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                        Execute terminal commands
                        <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
                          Advanced
                        </span>
                      </h4>
                      <p className="text-xs text-text-muted">
                        Run npm, git, and other CLI commands
                      </p>
                    </div>
                  </div>
                  <Toggle
                    enabled={permissions.executeTerminal}
                    onChange={() => setPermissions(p => ({ ...p, executeTerminal: !p.executeTerminal }))}
                    color="yellow"
                  />
                </div>
              </div>

              {/* External Requests */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                        External API requests
                        <span className="px-1.5 py-0.5 text-[10px] bg-orange-500/20 text-orange-400 rounded">
                          Advanced
                        </span>
                      </h4>
                      <p className="text-xs text-text-muted">
                        Make HTTP requests to external services
                      </p>
                    </div>
                  </div>
                  <Toggle
                    enabled={permissions.externalRequests}
                    onChange={() => setPermissions(p => ({ ...p, externalRequests: !p.externalRequests }))}
                    color="orange"
                  />
                </div>
              </div>

              {/* Proactivity Slider */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default mt-4">
                <h4 className="text-sm font-medium text-text-primary mb-3">
                  Proactivity Level
                </h4>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${proactivityLevel === 'low' ? 'text-text-primary' : 'text-text-muted'}`}>
                    Low
                  </span>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setProactivityLevel(level)}
                        className={`
                          w-8 h-8 rounded-full transition-all
                          ${proactivityLevel === level
                            ? 'bg-coder1-cyan scale-110'
                            : 'bg-bg-secondary hover:bg-bg-secondary/80'
                          }
                        `}
                      >
                        {proactivityLevel === level && (
                          <Check className="w-4 h-4 text-black mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  <span className={`text-xs ${proactivityLevel === 'high' ? 'text-text-primary' : 'text-text-muted'}`}>
                    High
                  </span>
                </div>
                <p className="text-xs text-text-muted text-center mt-2">
                  {proactivityLevel === 'low' && 'Always asks before taking action'}
                  {proactivityLevel === 'medium' && 'Balances autonomy with confirmation'}
                  {proactivityLevel === 'high' && 'Works independently, minimal interruptions'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            {/* Success Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-coder1-cyan/20 flex items-center justify-center border border-green-500/30">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Johnny5 is Ready!
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-8">
              You&apos;re all set. Here are some quick tips to get started.
            </p>

            {/* Quick Start Tips */}
            <div className="bg-bg-tertiary rounded-xl p-5 max-w-md mx-auto text-left mb-6">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Quick Start Tips</h4>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-coder1-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-coder1-cyan font-medium">1</span>
                  </div>
                  <span>Type a message to start chatting with Johnny5</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-coder1-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-coder1-cyan font-medium">2</span>
                  </div>
                  <span>Use <code className="px-1.5 py-0.5 bg-bg-secondary rounded text-xs">@file</code> to reference code files</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-coder1-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-coder1-cyan font-medium">3</span>
                  </div>
                  <span>Ask Johnny5 to review, explain, or improve your code</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-text-muted">
              You can change settings anytime from the Settings panel
            </p>
          </div>
        );
    }
  };

  // Check if can proceed to next step
  const canProceed = () => {
    if (currentStep === 'apikey') {
      return validationStatus === 'success';
    }
    return true;
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Progress Indicator */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              {/* Step Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                  ${index < currentStepIndex
                    ? 'bg-coder1-cyan text-black'
                    : index === currentStepIndex
                    ? 'bg-coder1-cyan/20 text-coder1-cyan border-2 border-coder1-cyan'
                    : 'bg-bg-tertiary text-text-muted border border-border-default'
                  }
                `}
              >
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-all
                    ${index < currentStepIndex ? 'bg-coder1-cyan' : 'bg-bg-tertiary'}
                  `}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span className="w-8 text-center">Welcome</span>
          <span className="flex-1" />
          <span className="w-8 text-center">API Key</span>
          <span className="flex-1" />
          <span className="w-12 text-center">Permissions</span>
          <span className="flex-1" />
          <span className="w-8 text-center">Done</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6">
        {renderStepContent()}
      </div>

      {/* Footer Navigation */}
      <div className="p-6 border-t border-border-default flex items-center justify-between">
        {/* Left Button: Skip or Back */}
        {currentStep === 'welcome' ? (
          <button
            onClick={onSkip}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Skip
          </button>
        ) : currentStep !== 'complete' ? (
          <button
            onClick={goPrev}
            className="flex items-center gap-1 px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {/* Right Button: Next or Complete */}
        {currentStep === 'complete' ? (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-coder1-cyan hover:bg-coder1-cyan/90 text-black font-medium text-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Start Chatting
          </button>
        ) : currentStep === 'welcome' ? (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-coder1-cyan hover:bg-coder1-cyan/90 text-black font-medium text-sm transition-all"
          >
            Get Started
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canProceed() || isSaving}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-coder1-cyan hover:bg-coder1-cyan/90 text-black font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
