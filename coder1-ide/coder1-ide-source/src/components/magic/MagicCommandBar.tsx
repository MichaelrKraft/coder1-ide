import React, { useState, useEffect, useRef } from 'react';
import './MagicCommandBar.css';

interface MagicProgress {
  status: 'idle' | 'generating' | 'complete' | 'error';
  message?: string;
  component?: any;
}

interface MagicSuggestion {
  id: string;
  text: string;
  icon: string;
}

interface MagicCommandBarProps {
  onGenerate: (prompt: string, onProgress?: (progress: MagicProgress) => void) => Promise<any>;
  onClose: () => void;
  isVisible: boolean;
  onShowContextInsights?: () => void;
  onShowPageBuilder?: () => void;
  onShowComponentLibrary?: () => void;
  onShowIntegrations?: () => void;
  onShowAgentsWizard?: () => void; // New AGENTS.md wizard
  currentFilePath?: string; // For AGENTS.md context
}

const MagicCommandBar: React.FC<MagicCommandBarProps> = ({ 
  onGenerate, 
  onClose, 
  isVisible,
  onShowContextInsights,
  onShowPageBuilder,
  onShowComponentLibrary,
  onShowIntegrations,
  onShowAgentsWizard,
  currentFilePath = '/'
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<MagicSuggestion[]>([]);
  const [progress, setProgress] = useState<MagicProgress>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when component becomes visible
  useEffect(() => {
    console.log('🎨 MagicCommandBar isVisible:', isVisible);
    if (isVisible && inputRef.current) {
      console.log('🎨 Focusing input...');
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Generate suggestions as user types
  useEffect(() => {
    if (prompt.length > 2) {
      const newSuggestions = generateSuggestions(prompt);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [prompt]);

  const generateSuggestions = (input: string): MagicSuggestion[] => {
    const keywords = input.toLowerCase();
    
    // AGENTS.md-specific suggestions
    const agentsSuggestions = [
      { id: 'agents1', text: 'create agents.md file', icon: '🤖' },
      { id: 'agents2', text: 'ai agent documentation', icon: '📚' },
      { id: 'agents3', text: 'project context for claude', icon: '🧠' },
      { id: 'agents4', text: 'build commands reference', icon: '⚡' }
    ];

    // Regular component suggestions
    const componentSuggestions = [
      { id: '1', text: 'gradient button with hover effects', icon: '🔘' },
      { id: '2', text: 'pricing card like Stripe', icon: '💳' },
      { id: '3', text: 'login form with social buttons', icon: '🔐' },
      { id: '4', text: 'hero section with glassmorphism', icon: '✨' },
      { id: '5', text: 'navigation bar with dropdown', icon: '📱' },
      { id: '6', text: 'testimonial card with avatar', icon: '💬' },
      { id: '7', text: 'feature grid with icons', icon: '📊' },
      { id: '8', text: 'contact form with validation', icon: '📧' },
      { id: '9', text: 'dashboard sidebar', icon: '📋' },
      { id: '10', text: 'modal dialog with overlay', icon: '🪟' }
    ];

    // Check if input is related to AGENTS.md
    const agentsKeywords = ['agent', 'ai', 'claude', 'context', 'documentation', 'build', 'commands', 'project'];
    const isAgentsRelated = agentsKeywords.some(keyword => keywords.includes(keyword));

    let allSuggestions = componentSuggestions;
    
    if (isAgentsRelated || keywords.includes('agents')) {
      // Prioritize AGENTS.md suggestions
      allSuggestions = [...agentsSuggestions, ...componentSuggestions];
    }

    return allSuggestions
      .filter(s => s.text.includes(keywords) || keywords.includes(s.text.split(' ')[0]))
      .slice(0, 5);
  };

  const handleSubmit = async (promptText: string) => {
    if (!promptText.trim() || isGenerating) return;

    // Handle AGENTS.md specific commands
    if (promptText.toLowerCase().includes('agents.md') || promptText.toLowerCase().includes('create agents')) {
      if (onShowAgentsWizard) {
        setPrompt('');
        onClose();
        onShowAgentsWizard();
        return;
      }
    }

    setIsGenerating(true);
    setProgress({ status: 'generating', message: '✨ Starting Magic generation...' });

    try {
      await onGenerate(promptText, (progressUpdate) => {
        setProgress(progressUpdate);
      });
      
      setProgress({ status: 'complete', message: '🎉 Component generated successfully!' });
      setPrompt('');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setProgress({ status: 'idle' });
      }, 2000);
      
    } catch (error) {
      console.error('Magic generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setProgress({ 
        status: 'error', 
        message: `❌ Generation failed: ${errorMessage}` 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(prompt);
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      // TODO: Add keyboard navigation for suggestions
    }
  };

  if (!isVisible) return null;

  return (
    <div className="magic-command-overlay">
      <div className="magic-command-bar">
        <div className="magic-input-container">
          <span className="magic-icon">✨</span>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a component... (e.g., 'gradient button with hover effects')"
            className="magic-input"
            disabled={isGenerating}
          />
          <button 
            onClick={() => handleSubmit(prompt)}
            disabled={!prompt.trim() || isGenerating}
            className="magic-generate-btn"
            title="Generate component"
          >
            {isGenerating ? '⟳' : '→'}
          </button>
          {onShowContextInsights && (
            <button 
              onClick={onShowContextInsights}
              className="magic-context-btn"
              title="View project context insights"
            >
              🧠
            </button>
          )}
          {onShowPageBuilder && (
            <button 
              onClick={onShowPageBuilder}
              className="magic-page-btn"
              title="Open Page Builder (Cmd+Shift+P)"
            >
              🏗️
            </button>
          )}
          {onShowComponentLibrary && (
            <button 
              onClick={onShowComponentLibrary}
              className="magic-library-btn"
              title="Open Component Library (Cmd+Shift+L)"
            >
              📚
            </button>
          )}
          {onShowIntegrations && (
            <button 
              onClick={onShowIntegrations}
              className="magic-integrations-btn"
              title="Open Integrations (Figma, Testing, Docs)"
            >
              🔧
            </button>
          )}
          {onShowAgentsWizard && (
            <button 
              onClick={onShowAgentsWizard}
              className="magic-agents-btn"
              title="Create AGENTS.md file for AI context"
            >
              🤖
            </button>
          )}
          <button 
            onClick={onClose}
            className="magic-close-btn"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
        
        {/* Progress indicator */}
        {progress.status !== 'idle' && (
          <div className={`magic-progress ${progress.status}`}>
            <div className="progress-content">
              <span className="progress-message">{progress.message}</span>
              {progress.status === 'generating' && (
                <div className="progress-spinner">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Suggestions */}
        {suggestions.length > 0 && progress.status === 'idle' && (
          <div className="magic-suggestions">
            <div className="suggestions-header">
              <span>✨ Suggestions</span>
            </div>
            {suggestions.map(suggestion => (
              <div 
                key={suggestion.id}
                className="magic-suggestion"
                onClick={() => handleSubmit(suggestion.text)}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-text">{suggestion.text}</span>
                <span className="suggestion-arrow">→</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Quick tips */}
        {prompt.length === 0 && progress.status === 'idle' && (
          <div className="magic-tips">
            <div className="tips-header">💡 Quick Tips</div>
            <div className="tips-content">
              <div className="tip-section">
                <span className="tip-category">🎨 Components:</span>
                <span>"pricing table", "login form", "hero section", "navigation bar"</span>
              </div>
              <div className="tip-section">
                <span className="tip-category">🤖 AI Context:</span>
                <span>"create agents.md", "ai documentation", "project context"</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicCommandBar;