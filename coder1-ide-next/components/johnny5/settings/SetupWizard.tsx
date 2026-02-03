'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Shield,
  MessageSquare,
  FileText,
  Terminal,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  RefreshCw,
} from 'lucide-react';

interface SetupWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

type WizardStep = 'welcome' | 'bridge' | 'permissions' | 'complete';

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
 * 2. Bridge - Connect via Coder1 Bridge (uses Claude Code CLI)
 * 3. Permissions - Set permissions and proactivity
 * 4. Complete - Quick start tips
 */
export default function SetupWizard({
  onComplete,
  onSkip,
  className,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');

  // Bridge connection state
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeChecking, setBridgeChecking] = useState(false);
  const [bridgeError, setBridgeError] = useState('');

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

  const steps: WizardStep[] = ['welcome', 'bridge', 'permissions', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  // Check Bridge connection status
  const checkBridgeStatus = useCallback(async () => {
    setBridgeChecking(true);
    setBridgeError('');

    try {
      const response = await fetch('/api/bridge/status?userId=default');
      const data = await response.json();

      if (data.connected || (data.bridges && data.bridges.length > 0)) {
        setBridgeConnected(true);
        setBridgeError('');
      } else {
        setBridgeConnected(false);
        setBridgeError('');
      }
    } catch (error) {
      console.error('Failed to check bridge status:', error);
      setBridgeConnected(false);
      setBridgeError('Failed to check connection status');
    } finally {
      setBridgeChecking(false);
    }
  }, []);

  // Check bridge status when step changes to 'bridge'
  useEffect(() => {
    if (currentStep === 'bridge') {
      checkBridgeStatus();
    }
  }, [currentStep, checkBridgeStatus]);

  // Save configuration (no API key needed - using Bridge)
  const saveConfiguration = useCallback(async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/johnny5/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-config',
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
  }, [permissions, proactivityLevel]);

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

      case 'bridge':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-coder1-cyan/10 flex items-center justify-center">
                <Link2 className="w-7 h-7 text-coder1-cyan" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Connect via Bridge
              </h2>
              <p className="text-sm text-text-muted">
                Johnny5 uses Claude Code CLI through your local Bridge
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              {/* Connection Status */}
              <div className={`
                p-6 rounded-xl border-2 transition-all
                ${bridgeConnected
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-bg-tertiary border-border-default'
                }
              `}>
                <div className="flex items-center justify-center gap-3 mb-3">
                  {bridgeChecking ? (
                    <Loader2 className="w-6 h-6 text-coder1-cyan animate-spin" />
                  ) : bridgeConnected ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  )}
                  <span className={`text-lg font-semibold ${
                    bridgeConnected ? 'text-green-400' : 'text-text-primary'
                  }`}>
                    {bridgeChecking
                      ? 'Checking connection...'
                      : bridgeConnected
                      ? 'Bridge Connected!'
                      : 'Bridge Not Connected'
                    }
                  </span>
                </div>

                {bridgeConnected && (
                  <p className="text-sm text-green-400/80 text-center">
                    Ready to use Claude Code CLI
                  </p>
                )}

                {!bridgeConnected && !bridgeChecking && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-muted text-center">
                      Run this command in your terminal:
                    </p>
                    <div className="bg-bg-secondary rounded-lg p-3 font-mono text-sm text-coder1-cyan">
                      coder1-bridge start
                    </div>
                    <p className="text-xs text-text-muted text-center">
                      Then enter the pairing code shown in the IDE status bar
                    </p>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={checkBridgeStatus}
                disabled={bridgeChecking}
                className="w-full py-3 rounded-lg font-medium text-sm transition-all
                  flex items-center justify-center gap-2
                  bg-bg-tertiary hover:bg-bg-secondary text-text-primary
                  border border-border-default
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${bridgeChecking ? 'animate-spin' : ''}`} />
                {bridgeChecking ? 'Checking...' : 'Check Connection'}
              </button>

              {bridgeError && (
                <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {bridgeError}
                </p>
              )}

              {/* Help Link */}
              <p className="text-center text-sm text-text-muted">
                Need help?{' '}
                <a
                  href="https://docs.coder1.ai/bridge-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coder1-cyan hover:underline inline-flex items-center gap-1"
                >
                  View setup guide
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>

              {/* Pro/Max Plan Note */}
              <div className="bg-coder1-cyan/5 rounded-lg p-3 border border-coder1-cyan/20">
                <p className="text-xs text-text-muted text-center">
                  <span className="text-coder1-cyan font-medium">✨ Pro/Max Plans:</span>{' '}
                  Johnny5 uses your Claude Code plan - no extra API costs!
                </p>
              </div>
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
    if (currentStep === 'bridge') {
      return bridgeConnected;  // Can only proceed if Bridge is connected
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
          <span className="w-8 text-center">Bridge</span>
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
