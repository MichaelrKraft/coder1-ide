/**
 * GitModal - Educational Git Integration Modal
 * 
 * Provides a friendly, educational interface for Git operations.
 * Teaches Git concepts through step-by-step guidance and analogies.
 */

import React, { useState, useEffect } from 'react';
import './GitModal.css';
import GitCLISetupWizard from './GitCLISetupWizard';
import GitAdvancedFeatures from './GitAdvancedFeatures';

interface GitFile {
    status: string;
    file: string;
    emoji: string;
}

interface GitStatus {
    hasChanges: boolean;
    fileCount: number;
    files: GitFile[];
    education?: {
        title: string;
        message: string;
        emoji: string;
    };
}

interface PushStep {
    step: number;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    description: string;
    education?: {
        emoji: string;
        title: string;
        explanation: string;
        analogy: string;
    };
}

interface GitModalProps {
    isOpen: boolean;
    onClose: () => void;
    educationLevel: 'beginner' | 'experienced';
    onEducationLevelChange: (level: 'beginner' | 'experienced') => void;
}

export const GitModal: React.FC<GitModalProps> = ({
    isOpen,
    onClose,
    educationLevel,
    onEducationLevelChange
}) => {
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
    const [isPushing, setIsPushing] = useState(false);
    const [pushSteps, setPushSteps] = useState<PushStep[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [lastPushTime, setLastPushTime] = useState<string | null>(null);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
    const [cliStatus, setCliStatus] = useState<any>(null);
    const [showCLIFeatures, setShowCLIFeatures] = useState(false);

    // Load git status when modal opens
    useEffect(() => {
        if (isOpen) {
            checkGitStatus();
            checkCLIStatus();
        }
    }, [isOpen]);

    const checkCLIStatus = async () => {
        try {
            const response = await fetch('/api/github/cli/status');
            const data = await response.json();
            if (data.success) {
                setCliStatus(data);
                // Enable CLI features if available and feature flag is on
                const featureEnabled = localStorage.getItem('github-cli-enabled') === 'true';
                setShowCLIFeatures(data.ready || featureEnabled); // Show tab if either CLI is ready OR feature is explicitly enabled
            }
        } catch (error) {
            console.error('Error checking CLI status:', error);
        }
    };

    const checkGitStatus = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/github/status');
            const data = await response.json();
            if (data.success) {
                setGitStatus(data);
            }
        } catch (error) {
            console.error('Error checking git status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePushToGitHub = async () => {
        if (!gitStatus?.hasChanges) {
            setGitStatus(prev => prev ? {
                ...prev,
                education: {
                    title: 'No Changes to Save',
                    message: 'Make some changes to your code first, then come back to push!',
                    emoji: '💡'
                }
            } : null);
            return;
        }

        setIsPushing(true);
        setPushSteps([]);
        setShowConfetti(false);

        try {
            const response = await fetch('/api/github/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    educationalMode: educationLevel === 'beginner',
                    commitMessage: `Update ${gitStatus.fileCount} file${gitStatus.fileCount > 1 ? 's' : ''}`
                }),
            });

            const data = await response.json();

            if (data.success) {
                setPushSteps(data.steps || []);
                setLastPushTime(new Date().toLocaleString());
                setShowConfetti(true);
                
                setTimeout(() => setShowConfetti(false), 3000);
                checkGitStatus();
            } else {
                if (data.setupRequired) {
                    setShowSetupWizard(true);
                }
                console.error('Push failed:', data.error);
            }
        } catch (error) {
            console.error('Error pushing to GitHub:', error);
        } finally {
            setIsPushing(false);
        }
    };

    const getButtonText = () => {
        if (isPushing) return 'Pushing to GitHub...';
        if (!gitStatus?.hasChanges) return 'No Changes to Push';
        return `Push ${gitStatus.fileCount} Change${gitStatus.fileCount > 1 ? 's' : ''} to GitHub`;
    };

    const getButtonEmoji = () => {
        if (isPushing) return '🚀';
        if (!gitStatus?.hasChanges) return '✅';
        return '📤';
    };

    const renderFileList = () => {
        if (!gitStatus?.files.length) return null;

        const maxVisible = 5;
        const visibleFiles = gitStatus.files.slice(0, maxVisible);
        const remainingCount = gitStatus.files.length - maxVisible;

        return (
            <div className="git-file-list">
                <h4>Modified Files:</h4>
                <ul className="file-list">
                    {visibleFiles.map((file, index) => (
                        <li key={index} className="git-file-item">
                            <span className="file-emoji">{file.emoji}</span>
                            <span className="file-name">{file.file}</span>
                            <span className="file-status">
                                {file.status.includes('M') ? 'Modified' : 
                                 file.status.includes('A') ? 'Added' : 'Changed'}
                            </span>
                        </li>
                    ))}
                    {remainingCount > 0 && (
                        <li className="git-file-item-summary">
                            <span className="more-files">
                                📁 ... and {remainingCount} more file{remainingCount !== 1 ? 's' : ''}
                            </span>
                        </li>
                    )}
                </ul>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="git-modal-overlay" onClick={onClose}>
            <div className="git-modal" onClick={(e) => e.stopPropagation()}>
                {/* Confetti Effect */}
                {showConfetti && (
                    <div className="confetti-container">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="confetti-piece"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'][i % 5]
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Modal Header */}
                <div className="git-modal-header">
                    <div className="modal-title">
                        <span className="git-icon">📁</span>
                        <h2>Git & GitHub</h2>
                    </div>
                    {/* Tab Navigation */}
                    {showCLIFeatures && (
                        <div className="git-modal-tabs">
                            <button
                                className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                                onClick={() => setActiveTab('basic')}
                            >
                                📤 Basic Push
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
                                onClick={() => setActiveTab('advanced')}
                            >
                                🚀 Advanced (PRs & Issues)
                            </button>
                        </div>
                    )}
                    <div className="modal-controls">
                        <select
                            value={educationLevel}
                            onChange={(e) => onEducationLevelChange(e.target.value as 'beginner' | 'experienced')}
                            className="education-level-select"
                        >
                            <option value="beginner">📚 Beginner (with explanations)</option>
                            <option value="experienced">⚡ Experienced (quick mode)</option>
                        </select>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="git-modal-content">
                    {activeTab === 'basic' ? (
                        // Basic push content
                        isLoading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Checking your project status...</p>
                        </div>
                    ) : (
                        <>
                            {/* Current Status */}
                            {gitStatus && (
                                <div className="git-status-section">
                                    <div className="status-header">
                                        <h3>
                                            {gitStatus.education?.emoji} {gitStatus.education?.title}
                                        </h3>
                                        <p>{gitStatus.education?.message}</p>
                                    </div>

                                    {gitStatus.hasChanges && renderFileList()}
                                </div>
                            )}

                            {/* Main Action Button */}
                            <div className="git-action-section">
                                <button
                                    className={`git-push-button ${!gitStatus?.hasChanges ? 'no-changes' : ''} ${isPushing ? 'pushing' : ''}`}
                                    onClick={handlePushToGitHub}
                                    disabled={isPushing}
                                >
                                    <span className="button-emoji">{getButtonEmoji()}</span>
                                    <span className="button-text">{getButtonText()}</span>
                                    {isPushing && <div className="loading-spinner"></div>}
                                </button>
                            </div>

                            {/* Push Progress */}
                            {pushSteps.length > 0 && (
                                <div className="push-progress">
                                    <h3>🚀 Pushing to GitHub</h3>
                                    <div className="steps-container">
                                        {pushSteps.map((step, index) => (
                                            <div key={index} className={`step step-${step.status}`}>
                                                <div className="step-header">
                                                    <span className="step-number">{step.step}</span>
                                                    <span className="step-title">{step.title}</span>
                                                    <span className="step-status-icon">
                                                        {step.status === 'completed' ? '✅' : 
                                                         step.status === 'in_progress' ? '⏳' : 
                                                         step.status === 'error' ? '❌' : '⭕'}
                                                    </span>
                                                </div>
                                                <p className="step-description">{step.description}</p>
                                                
                                                {educationLevel === 'beginner' && step.education && (
                                                    <div className="step-education">
                                                        <div className="education-header">
                                                            <span className="education-emoji">{step.education.emoji}</span>
                                                            <h4>{step.education.title}</h4>
                                                        </div>
                                                        <p className="education-explanation">{step.education.explanation}</p>
                                                        <p className="education-analogy">
                                                            <em>💡 {step.education.analogy}</em>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Success Education */}
                            {showConfetti && educationLevel === 'beginner' && (
                                <div className="success-education">
                                    <div className="celebration">
                                        <h2>🎊 Congratulations!</h2>
                                        <p>Your code is now safely stored on GitHub!</p>
                                    </div>
                                    
                                    <div className="benefits-section">
                                        <h3>✨ Why This is Awesome:</h3>
                                        <ul>
                                            <li>🛡️ <strong>Backup</strong>: Never lose your code again</li>
                                            <li>🤝 <strong>Collaboration</strong>: Others can see and help with your work</li>
                                            <li>💼 <strong>Portfolio</strong>: Show employers your coding skills</li>
                                            <li>📊 <strong>History</strong>: Track how your code evolves over time</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Last Push Info */}
                            {lastPushTime && (
                                <div className="last-push-info">
                                    <p>
                                        <span className="last-push-emoji">📅</span>
                                        Last pushed: {lastPushTime}
                                    </p>
                                </div>
                            )}
                        </>
                    )) : (
                        // Advanced tab content
                        <GitAdvancedFeatures
                            educationLevel={educationLevel}
                            cliStatus={cliStatus}
                            onSetupClick={() => setShowSetupWizard(true)}
                        />
                    )}
                </div>

                {/* GitHub CLI Setup Wizard */}
                <GitCLISetupWizard
                    isOpen={showSetupWizard}
                    onClose={() => setShowSetupWizard(false)}
                    onComplete={() => {
                        setShowSetupWizard(false);
                        checkCLIStatus();
                    }}
                />

                {/* Setup Wizard Modal */}
                {showSetupWizard && (
                    <div className="setup-wizard-overlay">
                        <div className="setup-wizard">
                            <h2>🔧 First Time Setup</h2>
                            <p>Let's get you connected to GitHub!</p>
                            <div className="setup-steps">
                                <h3>Quick Setup Steps:</h3>
                                <ol>
                                    <li>Create a repository on GitHub.com</li>
                                    <li>Copy the repository URL</li>
                                    <li>Configure Git with your details</li>
                                </ol>
                            </div>
                            <div className="setup-actions">
                                <button 
                                    className="setup-close-button"
                                    onClick={() => setShowSetupWizard(false)}
                                >
                                    I'll Set This Up Later
                                </button>
                                <a 
                                    href="https://github.com/new" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="setup-github-button"
                                >
                                    Create GitHub Repository 🚀
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GitModal;