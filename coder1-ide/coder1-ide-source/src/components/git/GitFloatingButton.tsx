/**
 * GitFloatingButton - Compact floating git status indicator
 * 
 * Shows current git status in a non-intrusive floating button.
 * Opens educational git modal when clicked.
 */

import React, { useState, useEffect } from 'react';
import './GitFloatingButton.css';

interface GitStatus {
    hasChanges: boolean;
    fileCount: number;
    files: Array<{
        status: string;
        file: string;
        emoji: string;
    }>;
}

interface GitFloatingButtonProps {
    onOpenModal: () => void;
    className?: string;
}

export const GitFloatingButton: React.FC<GitFloatingButtonProps> = ({
    onOpenModal,
    className = ''
}) => {
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Check git status on mount and periodically
    useEffect(() => {
        checkGitStatus();
        const interval = setInterval(checkGitStatus, 15000); // Check every 15 seconds
        return () => clearInterval(interval);
    }, []);

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
            // Set fallback status on error
            setGitStatus({
                hasChanges: false,
                fileCount: 0,
                files: []
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getButtonContent = () => {
        if (isLoading) {
            return {
                emoji: '⏳',
                text: 'Checking...',
                description: 'Checking git status'
            };
        }

        if (!gitStatus) {
            return {
                emoji: '❓',
                text: 'GitHub Push',
                description: 'Click to check git status'
            };
        }

        if (gitStatus.hasChanges) {
            return {
                emoji: '📤',
                text: 'GitHub Push',
                description: `You have ${gitStatus.fileCount} unsaved change${gitStatus.fileCount !== 1 ? 's' : ''}`
            };
        }

        return {
            emoji: '✅',
            text: 'GitHub Push',
            description: 'All changes are saved to GitHub'
        };
    };

    const buttonContent = getButtonContent();
    const hasChanges = gitStatus?.hasChanges || false;

    return (
        <button
            className={`git-floating-button ${hasChanges ? 'has-changes' : 'up-to-date'} ${className}`}
            onClick={onOpenModal}
            title={buttonContent.description}
            disabled={isLoading}
        >
            <div className="git-button-content">
                <span className="git-button-emoji">{buttonContent.emoji}</span>
                <span className="git-button-text">{buttonContent.text}</span>
            </div>
            
            {hasChanges && (
                <div className="git-pulse-indicator" />
            )}
        </button>
    );
};

export default GitFloatingButton;