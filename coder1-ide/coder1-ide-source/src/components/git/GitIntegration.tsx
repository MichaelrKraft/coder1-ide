/**
 * GitIntegration - Complete Git/GitHub Integration Component
 * 
 * Combines the floating status button with the educational modal.
 * Provides a complete, non-intrusive Git workflow for the IDE.
 */

import React, { useState, useEffect } from 'react';
import GitFloatingButton from './GitFloatingButton';
import GitModal from './GitModal';

interface GitIntegrationProps {
    enabled?: boolean;
    className?: string;
}

export const GitIntegration: React.FC<GitIntegrationProps> = ({
    enabled = true,
    className = ''
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [educationLevel, setEducationLevel] = useState<'beginner' | 'experienced'>('beginner');

    // Load user preferences
    useEffect(() => {
        const savedLevel = localStorage.getItem('git-education-level');
        if (savedLevel === 'experienced' || savedLevel === 'beginner') {
            setEducationLevel(savedLevel);
        }
    }, []);

    // Save user preferences
    const handleEducationLevelChange = (level: 'beginner' | 'experienced') => {
        setEducationLevel(level);
        localStorage.setItem('git-education-level', level);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd + Shift + G to open Git modal
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'G') {
                event.preventDefault();
                setIsModalOpen(true);
            }
            
            // Escape to close modal
            if (event.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };

        if (enabled) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [enabled, isModalOpen]);

    if (!enabled) {
        return null;
    }

    return (
        <div className={`git-integration ${className}`}>
            <GitFloatingButton
                onOpenModal={() => setIsModalOpen(true)}
            />
            
            <GitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                educationLevel={educationLevel}
                onEducationLevelChange={handleEducationLevelChange}
            />
        </div>
    );
};

export default GitIntegration;