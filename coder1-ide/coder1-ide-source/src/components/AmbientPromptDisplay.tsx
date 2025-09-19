/**
 * Ambient Prompt Display Component for IDE
 * Continuously rotates through MCP prompt suggestions with context awareness
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import mcpPromptsService, { MCPPrompt, PromptContext } from '../services/MCPPromptsService';
import './AmbientPromptDisplay.css';

interface AmbientPromptDisplayProps {
  currentFileType?: string;
  hasErrors?: boolean;
  onPromptExecute?: (command: string) => void;
}

const AmbientPromptDisplay: React.FC<AmbientPromptDisplayProps> = ({
  currentFileType,
  hasErrors = false,
  onPromptExecute
}) => {
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(7000); // 7 seconds default
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [executedPrompts, setExecutedPrompts] = useState<string[]>([]);
  
  const rotationInterval = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load prompts on mount and context change
  useEffect(() => {
    loadPrompts();
  }, [currentFileType, hasErrors]);

  // Setup rotation interval
  useEffect(() => {
    if (!isPaused && prompts.length > 0) {
      rotationInterval.current = setInterval(() => {
        nextPrompt();
      }, rotationSpeed);
    }

    return () => {
      if (rotationInterval.current) {
        clearInterval(rotationInterval.current);
      }
    };
  }, [isPaused, prompts, rotationSpeed, currentIndex]);

  // Track user activity for adaptive rotation speed
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      const idleTime = now - lastActivity;
      setLastActivity(now);

      // Adjust rotation speed based on activity
      if (idleTime < 5000) {
        setRotationSpeed(5000); // 5s when active
      } else if (idleTime > 60000) {
        setRotationSpeed(15000); // 15s when idle
      } else {
        setRotationSpeed(7000); // 7s default
      }
    };

    const events = ['mousedown', 'keypress', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [lastActivity]);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const context: PromptContext = {
        fileType: currentFileType,
        hasErrors,
        idleTime: Date.now() - lastActivity,
        timeOfDay: mcpPromptsService.getTimeOfDay(),
        recentPrompts: executedPrompts.slice(-5),
        sessionType: 'ide'
      };

      const suggestions = await mcpPromptsService.getSuggestions(context);
      
      // If no suggestions, load full library
      if (suggestions.length === 0) {
        const library = await mcpPromptsService.getPromptLibrary(context);
        setPrompts(library.prompts.slice(0, 20)); // Limit to 20 for performance
      } else {
        setPrompts(suggestions);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // Use default prompts as fallback
      const library = await mcpPromptsService.getPromptLibrary();
      setPrompts(library.prompts.slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  };

  const nextPrompt = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % prompts.length);
  }, [prompts.length]);

  const previousPrompt = () => {
    setCurrentIndex((prev) => (prev - 1 + prompts.length) % prompts.length);
  };

  const jumpToPrompt = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000); // Resume after 3s
  };

  const handleExecute = async () => {
    const prompt = prompts[currentIndex];
    if (!prompt) return;

    // Show loading state on button
    const tryButton = document.querySelector('.try-now-btn') as HTMLButtonElement;
    const originalText = tryButton?.textContent || 'Try Now';
    if (tryButton) {
      tryButton.disabled = true;
      tryButton.textContent = 'Executing...';
      tryButton.style.opacity = '0.6';
    }

    try {
      console.log(`[AmbientPromptDisplay] Executing prompt: ${prompt.command}`);
      
      // Track execution
      setExecutedPrompts(prev => [...prev, prompt.id].slice(-10));
      await mcpPromptsService.trackUsage(prompt.id, 'execute', { source: 'ide' });

      let executionResult = null;

      // Execute the prompt
      if (onPromptExecute) {
        // Use parent callback if available
        onPromptExecute(prompt.command);
        executionResult = { success: true, source: 'callback' };
      } else {
        // Fallback: execute via service
        console.log('[AmbientPromptDisplay] Using service fallback for execution');
        executionResult = await mcpPromptsService.executePrompt(prompt.command);
      }

      // Show success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">✅</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 2px;">Command Executed</div>
            <div style="font-size: 11px; opacity: 0.9;"><code>${prompt.command}</code></div>
          </div>
        </div>
      `;
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95));
        color: white; padding: 12px 16px; border-radius: 8px; min-width: 280px;
        font-size: 13px; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
        animation: slideInFade 0.3s ease-out; backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        border: 1px solid rgba(255, 255, 255, 0.2);
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 4000);

      // Move to next prompt after execution
      setTimeout(() => nextPrompt(), 1500);

    } catch (error) {
      console.error('[AmbientPromptDisplay] Failed to execute prompt:', error);
      
      // Show error notification
      const errorNotification = document.createElement('div');
      errorNotification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">❌</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 2px;">Execution Failed</div>
            <div style="font-size: 11px; opacity: 0.9;">Check console for details</div>
          </div>
        </div>
      `;
      errorNotification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
        color: white; padding: 12px 16px; border-radius: 8px; min-width: 280px;
        font-size: 13px; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        animation: slideInFade 0.3s ease-out; backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        border: 1px solid rgba(255, 255, 255, 0.2);
      `;
      
      document.body.appendChild(errorNotification);
      setTimeout(() => errorNotification.remove(), 5000);
    } finally {
      // Restore button state
      if (tryButton) {
        tryButton.disabled = false;
        tryButton.textContent = originalText;
        tryButton.style.opacity = '1';
      }
    }
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const currentPrompt = prompts[currentIndex];

  if (isLoading) {
    return (
      <div className="ambient-prompt-container">
        <div className="ambient-prompt-loading">
          <div className="loading-spinner"></div>
          <span>Loading prompts...</span>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`ambient-prompt-container ${isPaused ? 'paused' : ''}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="ambient-prompt-header">
        <span className="prompt-label">💡 Discover</span>
        <button 
          className="pause-btn"
          onClick={handlePauseToggle}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>

      <div key={`prompt-${currentIndex}-${currentPrompt.id}`} className="prompt-card">
        <div className="prompt-icon">{currentPrompt.icon}</div>
        <div className="prompt-content">
          <div className="prompt-command">{currentPrompt.command}</div>
          <div className="prompt-description" title={currentPrompt.description}>
            {currentPrompt.description}
          </div>
        </div>
      </div>

      <div className="prompt-actions">
        <button 
          className="try-now-btn"
          onClick={handleExecute}
          title="Execute this prompt"
        >
          Try Now
        </button>
        <button
          className="info-btn"
          onClick={() => {
            // Show educational tooltip about MCP prompts
            const tooltip = document.createElement('div');
            tooltip.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 8px; color: #8b5cf6;">💡 MCP Prompts Explained</div>
              <div style="margin-bottom: 6px;"><strong>What are MCP Prompts?</strong></div>
              <div style="font-size: 12px; line-height: 1.4; margin-bottom: 8px;">
                Model Context Protocol (MCP) prompts are AI-powered command suggestions that adapt to your current coding context.
              </div>
              <div style="margin-bottom: 6px;"><strong>Key Benefits:</strong></div>
              <div style="font-size: 12px; line-height: 1.4; margin-bottom: 8px;">
                • <strong>Context-Aware</strong>: Suggestions based on your file type and current work<br/>
                • <strong>Time-Saving</strong>: Quick access to powerful AI commands<br/>
                • <strong>Learning Tool</strong>: Discover new ways to use AI in development<br/>
                • <strong>Adaptive</strong>: Rotation speed adjusts to your activity level
              </div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                Click "Try Now" to execute any prompt instantly
              </div>
            `;
            tooltip.style.cssText = `
              position: fixed; top: 20px; right: 20px; z-index: 10000;
              background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(6, 182, 212, 0.95));
              color: white; padding: 16px 20px; border-radius: 12px; max-width: 320px;
              font-size: 13px; font-weight: 400; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
              animation: slideInFade 0.3s ease-out; backdrop-filter: blur(10px);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
              border: 1px solid rgba(255, 255, 255, 0.2);
            `;
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
              position: absolute; top: 8px; right: 12px; background: none; border: none;
              color: rgba(255,255,255,0.8); font-size: 18px; cursor: pointer; padding: 0;
              width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
            `;
            closeBtn.onclick = () => tooltip.remove();
            tooltip.appendChild(closeBtn);
            
            document.body.appendChild(tooltip);
            
            // Auto-remove after 8 seconds
            setTimeout(() => {
              if (tooltip.parentNode) {
                tooltip.remove();
              }
            }, 8000);
          }}
          title="Learn about MCP prompts"
        >
          ?
        </button>
      </div>

      <div className="rotation-indicators">
        {prompts.slice(0, 5).map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex % 5 ? 'active' : ''}`}
            onClick={() => jumpToPrompt(index)}
          />
        ))}
      </div>


      <div className="keyboard-hint">
        <span>← → Navigate • Space: Pause</span>
      </div>
    </div>
  );
};

export default AmbientPromptDisplay;