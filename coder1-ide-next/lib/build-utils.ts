/**
 * Build-time utility functions
 * Helps prevent build errors in production environments like Render
 */

/**
 * Check if we're in a build environment (no runtime services available)
 */
export const isBuildTime = (): boolean => {
  return process.env.NODE_ENV === 'production' && 
         typeof window === 'undefined' &&
         process.env.RENDER === 'true';
};

/**
 * Check if git repository is available
 */
export const isGitAvailable = (): boolean => {
  if (isBuildTime()) return false;
  
  try {
    const fs = require('fs');
    return fs.existsSync('.git');
  } catch {
    return false;
  }
};

/**
 * Check if Claude CLI is available
 */
export const isClaudeCliAvailable = (): boolean => {
  if (isBuildTime()) return false;
  
  try {
    const { execSync } = require('child_process');
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/**
 * Safe fetch wrapper for build time
 */
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response | null> => {
  if (isBuildTime()) {
    console.log(`[Build] Skipping fetch to ${url} during build`);
    return null;
  }
  
  try {
    return await fetch(url, options);
  } catch (error) {
    console.warn(`[Fetch] Failed to fetch ${url}:`, error);
    return null;
  }
};

/**
 * Get safe environment variable with fallback
 */
export const getEnvVar = (key: string, fallback: string = ''): string => {
  return process.env[key] || fallback;
};

/**
 * Check if feature should be enabled
 */
export const isFeatureEnabled = (featureName: string): boolean => {
  if (isBuildTime()) return false;
  
  const envKey = `NEXT_PUBLIC_ENABLE_${featureName.toUpperCase().replace(/-/g, '_')}`;
  return process.env[envKey] === 'true';
};