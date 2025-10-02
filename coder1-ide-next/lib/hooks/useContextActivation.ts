/**
 * Context Activation Hook - Phase 3: Event-Driven Activation
 * 
 * Provides a centralized hook for components to trigger context activation
 * when AI features are used. Ensures lazy activation pattern is consistent.
 */

import { useState, useCallback, useRef } from 'react';
import { browserSessionManager } from '@/services/browser-session-manager';
import { useUIStore } from '@/stores/useUIStore';

interface UseContextActivationReturn {
  isContextActive: boolean;
  isActivating: boolean;
  activateContext: (trigger: string) => Promise<boolean>;
  contextSessionId: string | null;
}

export function useContextActivation(): UseContextActivationReturn {
  const [isContextActive, setIsContextActive] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [contextSessionId, setContextSessionId] = useState<string | null>(null);
  const activationPromise = useRef<Promise<boolean> | null>(null);
  const { addToast } = useUIStore();

  const activateContext = useCallback(async (trigger: string): Promise<boolean> => {
    // If already active, return immediately
    if (isContextActive) {
      console.log(`🧠 Context already active (trigger: ${trigger})`);
      return true;
    }

    // If activation is in progress, wait for it
    if (activationPromise.current) {
      console.log(`⏳ Context activation already in progress (trigger: ${trigger})`);
      return activationPromise.current;
    }

    // Start new activation
    const doActivation = async (): Promise<boolean> => {
      try {
        setIsActivating(true);
        console.log(`🧠 Activating context session (trigger: ${trigger})...`);
        
        // Show user feedback
        addToast(`🧠 Activating AI context for ${trigger}...`, 'info');
        
        // Activate context session via browser session manager with enhanced error handling
        const sessionId = await browserSessionManager.activateContextSession();
        
        setContextSessionId(sessionId);
        setIsContextActive(true);
        
        console.log(`✅ Context activated: ${sessionId.substring(0, 8)}... (trigger: ${trigger})`);
        
        // Check if we're in production mode for appropriate messaging
        const isProduction = process.env.NODE_ENV === 'production';
        const successMessage = isProduction 
          ? '✅ AI context activated - Limited features in production mode'
          : '✅ AI context activated - Claude is now learning from your session';
        
        addToast(successMessage, 'success');
        
        return true;
      } catch (error) {
        console.error('Context activation failed:', error);
        
        // Enhanced error handling based on error type
        let errorMessage = '⚠️ AI context activation failed - features may be limited';
        let shouldRetry = false;
        
        if (error instanceof Error) {
          if (error.message.includes('Context activation failed: 500')) {
            errorMessage = '⚠️ Context system temporarily unavailable - continuing in limited mode';
          } else if (error.message.includes('fetch')) {
            errorMessage = '⚠️ Network error during context activation - retrying available';
            shouldRetry = true;
          } else if (error.message.includes('path')) {
            errorMessage = '⚠️ File system error - continuing in production mode';
          }
        }
        
        addToast(errorMessage, shouldRetry ? 'warning' : 'error');
        
        // In production environments, we continue with degraded functionality
        const isProduction = process.env.NODE_ENV === 'production' || 
                           typeof window !== 'undefined' && window.location.hostname.includes('render');
        
        if (isProduction) {
          console.log('🌐 Production environment detected - continuing with degraded context functionality');
          
          // Create a minimal fallback session ID for basic functionality
          const fallbackSessionId = `fallback_${Date.now()}_${trigger.replace(/\s+/g, '_')}`;
          setContextSessionId(fallbackSessionId);
          setIsContextActive(true);
          
          addToast('🔧 Running in production compatibility mode', 'info');
          return true;
        }
        
        return false;
      } finally {
        setIsActivating(false);
        activationPromise.current = null;
      }
    };

    // Store the promise so concurrent calls can wait
    activationPromise.current = doActivation();
    return activationPromise.current;
  }, [isContextActive, addToast]);

  return {
    isContextActive,
    isActivating,
    activateContext,
    contextSessionId
  };
}

/**
 * AI Feature Triggers - These should call activateContext
 * 
 * Terminal Commands:
 * - claude, cld, claude-code, cc
 * 
 * UI Actions:
 * - Session Summary generation
 * - AI Team button click
 * - Error Doctor activation
 * - Supervision mode toggle
 * - Code explanation requests
 * - Documentation search with AI
 * 
 * Automatic Triggers:
 * - First error in terminal (for Error Doctor)
 * - Component capture from Chrome extension
 * - Magic wand feature usage
 */