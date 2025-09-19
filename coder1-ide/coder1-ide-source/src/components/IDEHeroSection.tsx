import React from 'react';
import './IDEHeroSection.css';
import DotGridBackground from './ui/dot-grid-background';
import './ui/dot-grid-background.css';
import { Typewriter } from './ui/typewriter-text';
import Coder1Logo from './Coder1Logo';

interface IDEHeroSectionProps {
  onDismiss: () => void;
  className?: string;
}

const IDEHeroSection: React.FC<IDEHeroSectionProps> = ({ onDismiss, className = '' }) => {
  const handleClick = () => {
    onDismiss();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onDismiss();
    }
  };

  return (
    <div 
      className={`ide-hero-section ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Click to start coding"
    >
      <DotGridBackground />
      <div className="hero-content">
        <div className="hero-logo">
          <Coder1Logo className="logo-image" />
        </div>
        
        <h2 className="hero-title">
          <Typewriter
            text={["Welcome to Coder1", "Build with AI", "Code with Claude Code"]}
            speed={100}
            loop={true}
            className="hero-title"
            delay={2000}
            stopAfterCycles={2}
          />
        </h2>
        <p className="hero-subtitle">Your AI-powered development environment</p>
        
        <div className="hero-actions">
          <div className="action-item">
            <span className="action-icon">📁</span>
            <span>Open a file to start coding</span>
          </div>
          <div className="action-item">
            <span className="action-icon">⌨️</span>
            <span>Use the terminal for commands</span>
          </div>
          <div className="action-item">
            <span className="action-icon">🤖</span>
            <span>Claude Code integration ready</span>
          </div>
        </div>
        
        <p className="hero-hint">Click anywhere to begin</p>
      </div>
    </div>
  );
};

export default IDEHeroSection;