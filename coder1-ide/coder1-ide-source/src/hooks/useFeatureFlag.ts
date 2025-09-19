import { useState, useEffect } from 'react';
import { FeatureFlags, isFeatureEnabled, getCurrentFeatures } from '../config/features';

/**
 * React hook for accessing feature flags
 * Uses event-driven updates for optimal performance
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(feature));

  useEffect(() => {
    // Update handler for feature flag changes
    const handleFeatureFlagUpdate = (event: CustomEvent) => {
      const { feature: updatedFeature, allFlags } = event.detail;
      
      // If specific feature was updated or if all flags were reset
      if (!updatedFeature || updatedFeature === feature) {
        setEnabled(isFeatureEnabled(feature));
      }
    };

    // Listen for custom feature flag events
    window.addEventListener('featureFlagsUpdated', handleFeatureFlagUpdate as EventListener);
    
    // Also listen for storage events (from other tabs/windows)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'coder1-feature-flags') {
        setEnabled(isFeatureEnabled(feature));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('featureFlagsUpdated', handleFeatureFlagUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [feature]);

  return enabled;
}

/**
 * Hook to get all feature flags
 * Uses event-driven updates for optimal performance
 */
export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(() => getCurrentFeatures());

  useEffect(() => {
    // Update handler for feature flag changes
    const handleFeatureFlagUpdate = (event: CustomEvent) => {
      const { allFlags } = event.detail;
      setFlags(allFlags || getCurrentFeatures());
    };

    // Listen for custom feature flag events
    window.addEventListener('featureFlagsUpdated', handleFeatureFlagUpdate as EventListener);
    
    // Also listen for storage events (from other tabs/windows)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'coder1-feature-flags') {
        setFlags(getCurrentFeatures());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('featureFlagsUpdated', handleFeatureFlagUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return flags;
}

/**
 * Hook for toggling feature flags (useful for admin/dev interfaces)
 */
export function useFeatureFlagToggle(): {
  flags: FeatureFlags;
  toggleFlag: (feature: keyof FeatureFlags) => void;
  resetFlags: () => void;
} {
  const flags = useFeatureFlags();
  
  const toggleFlag = (feature: keyof FeatureFlags) => {
    const { updateFeatureFlag } = require('../config/features');
    updateFeatureFlag(feature, !flags[feature]);
  };
  
  const resetFlags = () => {
    const { resetFeatureFlags } = require('../config/features');
    resetFeatureFlags();
  };

  return { flags, toggleFlag, resetFlags };
}