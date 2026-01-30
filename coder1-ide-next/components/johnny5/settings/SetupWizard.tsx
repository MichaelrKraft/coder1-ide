'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Github,
  Mail,
  MessageSquare,
  HardDrive,
  FileText,
  LayoutGrid,
  Check,
  ChevronRight,
  ChevronLeft,
  Zap,
  Shield,
  Brain,
  Rocket,
  PartyPopper,
} from 'lucide-react';

interface SetupWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

type WizardStep = 'welcome' | 'integrations' | 'permissions' | 'behavior' | 'complete';

interface IntegrationOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  recommended?: boolean;
}

/**
 * SetupWizard Component
 *
 * First-time setup flow for Johnny5 with multi-step wizard.
 * Guides users through connecting integrations, setting permissions,
 * and configuring AI behavior.
 */
export default function SetupWizard({
  onComplete,
  onSkip,
  className,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [selectedIntegrations, setSelectedIntegrations] = useState<Set<string>>(new Set(['github']));
  const [proactivityLevel, setProactivityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [permissions, setPermissions] = useState({
    fileWrite: true,
    terminalExec: true,
    autoActions: false,
    externalRequests: false,
  });

  const steps: WizardStep[] = ['welcome', 'integrations', 'permissions', 'behavior', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  // Integration options
  const integrations: IntegrationOption[] = [
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className="w-6 h-6" />,
      description: 'Create PRs, manage issues, access repos',
      recommended: true,
    },
    {
      id: 'gmail',
      name: 'Gmail',
      icon: <Mail className="w-6 h-6" />,
      description: 'Read and send emails automatically',
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: <MessageSquare className="w-6 h-6" />,
      description: 'Send messages and notifications',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      icon: <HardDrive className="w-6 h-6" />,
      description: 'Access and organize files',
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: <FileText className="w-6 h-6" />,
      description: 'Manage workspaces and pages',
    },
    {
      id: 'linear',
      name: 'Linear',
      icon: <LayoutGrid className="w-6 h-6" />,
      description: 'Track issues and projects',
    },
  ];

  // Toggle integration selection
  const toggleIntegration = (id: string) => {
    const newSelected = new Set(selectedIntegrations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIntegrations(newSelected);
  };

  // Navigate steps
  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            {/* Johnny5 Logo/Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-coder1-cyan/20 to-purple-500/20 flex items-center justify-center border border-coder1-cyan/30">
              <Sparkles className="w-12 h-12 text-coder1-cyan" />
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Welcome to Johnny5
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              Your AI employee that works while you sleep. Let&apos;s set up Johnny5 to understand
              your preferences and connect your tools.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <Zap className="w-6 h-6 text-coder1-cyan mx-auto mb-2" />
                <p className="text-xs text-text-muted">Autonomous Work</p>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <Shield className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-text-muted">Full Transparency</p>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <Brain className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-text-muted">Self-Improving</p>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              This will only take a few minutes
            </p>
          </div>
        );

      case 'integrations':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Connect Your Tools
              </h2>
              <p className="text-sm text-text-muted">
                Select the services you want Johnny5 to access
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => toggleIntegration(integration.id)}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-left relative
                    ${selectedIntegrations.has(integration.id)
                      ? 'bg-coder1-cyan/10 border-coder1-cyan'
                      : 'bg-bg-tertiary border-border-default hover:border-coder1-cyan/50'
                    }
                  `}
                >
                  {/* Recommended badge */}
                  {integration.recommended && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-medium bg-coder1-cyan text-black rounded-full">
                      Recommended
                    </span>
                  )}

                  {/* Checkmark */}
                  {selectedIntegrations.has(integration.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-coder1-cyan flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}

                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center mb-2
                      ${selectedIntegrations.has(integration.id)
                        ? 'bg-coder1-cyan/20 text-coder1-cyan'
                        : 'bg-bg-secondary text-text-muted'
                      }
                    `}
                  >
                    {integration.icon}
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary">
                    {integration.name}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {integration.description}
                  </p>
                </button>
              ))}
            </div>

            <p className="text-xs text-text-muted text-center mt-4">
              You can always add or remove integrations later
            </p>
          </div>
        );

      case 'permissions':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Set Boundaries
              </h2>
              <p className="text-sm text-text-muted">
                Control what Johnny5 can do on your behalf
              </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              {/* File Write Permission */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      Write Files
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Create and modify files in your project
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPermissions({ ...permissions, fileWrite: !permissions.fileWrite })
                    }
                    className={`
                      relative w-12 h-6 rounded-full transition-all
                      ${permissions.fileWrite ? 'bg-coder1-cyan' : 'bg-bg-secondary'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
                        ${permissions.fileWrite ? 'left-[26px]' : 'left-0.5'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Terminal Permission */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      Run Terminal Commands
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Execute commands in the terminal
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPermissions({ ...permissions, terminalExec: !permissions.terminalExec })
                    }
                    className={`
                      relative w-12 h-6 rounded-full transition-all
                      ${permissions.terminalExec ? 'bg-coder1-cyan' : 'bg-bg-secondary'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
                        ${permissions.terminalExec ? 'left-[26px]' : 'left-0.5'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Auto Actions Permission */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      Auto-Execute Actions
                      <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
                        Advanced
                      </span>
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Take actions without asking first
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPermissions({ ...permissions, autoActions: !permissions.autoActions })
                    }
                    className={`
                      relative w-12 h-6 rounded-full transition-all
                      ${permissions.autoActions ? 'bg-yellow-500' : 'bg-bg-secondary'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
                        ${permissions.autoActions ? 'left-[26px]' : 'left-0.5'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* External Requests Permission */}
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      External Requests
                      <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">
                        High Risk
                      </span>
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Make HTTP requests to external services
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPermissions({
                        ...permissions,
                        externalRequests: !permissions.externalRequests,
                      })
                    }
                    className={`
                      relative w-12 h-6 rounded-full transition-all
                      ${permissions.externalRequests ? 'bg-red-500' : 'bg-bg-secondary'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
                        ${permissions.externalRequests ? 'left-[26px]' : 'left-0.5'}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'behavior':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Proactivity Level
              </h2>
              <p className="text-sm text-text-muted">
                How much should Johnny5 do on its own?
              </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              {/* Low */}
              <button
                onClick={() => setProactivityLevel('low')}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${proactivityLevel === 'low'
                    ? 'bg-green-500/10 border-green-500'
                    : 'bg-bg-tertiary border-border-default hover:border-green-500/50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${proactivityLevel === 'low' ? 'bg-green-500/20' : 'bg-bg-secondary'}
                    `}
                  >
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      Conservative
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Always ask before taking action. Ideal for learning how Johnny5 works.
                    </p>
                  </div>
                  {proactivityLevel === 'low' && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
              </button>

              {/* Medium */}
              <button
                onClick={() => setProactivityLevel('medium')}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${proactivityLevel === 'medium'
                    ? 'bg-coder1-cyan/10 border-coder1-cyan'
                    : 'bg-bg-tertiary border-border-default hover:border-coder1-cyan/50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${proactivityLevel === 'medium' ? 'bg-coder1-cyan/20' : 'bg-bg-secondary'}
                    `}
                  >
                    <Zap className="w-5 h-5 text-coder1-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      Balanced
                      <span className="px-1.5 py-0.5 text-[10px] bg-coder1-cyan/20 text-coder1-cyan rounded">
                        Recommended
                      </span>
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Ask for important decisions, handle routine tasks automatically.
                    </p>
                  </div>
                  {proactivityLevel === 'medium' && (
                    <div className="w-5 h-5 rounded-full bg-coder1-cyan flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
              </button>

              {/* High */}
              <button
                onClick={() => setProactivityLevel('high')}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${proactivityLevel === 'high'
                    ? 'bg-purple-500/10 border-purple-500'
                    : 'bg-bg-tertiary border-border-default hover:border-purple-500/50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${proactivityLevel === 'high' ? 'bg-purple-500/20' : 'bg-bg-secondary'}
                    `}
                  >
                    <Rocket className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      Autonomous
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Work independently, only interrupt for critical decisions.
                    </p>
                  </div>
                  {proactivityLevel === 'high' && (
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            {/* Success Animation */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-coder1-cyan/20 flex items-center justify-center border border-green-500/30 animate-pulse">
              <PartyPopper className="w-12 h-12 text-green-400" />
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-3">
              You&apos;re All Set!
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              Johnny5 is ready to help. Start your first task or explore the dashboard.
            </p>

            {/* Summary */}
            <div className="bg-bg-tertiary rounded-xl p-4 max-w-md mx-auto text-left mb-6">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Setup Summary</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Integrations</span>
                  <span className="text-coder1-cyan">{selectedIntegrations.size} connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Proactivity</span>
                  <span className="text-coder1-cyan capitalize">{proactivityLevel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">File Write</span>
                  <span className={permissions.fileWrite ? 'text-green-400' : 'text-red-400'}>
                    {permissions.fileWrite ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Terminal</span>
                  <span className={permissions.terminalExec ? 'text-green-400' : 'text-red-400'}>
                    {permissions.terminalExec ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              You can change these settings anytime from the Settings panel
            </p>
          </div>
        );
    }
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
          <span>Welcome</span>
          <span>Integrations</span>
          <span>Permissions</span>
          <span>Behavior</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6">
        {renderStepContent()}
      </div>

      {/* Footer Navigation */}
      <div className="p-6 border-t border-border-default flex items-center justify-between">
        {/* Skip/Back Button */}
        {currentStep === 'welcome' ? (
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Skip Setup
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

        {/* Next/Complete Button */}
        {currentStep === 'complete' ? (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-coder1-cyan hover:bg-coder1-cyan/90 text-black font-medium text-sm transition-all"
          >
            <Rocket className="w-4 h-4" />
            Start Using Johnny5
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-coder1-cyan hover:bg-coder1-cyan/90 text-black font-medium text-sm transition-all"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
