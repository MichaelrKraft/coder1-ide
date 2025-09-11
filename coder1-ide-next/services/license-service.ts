/**
 * License Management Service
 * Handles license validation and feature gating
 */

import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export type LicenseTier = 'free' | 'pro' | 'team';

export interface UserLicense {
  email: string;
  licenseKey: string;
  tier: LicenseTier;
  features: LicenseFeatures;
  machineId: string;
  validUntil: Date;
  isValid: boolean;
}

export interface LicenseFeatures {
  memoryPersistence: boolean;
  unlimitedProjects: boolean;
  searchHistory: boolean;
  teamCollaboration: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: UserLicense;
  error?: string;
}

class LicenseService {
  private cachedLicense: UserLicense | null = null;
  private licenseCachePath: string;
  private validationUrl: string = 'https://api.coder1.app/license/validate';

  constructor() {
    // Store license cache in user's home directory
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.licenseCachePath = path.join(homeDir, '.coder1', 'license.json');
  }

  /**
   * Generate unique machine ID for license binding
   */
  private generateMachineId(): string {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    
    // Create a fingerprint from system information
    const fingerprint = {
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'unknown',
      cpuCores: cpus.length,
      hostname: os.hostname(),
      // Get first non-internal MAC address
      mac: Object.values(networkInterfaces)
        .flat()
        .find(iface => !iface?.internal && iface?.mac !== '00:00:00:00:00:00')?.mac || 'unknown'
    };

    // Create hash of fingerprint
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Validate license with remote server or cache
   */
  async validateLicense(email: string, licenseKey: string): Promise<LicenseValidationResult> {
    try {
      // Check for free trial
      if (licenseKey === 'free-trial' || !licenseKey) {
        return this.createFreeTrial(email);
      }

      // Try online validation first
      try {
        const result = await this.validateOnline(email, licenseKey);
        if (result.valid && result.license) {
          await this.cacheLicense(result.license);
        }
        return result;
      } catch (error) {
        console.log('Online validation failed, checking cache...');
        // Fall back to cached license if online validation fails
        return await this.validateOffline(email, licenseKey);
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'License validation failed'
      };
    }
  }

  /**
   * Validate license online with server
   */
  private async validateOnline(email: string, licenseKey: string): Promise<LicenseValidationResult> {
    const machineId = this.generateMachineId();

    try {
      // In production, this would make an actual API call
      // For now, simulate validation
      const response = await this.simulateServerValidation(email, licenseKey, machineId);
      
      if (response.valid) {
        const license: UserLicense = {
          email,
          licenseKey,
          tier: response.tier as LicenseTier,
          features: this.getFeaturesForTier(response.tier as LicenseTier),
          machineId,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isValid: true
        };

        return { valid: true, license };
      }

      return { valid: false, error: response.error };
    } catch (error) {
      throw new Error('Failed to connect to license server');
    }
  }

  /**
   * Simulate server validation (replace with actual API call in production)
   */
  private async simulateServerValidation(email: string, licenseKey: string, machineId: string): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simple validation logic for demo
    if (licenseKey.match(/^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}$/)) {
      // Check if it's a known pro license pattern
      if (licenseKey.startsWith('PRO')) {
        return { valid: true, tier: 'pro' };
      }
      if (licenseKey.startsWith('TEAM')) {
        return { valid: true, tier: 'team' };
      }
    }

    return { 
      valid: false, 
      error: 'Invalid license key format' 
    };
  }

  /**
   * Validate using cached license (offline mode)
   */
  private async validateOffline(email: string, licenseKey: string): Promise<LicenseValidationResult> {
    try {
      const cached = await this.getCachedLicense();
      
      if (!cached) {
        return {
          valid: false,
          error: 'No cached license found. Internet connection required for first validation.'
        };
      }

      // Check if license matches and is still valid
      if (cached.email === email && cached.licenseKey === licenseKey) {
        const now = new Date();
        if (now <= new Date(cached.validUntil)) {
          // Check machine ID
          const currentMachineId = this.generateMachineId();
          if (cached.machineId === currentMachineId) {
            return { valid: true, license: cached };
          } else {
            return {
              valid: false,
              error: 'License is bound to a different machine'
            };
          }
        } else {
          return {
            valid: false,
            error: 'Cached license has expired. Internet connection required for renewal.'
          };
        }
      }

      return {
        valid: false,
        error: 'License credentials do not match cached license'
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to read cached license'
      };
    }
  }

  /**
   * Create a free trial license
   */
  private createFreeTrial(email: string): LicenseValidationResult {
    const license: UserLicense = {
      email,
      licenseKey: 'free-trial',
      tier: 'free',
      features: this.getFeaturesForTier('free'),
      machineId: this.generateMachineId(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day for free trial
      isValid: true
    };

    return { valid: true, license };
  }

  /**
   * Get features for a license tier
   */
  getFeaturesForTier(tier: LicenseTier): LicenseFeatures {
    switch (tier) {
      case 'free':
        return {
          memoryPersistence: false, // Sessions expire daily
          unlimitedProjects: false, // Limited to 3 projects
          searchHistory: false,
          teamCollaboration: false,
          prioritySupport: false,
          customIntegrations: false
        };
      
      case 'pro':
        return {
          memoryPersistence: true, // Infinite memory
          unlimitedProjects: true,
          searchHistory: true,
          teamCollaboration: false,
          prioritySupport: true,
          customIntegrations: false
        };
      
      case 'team':
        return {
          memoryPersistence: true,
          unlimitedProjects: true,
          searchHistory: true,
          teamCollaboration: true,
          prioritySupport: true,
          customIntegrations: true
        };
      
      default:
        return this.getFeaturesForTier('free');
    }
  }

  /**
   * Cache license for offline use
   */
  private async cacheLicense(license: UserLicense): Promise<void> {
    try {
      const dir = path.dirname(this.licenseCachePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(
        this.licenseCachePath,
        JSON.stringify(license, null, 2),
        'utf-8'
      );
      
      this.cachedLicense = license;
    } catch (error) {
      console.error('Failed to cache license:', error);
    }
  }

  /**
   * Get cached license
   */
  private async getCachedLicense(): Promise<UserLicense | null> {
    if (this.cachedLicense) {
      return this.cachedLicense;
    }

    try {
      const content = await fs.readFile(this.licenseCachePath, 'utf-8');
      const license = JSON.parse(content) as UserLicense;
      this.cachedLicense = license;
      return license;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a specific feature is enabled
   */
  async isFeatureEnabled(feature: keyof LicenseFeatures): Promise<boolean> {
    const cached = await this.getCachedLicense();
    if (!cached) return false;
    
    // Check if license is still valid
    const now = new Date();
    if (now > new Date(cached.validUntil)) {
      return false;
    }

    return cached.features[feature] || false;
  }

  /**
   * Get current license status
   */
  async getLicenseStatus(): Promise<{
    isValid: boolean;
    tier: LicenseTier;
    email?: string;
    expiresIn?: string;
    features?: LicenseFeatures;
  }> {
    const cached = await this.getCachedLicense();
    
    if (!cached) {
      return {
        isValid: false,
        tier: 'free'
      };
    }

    const now = new Date();
    const validUntil = new Date(cached.validUntil);
    const isValid = now <= validUntil;

    if (!isValid) {
      return {
        isValid: false,
        tier: 'free'
      };
    }

    // Calculate days until expiration
    const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isValid: true,
      tier: cached.tier,
      email: cached.email,
      expiresIn: `${daysLeft} days`,
      features: cached.features
    };
  }

  /**
   * Clear cached license (for logout)
   */
  async clearLicense(): Promise<void> {
    this.cachedLicense = null;
    try {
      await fs.unlink(this.licenseCachePath);
    } catch (error) {
      // File might not exist, that's okay
    }
  }

  /**
   * Generate a demo license key for testing
   */
  generateDemoLicenseKey(tier: LicenseTier): string {
    const prefix = tier === 'pro' ? 'PRO' : tier === 'team' ? 'TEAM' : 'FREE';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomPart = Array(6)
      .fill(0)
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('');
    
    return `${prefix}-${randomPart.slice(0, 3)}-${randomPart.slice(3)}`;
  }
}

// Export singleton instance
export const licenseService = new LicenseService();
export default licenseService;