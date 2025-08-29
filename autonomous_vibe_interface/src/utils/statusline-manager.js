/**
 * StatusLine Manager - Utilities for applying Coder One statusLine configuration
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class StatusLineManager {
    constructor() {
        this.defaultConfigPath = path.join(__dirname, '../config/default-statusline.json');
        this.userSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    }

    /**
     * Load the default Coder One statusLine template
     */
    async loadDefaultTemplate() {
        try {
            const content = await fs.readFile(this.defaultConfigPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to load default statusLine template:', error);
            throw new Error('Default statusLine template not found');
        }
    }

    /**
     * Get user's current Claude settings
     */
    async getUserSettings() {
        try {
            const content = await fs.readFile(this.userSettingsPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            // If file doesn't exist, return empty settings
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    /**
     * Apply Coder One statusLine to user's settings
     */
    async applyCoderOneStatusLine(userId = null) {
        try {
            // Load default template and user settings
            const template = await this.loadDefaultTemplate();
            const userSettings = await this.getUserSettings();

            // Backup existing statusLine if present
            if (userSettings.statusLine) {
                userSettings.statusLine_backup = userSettings.statusLine;
                console.log('📋 Backed up existing statusLine');
            }

            // Apply Coder One statusLine
            userSettings.statusLine = template.statusLine;
            userSettings.statusLine_source = 'coder_one_default';
            userSettings.statusLine_applied_at = new Date().toISOString();
            
            if (userId) {
                userSettings.statusLine_applied_for_user = userId;
            }

            // Ensure .claude directory exists
            const claudeDir = path.dirname(this.userSettingsPath);
            await fs.mkdir(claudeDir, { recursive: true });

            // Write updated settings
            await fs.writeFile(
                this.userSettingsPath, 
                JSON.stringify(userSettings, null, 2),
                'utf8'
            );

            console.log('✅ Coder One statusLine applied successfully');
            console.log('📍 Location:', this.userSettingsPath);
            console.log('🔧 StatusLine:', template.statusLine);

            return {
                success: true,
                statusLine: template.statusLine,
                appliedAt: userSettings.statusLine_applied_at,
                backupCreated: !!userSettings.statusLine_backup
            };

        } catch (error) {
            console.error('❌ Failed to apply Coder One statusLine:', error);
            throw error;
        }
    }

    /**
     * Restore user's original statusLine (remove Coder One branding)
     */
    async restoreOriginalStatusLine() {
        try {
            const userSettings = await this.getUserSettings();

            if (!userSettings.statusLine_backup) {
                console.log('⚠️ No backup statusLine found');
                return { success: false, reason: 'no_backup' };
            }

            // Restore backup
            userSettings.statusLine = userSettings.statusLine_backup;
            
            // Clean up Coder One metadata
            delete userSettings.statusLine_backup;
            delete userSettings.statusLine_source;
            delete userSettings.statusLine_applied_at;
            delete userSettings.statusLine_applied_for_user;

            // Write updated settings
            await fs.writeFile(
                this.userSettingsPath,
                JSON.stringify(userSettings, null, 2),
                'utf8'
            );

            console.log('✅ Original statusLine restored');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to restore original statusLine:', error);
            throw error;
        }
    }

    /**
     * Get current statusLine status
     */
    async getStatusLineStatus() {
        try {
            const userSettings = await this.getUserSettings();
            const template = await this.loadDefaultTemplate();

            return {
                current: userSettings.statusLine || null,
                isCoderOne: userSettings.statusLine === template.statusLine,
                source: userSettings.statusLine_source || 'unknown',
                appliedAt: userSettings.statusLine_applied_at || null,
                hasBackup: !!userSettings.statusLine_backup,
                template: template.statusLine
            };

        } catch (error) {
            console.error('❌ Failed to get statusLine status:', error);
            throw error;
        }
    }

    /**
     * Preview what the statusLine will look like
     */
    async previewStatusLine() {
        try {
            const template = await this.loadDefaultTemplate();
            
            console.log('🔧 Coder One StatusLine Preview:');
            console.log('═'.repeat(60));
            console.log('Template:', template.statusLine);
            console.log('');
            console.log('Examples:');
            template.examples.forEach((example, index) => {
                console.log(`  ${index + 1}. ${example}`);
            });
            console.log('═'.repeat(60));

            return template;

        } catch (error) {
            console.error('❌ Failed to preview statusLine:', error);
            throw error;
        }
    }
}

// CLI interface for easy testing
if (require.main === module) {
    const manager = new StatusLineManager();
    const command = process.argv[2];

    switch (command) {
    case 'apply':
        manager.applyCoderOneStatusLine()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
        break;

    case 'restore':
        manager.restoreOriginalStatusLine()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
        break;

    case 'status':
        manager.getStatusLineStatus()
            .then(status => {
                console.log('📊 StatusLine Status:');
                console.log(JSON.stringify(status, null, 2));
                process.exit(0);
            })
            .catch(() => process.exit(1));
        break;

    case 'preview':
        manager.previewStatusLine()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
        break;

    default:
        console.log('📋 StatusLine Manager Usage:');
        console.log('');
        console.log('  node statusline-manager.js apply   - Apply Coder One statusLine');
        console.log('  node statusline-manager.js restore - Restore original statusLine');
        console.log('  node statusline-manager.js status  - Show current status');
        console.log('  node statusline-manager.js preview - Preview the template');
        console.log('');
        process.exit(0);
    }
}

module.exports = StatusLineManager;