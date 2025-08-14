/**
 * GitHub CLI Detection and Management Utility
 * 
 * Detects GitHub CLI availability and provides fallback mechanisms.
 * Ensures zero breakage of existing functionality.
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class GitHubCLIDetector {
    constructor() {
        this.cliAvailable = null;
        this.cliVersion = null;
        this.authStatus = null;
        this.lastCheckTime = null;
        this.checkInterval = 5 * 60 * 1000; // Re-check every 5 minutes
    }

    /**
     * Check if GitHub CLI is installed and available
     */
    async isAvailable() {
        // Use cached result if recent
        if (this.lastCheckTime && Date.now() - this.lastCheckTime < this.checkInterval) {
            return this.cliAvailable;
        }

        try {
            const { stdout } = await exec('gh --version');
            
            // Parse version from output like "gh version 2.40.0 (2024-01-01)"
            const versionMatch = stdout.match(/gh version ([\d.]+)/);
            if (versionMatch) {
                this.cliVersion = versionMatch[1];
                this.cliAvailable = true;
            } else {
                this.cliAvailable = false;
            }
        } catch (error) {
            this.cliAvailable = false;
            this.cliVersion = null;
        }

        this.lastCheckTime = Date.now();
        return this.cliAvailable;
    }

    /**
     * Check if GitHub CLI is authenticated
     */
    async isAuthenticated() {
        if (!await this.isAvailable()) {
            return false;
        }

        try {
            const { stdout } = await exec('gh auth status');
            this.authStatus = stdout.includes('Logged in');
            return this.authStatus;
        } catch (error) {
            // gh auth status returns non-zero exit code when not authenticated
            this.authStatus = false;
            return false;
        }
    }

    /**
     * Get installation instructions based on platform
     */
    getInstallInstructions() {
        const platform = process.platform;
        
        const instructions = {
            darwin: {
                title: 'Install GitHub CLI on macOS',
                methods: [
                    {
                        name: 'Homebrew (Recommended)',
                        command: 'brew install gh',
                        description: 'Install using Homebrew package manager'
                    },
                    {
                        name: 'MacPorts',
                        command: 'sudo port install gh',
                        description: 'Install using MacPorts'
                    },
                    {
                        name: 'Download',
                        command: 'Visit: https://github.com/cli/cli/releases',
                        description: 'Download the macOS installer'
                    }
                ]
            },
            linux: {
                title: 'Install GitHub CLI on Linux',
                methods: [
                    {
                        name: 'Debian/Ubuntu',
                        command: 'sudo apt install gh',
                        description: 'Install using APT package manager'
                    },
                    {
                        name: 'Fedora/RHEL',
                        command: 'sudo dnf install gh',
                        description: 'Install using DNF package manager'
                    },
                    {
                        name: 'Snap',
                        command: 'sudo snap install gh',
                        description: 'Install using Snap package'
                    }
                ]
            },
            win32: {
                title: 'Install GitHub CLI on Windows',
                methods: [
                    {
                        name: 'WinGet',
                        command: 'winget install --id GitHub.cli',
                        description: 'Install using Windows Package Manager'
                    },
                    {
                        name: 'Chocolatey',
                        command: 'choco install gh',
                        description: 'Install using Chocolatey'
                    },
                    {
                        name: 'Download',
                        command: 'Visit: https://github.com/cli/cli/releases',
                        description: 'Download the Windows installer'
                    }
                ]
            }
        };

        return instructions[platform] || {
            title: 'Install GitHub CLI',
            methods: [
                {
                    name: 'Official Downloads',
                    command: 'Visit: https://cli.github.com/',
                    description: 'Download for your operating system'
                }
            ]
        };
    }

    /**
     * Get authentication instructions
     */
    getAuthInstructions() {
        return {
            title: 'Authenticate GitHub CLI',
            steps: [
                {
                    step: 1,
                    title: 'Start Authentication',
                    command: 'gh auth login',
                    description: 'Begin the authentication process',
                    education: {
                        emoji: '🔐',
                        explanation: 'This connects your GitHub account to the CLI',
                        analogy: 'Like logging into GitHub.com, but for your terminal'
                    }
                },
                {
                    step: 2,
                    title: 'Choose GitHub.com',
                    command: 'Select: GitHub.com',
                    description: 'Choose GitHub.com (not Enterprise)',
                    education: {
                        emoji: '🌐',
                        explanation: 'Most users should choose GitHub.com',
                        analogy: 'Like choosing which email service to log into'
                    }
                },
                {
                    step: 3,
                    title: 'Choose Authentication Method',
                    command: 'Select: Login with a web browser',
                    description: 'The easiest method for most users',
                    education: {
                        emoji: '🌍',
                        explanation: 'Your browser will open to securely log you in',
                        analogy: 'Like using "Sign in with Google" on websites'
                    }
                },
                {
                    step: 4,
                    title: 'Complete in Browser',
                    command: 'Follow browser instructions',
                    description: 'Authorize GitHub CLI in your browser',
                    education: {
                        emoji: '✅',
                        explanation: 'GitHub will confirm it\'s really you',
                        analogy: 'Like two-factor authentication for extra security'
                    }
                }
            ]
        };
    }

    /**
     * Execute a GitHub CLI command with fallback
     */
    async executeCommand(command, args = [], options = {}) {
        // Check if CLI is available
        if (!await this.isAvailable()) {
            return {
                success: false,
                usedCLI: false,
                error: 'GitHub CLI not installed',
                installInstructions: this.getInstallInstructions()
            };
        }

        // Check if authenticated
        if (!await this.isAuthenticated()) {
            return {
                success: false,
                usedCLI: false,
                error: 'GitHub CLI not authenticated',
                authInstructions: this.getAuthInstructions()
            };
        }

        return new Promise((resolve) => {
            const gh = spawn('gh', [command, ...args], {
                cwd: options.cwd || process.cwd(),
                env: { ...process.env, ...options.env }
            });

            let stdout = '';
            let stderr = '';

            gh.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            gh.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            gh.on('close', (code) => {
                resolve({
                    success: code === 0,
                    usedCLI: true,
                    stdout,
                    stderr,
                    code
                });
            });

            gh.on('error', (error) => {
                resolve({
                    success: false,
                    usedCLI: false,
                    error: error.message
                });
            });
        });
    }

    /**
     * Get CLI status summary
     */
    async getStatus() {
        const isAvailable = await this.isAvailable();
        const isAuthenticated = isAvailable ? await this.isAuthenticated() : false;

        return {
            installed: isAvailable,
            version: this.cliVersion,
            authenticated: isAuthenticated,
            ready: isAvailable && isAuthenticated,
            installInstructions: !isAvailable ? this.getInstallInstructions() : null,
            authInstructions: isAvailable && !isAuthenticated ? this.getAuthInstructions() : null
        };
    }
}

// Singleton instance
const githubCLI = new GitHubCLIDetector();

module.exports = githubCLI;