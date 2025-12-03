/**
 * Ambient Prompt Display System - Minimal Implementation
 * Provides contextual, non-intrusive notifications and suggestions
 */

(function() {
  'use strict';

  class AmbientPromptDisplay {
    constructor() {
      this.container = null;
      this.prompts = [];
      this.maxPrompts = 3;
      this.defaultDuration = 5000;
      this.context = {
        timeOfDay: 'day',
        sessionType: 'general'
      };
      
      this.init();
    }

    init() {
      // Create container if it doesn't exist
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'ambient-prompt-container';
        document.body.appendChild(this.container);
      }
    }

    updateContext(newContext) {
      this.context = { ...this.context, ...newContext };
      console.log('Ambient prompt context updated:', this.context);
    }

    show(message, options = {}) {
      const duration = options.duration || this.defaultDuration;
      const type = options.type || 'info';
      
      // Create prompt element
      const prompt = document.createElement('div');
      prompt.className = `ambient-prompt ambient-prompt-${type}`;
      
      const text = document.createElement('div');
      text.className = 'ambient-prompt-text';
      text.textContent = message;
      
      const time = document.createElement('div');
      time.className = 'ambient-prompt-time';
      time.textContent = new Date().toLocaleTimeString();
      
      prompt.appendChild(text);
      prompt.appendChild(time);
      
      // Add to container
      this.container.appendChild(prompt);
      this.prompts.push(prompt);
      
      // Remove old prompts if exceeding max
      while (this.prompts.length > this.maxPrompts) {
        const oldPrompt = this.prompts.shift();
        this.removePrompt(oldPrompt);
      }
      
      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          this.removePrompt(prompt);
        }, duration);
      }
      
      return prompt;
    }

    removePrompt(prompt) {
      if (!prompt || !prompt.parentNode) return;
      
      prompt.classList.add('fade-out');
      setTimeout(() => {
        if (prompt.parentNode) {
          prompt.parentNode.removeChild(prompt);
        }
        const index = this.prompts.indexOf(prompt);
        if (index > -1) {
          this.prompts.splice(index, 1);
        }
      }, 300);
    }

    clear() {
      this.prompts.forEach(prompt => this.removePrompt(prompt));
      this.prompts = [];
    }
  }

  // Create global instance
  window.ambientPromptDisplay = new AmbientPromptDisplay();
  
  console.log('Ambient Prompt Display initialized');
})();
