/**
 * License Manager for Coder1 IDE
 * Handles license key generation, validation, and trial management
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class LicenseManager {
    constructor() {
        // Use local directory for non-Docker environments
        const homeDir = require('os').homedir();
        this.configPath = process.env.CONFIG_PATH || path.join(homeDir, '.coder1', 'config');
        this.licenseFile = path.join(this.configPath, 'license.json');
        this.trialFile = path.join(this.configPath, 'trial.json');
        this.secret = process.env.LICENSE_SECRET || 'coder1-secret-2024-change-in-production';
    }

    /**
     * Generate a license key for a user
     * Format: C1-USERNAME-HASH
     */
    static generateKey(email, type = 'monthly') {
        const secret = process.env.LICENSE_SECRET || 'coder1-secret-2024-change-in-production';
        const username = email.split('@')[0].toUpperCase().substring(0, 8);
        const data = `${email}-${type}-${Date.now()}`;
        const hash = crypto
            .createHash('sha256')
            .update(data + secret)
            .digest('hex')
            .substring(0, 8)
            .toUpperCase();
        
        return `C1-${username}-${hash}`;
    }

    /**
     * Validate a license key
     */
    async validate(key) {
        if (!key) return { valid: false, reason: 'No license key provided' };
        
        // Check format
        if (!key.startsWith('C1-') || key.split('-').length !== 3) {
            return { valid: false, reason: 'Invalid license format' };
        }

        // For MVP: Simple offline validation
        // In production, this would check against a database
        const parts = key.split('-');
        if (parts[2].length !== 8) {
            return { valid: false, reason: 'Invalid license hash' };
        }

        // Store validated license
        try {
            await this.storeLicense({
                key,
                validatedAt: Date.now(),
                type: 'professional' // Assume paid license
            });
        } catch (error) {
            console.error('Failed to store license:', error);
        }

        return { 
            valid: true, 
            type: 'professional',
            features: ['unlimited_commands', 'priority_support', 'all_features']
        };
    }

    /**
     * Store license information
     */
    async storeLicense(licenseData) {
        try {
            await fs.mkdir(this.configPath, { recursive: true });
            await fs.writeFile(
                this.licenseFile,
                JSON.stringify(licenseData, null, 2)
            );
        } catch (error) {
            console.error('Error storing license:', error);
            throw error;
        }
    }

    /**
     * Get stored license
     */
    async getStoredLicense() {
        try {
            const data = await fs.readFile(this.licenseFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if license is valid
     */
    async isLicenseValid() {
        // Check environment variable first
        if (process.env.LICENSE_KEY) {
            const result = await this.validate(process.env.LICENSE_KEY);
            return result.valid;
        }

        // Check stored license
        const stored = await this.getStoredLicense();
        if (stored && stored.key) {
            const result = await this.validate(stored.key);
            return result.valid;
        }

        return false;
    }

    /**
     * Initialize trial
     */
    async startTrial() {
        const trialData = {
            startDate: Date.now(),
            endDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            commandsUsed: 0,
            maxCommands: 50,
            features: ['basic_commands', 'terminal', 'file_operations']
        };

        try {
            await fs.mkdir(this.configPath, { recursive: true });
            await fs.writeFile(
                this.trialFile,
                JSON.stringify(trialData, null, 2)
            );
            return trialData;
        } catch (error) {
            console.error('Error starting trial:', error);
            throw error;
        }
    }

    /**
     * Check trial status
     */
    async checkTrial() {
        try {
            const data = await fs.readFile(this.trialFile, 'utf8');
            const trial = JSON.parse(data);

            const now = Date.now();
            const daysLeft = Math.ceil((trial.endDate - now) / (24 * 60 * 60 * 1000));
            const commandsLeft = trial.maxCommands - trial.commandsUsed;

            if (now > trial.endDate) {
                return {
                    valid: false,
                    expired: true,
                    reason: 'Trial period has expired',
                    showUpgrade: true
                };
            }

            if (trial.commandsUsed >= trial.maxCommands) {
                return {
                    valid: false,
                    expired: false,
                    reason: 'Trial command limit reached',
                    showUpgrade: true
                };
            }

            return {
                valid: true,
                expired: false,
                daysLeft,
                commandsLeft,
                commandsUsed: trial.commandsUsed,
                endDate: trial.endDate
            };
        } catch (error) {
            // No trial file means trial hasn't started
            return {
                valid: false,
                expired: false,
                notStarted: true
            };
        }
    }

    /**
     * Increment trial command usage
     */
    async incrementTrialUsage() {
        try {
            const data = await fs.readFile(this.trialFile, 'utf8');
            const trial = JSON.parse(data);
            
            trial.commandsUsed++;
            
            await fs.writeFile(
                this.trialFile,
                JSON.stringify(trial, null, 2)
            );

            return trial.commandsUsed;
        } catch (error) {
            console.error('Error updating trial usage:', error);
            return 0;
        }
    }

    /**
     * Get license or trial status
     */
    async getStatus() {
        // Check for valid license first
        const hasLicense = await this.isLicenseValid();
        if (hasLicense) {
            const license = await this.getStoredLicense();
            return {
                type: 'licensed',
                status: 'active',
                features: ['unlimited_commands', 'priority_support', 'all_features'],
                licenseKey: license?.key
            };
        }

        // Check trial status
        const trialStatus = await this.checkTrial();
        if (trialStatus.valid) {
            return {
                type: 'trial',
                status: 'active',
                ...trialStatus
            };
        }

        // No license and no valid trial
        return {
            type: 'none',
            status: 'inactive',
            message: 'No active license or trial',
            showUpgrade: true
        };
    }

    /**
     * Middleware for Express routes
     */
    middleware() {
        return async (req, res, next) => {
            // Skip for public routes
            const publicPaths = [
                '/health',
                '/welcome',
                '/api/trial/start',
                '/api/license/validate',
                '/static',
                '/manifest.json',
                '/favicon.ico'
            ];

            if (publicPaths.some(path => req.path.startsWith(path))) {
                return next();
            }

            const status = await this.getStatus();

            if (status.status === 'inactive') {
                // Redirect to welcome page for license entry
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(403).json({
                        error: 'License required',
                        redirectTo: '/welcome'
                    });
                } else {
                    return res.redirect('/welcome');
                }
            }

            // Track usage for trial users
            if (status.type === 'trial' && req.path.startsWith('/api/')) {
                await this.incrementTrialUsage();
            }

            // Add license status to request
            req.licenseStatus = status;
            next();
        };
    }
}

module.exports = LicenseManager;