/**
 * API Key Storage Service
 * 
 * Securely stores and retrieves API keys for AI providers.
 * Keys are stored in localStorage with basic encryption.
 */

'use client';

export type APIProvider = 'glm' | 'anthropic';

interface StoredKeys {
  glm?: string;
  anthropic?: string;
}

class APIKeyStorageClass {
  private readonly STORAGE_KEY = 'coder1-api-keys';
  private readonly PREFERENCE_KEY = 'coder1-api-key-preference';
  
  /**
   * Simple XOR encryption for localStorage
   * NOTE: This is obfuscation, not true encryption.
   * For production, use Web Crypto API with proper key derivation.
   */
  private encrypt(text: string): string {
    if (!text) return '';
    
    // Simple XOR with rotating key
    const key = 'coder1-secure-key-v1';
    let encrypted = '';
    
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    // Base64 encode
    return btoa(encrypted);
  }
  
  private decrypt(encrypted: string): string {
    if (!encrypted) return '';
    
    try {
      // Base64 decode
      const text = atob(encrypted);
      
      // XOR decrypt (same operation as encrypt)
      const key = 'coder1-secure-key-v1';
      let decrypted = '';
      
      for (let i = 0; i < text.length; i++) {
        decrypted += String.fromCharCode(
          text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      console.error('[APIKeyStorage] Decryption error:', error);
      return '';
    }
  }
  
  /**
   * Save API key for a provider
   */
  async saveKey(provider: APIProvider, key: string): Promise<void> {
    try {
      const keys = this.getAllKeys();
      keys[provider] = this.encrypt(key);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event('api-keys-updated'));
      
      console.log(`✅ [APIKeyStorage] Saved ${provider} key`);
    } catch (error) {
      console.error('[APIKeyStorage] Error saving key:', error);
      throw new Error(`Failed to save ${provider} API key`);
    }
  }
  
  /**
   * Get API key for a provider
   */
  async getKey(provider: APIProvider): Promise<string | null> {
    try {
      const keys = this.getAllKeys();
      const encryptedKey = keys[provider];
      
      if (!encryptedKey) {
        return null;
      }
      
      return this.decrypt(encryptedKey);
    } catch (error) {
      console.error('[APIKeyStorage] Error retrieving key:', error);
      return null;
    }
  }
  
  /**
   * Delete API key for a provider
   */
  async deleteKey(provider: APIProvider): Promise<void> {
    try {
      const keys = this.getAllKeys();
      delete keys[provider];
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
      
      // Dispatch custom event
      window.dispatchEvent(new Event('api-keys-updated'));
      
      console.log(`🗑️ [APIKeyStorage] Deleted ${provider} key`);
    } catch (error) {
      console.error('[APIKeyStorage] Error deleting key:', error);
      throw new Error(`Failed to delete ${provider} API key`);
    }
  }
  
  /**
   * Check if provider has a configured key
   */
  hasKey(provider: APIProvider): boolean {
    const keys = this.getAllKeys();
    return !!(keys[provider] && keys[provider].length > 0);
  }
  
  /**
   * Get all stored keys (encrypted)
   */
  private getAllKeys(): StoredKeys {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return {};
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('[APIKeyStorage] Error reading keys:', error);
      return {};
    }
  }
  
  /**
   * Set preferred provider
   */
  setPreferredProvider(provider: 'glm' | 'anthropic' | 'auto'): void {
    localStorage.setItem(this.PREFERENCE_KEY, provider);
    window.dispatchEvent(new Event('api-keys-updated'));
  }
  
  /**
   * Get preferred provider
   */
  getPreferredProvider(): 'glm' | 'anthropic' | 'auto' {
    return (localStorage.getItem(this.PREFERENCE_KEY) as any) || 'auto';
  }
  
  /**
   * Get active provider (based on preference and availability)
   */
  getActiveProvider(): APIProvider | null {
    const preference = this.getPreferredProvider();
    const hasGLM = this.hasKey('glm');
    const hasAnthropic = this.hasKey('anthropic');
    
    if (preference === 'auto') {
      // Auto: prefer GLM for cost savings
      return hasGLM ? 'glm' : hasAnthropic ? 'anthropic' : null;
    } else if (preference === 'glm' && hasGLM) {
      return 'glm';
    } else if (preference === 'anthropic' && hasAnthropic) {
      return 'anthropic';
    }
    
    // Fallback
    return hasGLM ? 'glm' : hasAnthropic ? 'anthropic' : null;
  }
  
  /**
   * Clear all stored keys
   */
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PREFERENCE_KEY);
    window.dispatchEvent(new Event('api-keys-updated'));
    console.log('🧹 [APIKeyStorage] Cleared all API keys');
  }
  
  /**
   * Export keys for server-side use
   * Returns plain text keys for .env.local sync
   */
  async exportForEnv(): Promise<{ glm?: string; anthropic?: string }> {
    const glmKey = await this.getKey('glm');
    const anthropicKey = await this.getKey('anthropic');
    
    const exported: { glm?: string; anthropic?: string } = {};
    
    if (glmKey) exported.glm = glmKey;
    if (anthropicKey) exported.anthropic = anthropicKey;
    
    return exported;
  }
}

// Singleton instance
export const APIKeyStorage = new APIKeyStorageClass();
