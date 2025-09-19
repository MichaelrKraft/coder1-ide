/**
 * GitCLISetupWizard - Educational setup wizard for GitHub CLI
 * 
 * Guides users through installing and authenticating GitHub CLI
 * with friendly, educational content.
 */

import React, { useState, useEffect } from 'react';
import './GitCLISetupWizard.css';

interface SetupStep {
    id: string;
    title: string;
    description: string;
    command?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

interface GitCLISetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export const GitCLISetupWizard: React.FC<GitCLISetupWizardProps> = ({
    isOpen,
    onClose,
    onComplete
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [cliStatus, setCliStatus] = useState<any>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);

    // Check CLI status when wizard opens
    useEffect(() => {
        if (isOpen) {
            checkCLIStatus();
        }
    }, [isOpen]);

    const checkCLIStatus = async () => {
        try {
            setIsChecking(true);
            const response = await fetch('/api/github/cli/status');
            const data = await response.json();
            setCliStatus(data);

            // Generate setup steps based on status
            const steps: SetupStep[] = [];

            if (!data.installed) {
                steps.push({
                    id: 'install',
                    title: 'Install GitHub CLI',
                    description: 'First, let\'s install the GitHub CLI tool',
                    status: 'pending'
                });
            }

            if (!data.authenticated || !data.installed) {
                steps.push({
                    id: 'authenticate',
                    title: 'Connect Your GitHub Account',
                    description: 'Link your GitHub account to the CLI',
                    command: 'gh auth login',
                    status: 'pending'
                });
            }

            steps.push({
                id: 'verify',
                title: 'Verify Setup',
                description: 'Make sure everything is working',
                command: 'gh auth status',
                status: 'pending'
            });

            setSetupSteps(steps);

            // If already ready, complete immediately
            if (data.ready) {
                onComplete();
                onClose();
            }
        } catch (error) {
            console.error('Error checking CLI status:', error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleStepComplete = () => {
        const newSteps = [...setupSteps];
        newSteps[currentStep].status = 'completed';
        setSetupSteps(newSteps);

        if (currentStep < setupSteps.length - 1) {
            setCurrentStep(currentStep + 1);
            newSteps[currentStep + 1].status = 'in_progress';
        } else {
            // All steps complete
            onComplete();
        }
    };

    const handleSkip = () => {
        const newSteps = [...setupSteps];
        newSteps[currentStep].status = 'skipped';
        setSetupSteps(newSteps);
        onClose();
    };

    const renderInstallInstructions = () => {
        if (!cliStatus?.installInstructions) return null;

        return (
            <div className="install-instructions">
                <h3>{cliStatus.installInstructions.title}</h3>
                <div className="install-methods">
                    {cliStatus.installInstructions.methods.map((method: any, index: number) => (
                        <div key={index} className="install-method">
                            <h4>{method.name}</h4>
                            <p>{method.description}</p>
                            <div className="command-box">
                                <code>{method.command}</code>
                                <button
                                    className="copy-button"
                                    onClick={() => navigator.clipboard.writeText(method.command)}
                                    title="Copy command"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAuthInstructions = () => {
        if (!cliStatus?.authInstructions) return null;

        return (
            <div className="auth-instructions">
                <h3>{cliStatus.authInstructions.title}</h3>
                <div className="auth-steps">
                    {cliStatus.authInstructions.steps.map((step: any) => (
                        <div key={step.step} className="auth-step">
                            <div className="step-header">
                                <span className="step-number">{step.step}</span>
                                <h4>{step.title}</h4>
                            </div>
                            <p>{step.description}</p>
                            <div className="command-box">
                                <code>{step.command}</code>
                            </div>
                            {step.education && (
                                <div className="step-education">
                                    <span className="education-emoji">{step.education.emoji}</span>
                                    <p>{step.education.explanation}</p>
                                    <p className="education-analogy">
                                        <em>💡 {step.education.analogy}</em>
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="git-cli-setup-overlay" onClick={onClose}>
            <div className="git-cli-setup-wizard" onClick={(e) => e.stopPropagation()}>
                <div className="wizard-header">
                    <h2>🚀 GitHub CLI Setup Wizard</h2>
                    <button className="wizard-close" onClick={onClose}>×</button>
                </div>

                <div className="wizard-content">
                    {isChecking ? (
                        <div className="checking-status">
                            <div className="loading-spinner"></div>
                            <p>Checking GitHub CLI status...</p>
                        </div>
                    ) : (
                        <>
                            {/* Progress indicator */}
                            {setupSteps.length > 0 && (
                                <div className="setup-progress">
                                    {setupSteps.map((step, index) => (
                                        <div
                                            key={step.id}
                                            className={`progress-step ${step.status}`}
                                            onClick={() => index <= currentStep && setCurrentStep(index)}
                                        >
                                            <div className="progress-dot">
                                                {step.status === 'completed' ? '✓' : index + 1}
                                            </div>
                                            <span className="progress-label">{step.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Current step content */}
                            {setupSteps[currentStep] && (
                                <div className="current-step">
                                    <h3>{setupSteps[currentStep].title}</h3>
                                    <p>{setupSteps[currentStep].description}</p>

                                    {setupSteps[currentStep].id === 'install' && renderInstallInstructions()}
                                    {setupSteps[currentStep].id === 'authenticate' && renderAuthInstructions()}
                                    
                                    {setupSteps[currentStep].id === 'verify' && (
                                        <div className="verify-step">
                                            <p>Run this command to verify your setup:</p>
                                            <div className="command-box">
                                                <code>gh auth status</code>
                                                <button
                                                    className="copy-button"
                                                    onClick={() => navigator.clipboard.writeText('gh auth status')}
                                                >
                                                    📋
                                                </button>
                                            </div>
                                            <p className="verify-hint">
                                                You should see "✓ Logged in to github.com" if everything is working!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Educational content */}
                            <div className="wizard-education">
                                <h4>🎓 Why GitHub CLI?</h4>
                                <ul>
                                    <li>🔀 Create pull requests without leaving your terminal</li>
                                    <li>📋 Manage issues and projects from the command line</li>
                                    <li>⚡ Faster workflow with keyboard shortcuts</li>
                                    <li>🤖 Automate repetitive GitHub tasks</li>
                                    <li>📊 View repository stats and insights</li>
                                </ul>
                            </div>

                            {/* Action buttons */}
                            <div className="wizard-actions">
                                <button
                                    className="wizard-skip"
                                    onClick={handleSkip}
                                >
                                    Skip for now
                                </button>
                                <button
                                    className="wizard-check"
                                    onClick={checkCLIStatus}
                                >
                                    Re-check Status
                                </button>
                                <button
                                    className="wizard-next"
                                    onClick={handleStepComplete}
                                    disabled={setupSteps.length === 0}
                                >
                                    {currentStep === setupSteps.length - 1 ? 'Complete Setup' : 'Next Step'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GitCLISetupWizard;