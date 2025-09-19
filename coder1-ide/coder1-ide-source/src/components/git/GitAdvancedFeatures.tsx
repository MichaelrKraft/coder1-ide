/**
 * GitAdvancedFeatures - Advanced GitHub features using CLI
 * 
 * Provides PR creation, issue management, and workflow automation
 * with educational content and fallback mechanisms.
 */

import React, { useState } from 'react';
import './GitAdvancedFeatures.css';

interface GitAdvancedFeaturesProps {
    educationLevel: 'beginner' | 'experienced';
    cliStatus: any;
    onSetupClick: () => void;
}

export const GitAdvancedFeatures: React.FC<GitAdvancedFeaturesProps> = ({
    educationLevel,
    cliStatus,
    onSetupClick
}) => {
    const [activeFeature, setActiveFeature] = useState<'pr' | 'issue' | 'workflow'>('pr');
    const [prTitle, setPrTitle] = useState('');
    const [prBody, setPrBody] = useState('');
    const [issueTitle, setIssueTitle] = useState('');
    const [issueBody, setIssueBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleCreatePR = async () => {
        if (!prTitle) {
            alert('Please enter a PR title');
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const response = await fetch('/api/github/cli/pr/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: prTitle,
                    body: prBody,
                    educationalMode: educationLevel === 'beginner'
                }),
            });

            const data = await response.json();
            setResult(data);

            if (data.success) {
                setPrTitle('');
                setPrBody('');
            }
        } catch (error) {
            console.error('Error creating PR:', error);
            setResult({
                success: false,
                error: {
                    title: 'Failed to create PR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateIssue = async () => {
        if (!issueTitle) {
            alert('Please enter an issue title');
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const response = await fetch('/api/github/cli/issue/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: issueTitle,
                    body: issueBody,
                    educationalMode: educationLevel === 'beginner'
                }),
            });

            const data = await response.json();
            setResult(data);

            if (data.success) {
                setIssueTitle('');
                setIssueBody('');
            }
        } catch (error) {
            console.error('Error creating issue:', error);
            setResult({
                success: false,
                error: {
                    title: 'Failed to create issue',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // If CLI not ready, show setup prompt
    if (!cliStatus?.ready) {
        return (
            <div className="cli-not-ready">
                <div className="cli-status-card">
                    <h3>🔧 GitHub CLI Setup Required</h3>
                    <p>To use advanced features like creating PRs and issues, you need to set up GitHub CLI.</p>
                    
                    <div className="cli-status-details">
                        <div className="status-item">
                            <span className="status-label">Installed:</span>
                            <span className={`status-value ${cliStatus?.installed ? 'success' : 'error'}`}>
                                {cliStatus?.installed ? '✅ Yes' : '❌ No'}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Authenticated:</span>
                            <span className={`status-value ${cliStatus?.authenticated ? 'success' : 'error'}`}>
                                {cliStatus?.authenticated ? '✅ Yes' : '❌ No'}
                            </span>
                        </div>
                    </div>

                    <button className="setup-button" onClick={onSetupClick}>
                        🚀 Start Setup Wizard
                    </button>

                    <div className="cli-benefits">
                        <h4>Benefits of GitHub CLI:</h4>
                        <ul>
                            <li>🔀 Create pull requests without leaving your IDE</li>
                            <li>📋 Manage issues directly from the terminal</li>
                            <li>⚡ Faster workflow with fewer context switches</li>
                            <li>🤖 Automate repetitive GitHub tasks</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="git-advanced-features">
            {/* Feature Navigation */}
            <div className="feature-nav">
                <button
                    className={`feature-nav-button ${activeFeature === 'pr' ? 'active' : ''}`}
                    onClick={() => setActiveFeature('pr')}
                >
                    🔀 Pull Request
                </button>
                <button
                    className={`feature-nav-button ${activeFeature === 'issue' ? 'active' : ''}`}
                    onClick={() => setActiveFeature('issue')}
                >
                    📋 Issue
                </button>
                <button
                    className={`feature-nav-button ${activeFeature === 'workflow' ? 'active' : ''}`}
                    onClick={() => setActiveFeature('workflow')}
                >
                    ⚙️ Workflows
                </button>
            </div>

            {/* Result Display */}
            {result && (
                <div className={`result-card ${result.success ? 'success' : 'error'}`}>
                    {result.success ? (
                        <>
                            <h4>✅ {result.message}</h4>
                            {result.prUrl && (
                                <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="result-link">
                                    🔗 View Pull Request
                                </a>
                            )}
                            {result.issueUrl && (
                                <a href={result.issueUrl} target="_blank" rel="noopener noreferrer" className="result-link">
                                    🔗 View Issue
                                </a>
                            )}
                            {result.education && educationLevel === 'beginner' && (
                                <div className="result-education">
                                    <h5>{result.education.emoji} {result.education.title}</h5>
                                    <p>{result.education.explanation}</p>
                                    {result.education.nextSteps && (
                                        <div className="next-steps">
                                            <h6>Next Steps:</h6>
                                            <ul>
                                                {result.education.nextSteps.map((step: string, index: number) => (
                                                    <li key={index}>{step}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h4>❌ {result.error?.title || 'Error'}</h4>
                            <p>{result.error?.message}</p>
                            {result.error?.solution && (
                                <p className="error-solution">💡 {result.error.solution}</p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Pull Request Creation */}
            {activeFeature === 'pr' && (
                <div className="feature-content">
                    <h3>🔀 Create a Pull Request</h3>
                    
                    {educationLevel === 'beginner' && (
                        <div className="feature-education">
                            <p>
                                A Pull Request (PR) is a proposal to merge your changes into the main codebase.
                                It's like submitting a draft for review before it becomes final.
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="pr-title">PR Title *</label>
                        <input
                            id="pr-title"
                            type="text"
                            value={prTitle}
                            onChange={(e) => setPrTitle(e.target.value)}
                            placeholder="Add new feature for user authentication"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="pr-body">Description (optional)</label>
                        <textarea
                            id="pr-body"
                            value={prBody}
                            onChange={(e) => setPrBody(e.target.value)}
                            placeholder="## What does this PR do?\n\n## How to test\n\n## Screenshots (if applicable)"
                            rows={6}
                            disabled={isSubmitting}
                        />
                    </div>

                    <button
                        className="submit-button"
                        onClick={handleCreatePR}
                        disabled={isSubmitting || !prTitle}
                    >
                        {isSubmitting ? '⏳ Creating PR...' : '🔀 Create Pull Request'}
                    </button>
                </div>
            )}

            {/* Issue Creation */}
            {activeFeature === 'issue' && (
                <div className="feature-content">
                    <h3>📋 Create an Issue</h3>
                    
                    {educationLevel === 'beginner' && (
                        <div className="feature-education">
                            <p>
                                An issue is a way to track bugs, feature requests, or tasks.
                                It's like a to-do item for your project that everyone can see and discuss.
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="issue-title">Issue Title *</label>
                        <input
                            id="issue-title"
                            type="text"
                            value={issueTitle}
                            onChange={(e) => setIssueTitle(e.target.value)}
                            placeholder="Bug: Login button not working on mobile"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="issue-body">Description (optional)</label>
                        <textarea
                            id="issue-body"
                            value={issueBody}
                            onChange={(e) => setIssueBody(e.target.value)}
                            placeholder="## Description\n\n## Steps to reproduce\n\n## Expected behavior\n\n## Environment"
                            rows={6}
                            disabled={isSubmitting}
                        />
                    </div>

                    <button
                        className="submit-button"
                        onClick={handleCreateIssue}
                        disabled={isSubmitting || !issueTitle}
                    >
                        {isSubmitting ? '⏳ Creating Issue...' : '📋 Create Issue'}
                    </button>
                </div>
            )}

            {/* Workflows */}
            {activeFeature === 'workflow' && (
                <div className="feature-content">
                    <h3>⚙️ GitHub Actions & Workflows</h3>
                    
                    <div className="feature-education">
                        <p>
                            GitHub Actions automate tasks like testing code, building applications, or deploying to servers.
                            {educationLevel === 'beginner' && ' It\'s like having a robot assistant that checks your work automatically!'}
                        </p>
                    </div>

                    <div className="workflows-info">
                        <p className="coming-soon">
                            🚧 Workflow management coming soon!
                        </p>
                        <p>
                            In the meantime, you can view your workflows on GitHub or use the GitHub CLI:
                        </p>
                        <div className="command-example">
                            <code>gh workflow list</code>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GitAdvancedFeatures;