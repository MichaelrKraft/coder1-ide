/**
 * GitHubPushButton - Educational Git Integration for New Developers
 * 
 * Makes GitHub accessible for "vibe coders" intimidated by terminals.
 * Teaches Git concepts through friendly UI and educational tooltips.
 */

import React, { useState, useEffect } from 'react';
import './GitHubPushButton.css';

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

interface Education {
    title: string;
    message: string;
    emoji: string;
    points?: string[];
    celebration?: {
        title: string;
        message: string;
        nextSteps: string[];
    };
}

const GitHubPushButton: React.FC = () => {
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
    const [isPushing, setIsPushing] = useState(false);
    const [pushSteps, setPushSteps] = useState<PushStep[]>([]);
    const [showEducation, setShowEducation] = useState(true);
    const [lastPushTime, setLastPushTime] = useState<string | null>(null);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Check git status on component mount and periodically
    useEffect(() => {
        checkGitStatus();
        const interval = setInterval(checkGitStatus, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const checkGitStatus = async () => {
        try {
            const response = await fetch('/api/github/status');
            const data = await response.json();
            if (data.success) {
                setGitStatus(data);
            }
        } catch (error) {
            console.error('Error checking git status:', error);
        }
    };

    const handlePushToGitHub = async () => {
        if (!gitStatus?.hasChanges) {
            // Show educational message about no changes
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
                    educationalMode: showEducation,
                    commitMessage: `Update ${gitStatus.fileCount} file${gitStatus.fileCount > 1 ? 's' : ''}`
                }),
            });

            const data = await response.json();

            if (data.success) {
                setPushSteps(data.steps || []);
                setLastPushTime(new Date().toLocaleString());
                setShowConfetti(true);
                
                // Hide confetti after 3 seconds
                setTimeout(() => setShowConfetti(false), 3000);
                
                // Update git status to reflect changes
                checkGitStatus();
            } else {
                if (data.setupRequired) {
                    setShowSetupWizard(true);
                }
                // Handle errors with educational messages
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

    return (
        <div className="github-push-container">
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

            {/* Main Push Button */}
            <div className="push-button-section">
                <button
                    className={`github-push-button ${!gitStatus?.hasChanges ? 'no-changes' : ''} ${isPushing ? 'pushing' : ''}`}
                    onClick={handlePushToGitHub}
                    disabled={isPushing}
                >
                    <span className="button-emoji">{getButtonEmoji()}</span>
                    <span className="button-text">{getButtonText()}</span>
                    {isPushing && <div className="loading-spinner"></div>}
                </button>

                {/* Educational Toggle */}
                <div className="education-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={showEducation}
                            onChange={(e) => setShowEducation(e.target.checked)}
                        />
                        <span className="toggle-text">📚 Show explanations</span>
                    </label>
                </div>
            </div>

            {/* Git Status Display */}
            {gitStatus && (
                <div className="git-status-panel">
                    <div className="status-header">
                        <h3>
                            {gitStatus.education?.emoji} {gitStatus.education?.title}
                        </h3>
                        <p>{gitStatus.education?.message}</p>
                    </div>

                    {gitStatus.hasChanges && (
                        <div className="changed-files">
                            <h4>Modified Files:</h4>
                            <ul>
                                {gitStatus.files.slice(0, 5).map((file, index) => (
                                    <li key={index} className="file-item">
                                        <span className="file-emoji">{file.emoji}</span>
                                        <span className="file-name">{file.file}</span>
                                        <span className="file-status">
                                            {file.status.includes('M') ? 'Modified' : 
                                             file.status.includes('A') ? 'Added' : 'Changed'}
                                        </span>
                                    </li>
                                ))}
                                {gitStatus.files.length > 5 && (
                                    <li className="file-item-summary">
                                        <span className="more-files">
                                            📁 ... and {gitStatus.files.length - 5} more files
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Push Progress Steps */}
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
                                
                                {/* Educational Content */}
                                {showEducation && step.education && (
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
            {showConfetti && showEducation && (
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
                            <li>🌍 <strong>Access</strong>: Your code is available from any device</li>
                        </ul>
                    </div>

                    <div className="next-steps">
                        <h3>🎯 What's Next?</h3>
                        <ol>
                            <li>Visit your GitHub repository to see your code online</li>
                            <li>Share the repository link with friends or collaborators</li>
                            <li>Keep pushing regularly to maintain your backup</li>
                            <li>Explore GitHub's features like Issues and Pull Requests</li>
                        </ol>
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
    );
};

export default GitHubPushButton;