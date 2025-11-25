/**
 * useAPIKeyStatus Hook
 * 
 * Detects configured API keys and provides status information
 * for AI Team / Parallel Exploration feature.
 */

'use client';

import { useState, useEffect } from 'react';

export interface APIKeyStatus {
  hasGLMKey: boolean;
  hasAnthropicKey: boolean;
  hasAnyKey: boolean;
  activeProvider: 'glm' | 'anthropic' | null;
  preferredProvider: 'glm' | 'anthropic' | 'auto';
}

export function useAPIKeyStatus(): APIKeyStatus {
  const [status, setStatus] = useState<APIKeyStatus>({
    hasGLMKey: false,
    hasAnthropicKey: false,
    hasAnyKey: false,
    activeProvider: null,
    preferredProvider: 'auto'
  });

  useEffect(() => {
    checkAPIKeys();
    
    // Listen for storage events (key updates in other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events (key updates in same tab)
    window.addEventListener('api-keys-updated', checkAPIKeys);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('api-keys-updated', checkAPIKeys);
    };
  }, []);

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'coder1-api-keys' || e.key === 'coder1-api-key-preference') {
      checkAPIKeys();
    }
  };

  const checkAPIKeys = () => {
    try {
      // Check localStorage for configured keys
      const keysData = localStorage.getItem('coder1-api-keys');
      const preference = localStorage.getItem('coder1-api-key-preference') as 'glm' | 'anthropic' | 'auto' || 'auto';
      
      let hasGLM = false;
      let hasAnthropic = false;
      
      if (keysData) {
        const keys = JSON.parse(keysData);
        hasGLM = !!(keys.glm && keys.glm.length > 0);
        hasAnthropic = !!(keys.anthropic && keys.anthropic.length > 0);
      }
      
      // Also check environment variables (server-configured keys)
      // These would be set during SSR
      if (typeof window !== 'undefined') {
        hasGLM = hasGLM || !!process.env.NEXT_PUBLIC_GLM_API_KEY;
        hasAnthropic = hasAnthropic || !!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      }
      
      const hasAny = hasGLM || hasAnthropic;
      
      // Determine active provider based on preference and availability
      let active: 'glm' | 'anthropic' | null = null;
      
      if (preference === 'auto') {
        // Auto: prefer GLM for cost savings
        active = hasGLM ? 'glm' : hasAnthropic ? 'anthropic' : null;
      } else if (preference === 'glm' && hasGLM) {
        active = 'glm';
      } else if (preference === 'anthropic' && hasAnthropic) {
        active = 'anthropic';
      } else {
        // Fallback if preferred isn't available
        active = hasGLM ? 'glm' : hasAnthropic ? 'anthropic' : null;
      }
      
      setStatus({
        hasGLMKey: hasGLM,
        hasAnthropicKey: hasAnthropic,
        hasAnyKey: hasAny,
        activeProvider: active,
        preferredProvider: preference
      });
      
    } catch (error) {
      console.error('[useAPIKeyStatus] Error checking API keys:', error);
    }
  };

  return status;
}
