/**
 * Real Deployment Pipeline Manager
 * 
 * Handles actual deployment to Vercel, Netlify, and other platforms
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const EventEmitter = require('events');

class DeploymentManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logger = options.logger || console;
        
        // API keys and configuration
        this.vercelToken = options.vercelToken || process.env.VERCEL_TOKEN;
        this.netlifyToken = options.netlifyToken || process.env.NETLIFY_TOKEN;
        this.githubToken = options.githubToken || process.env.GITHUB_TOKEN;
        
        // Deployment tracking
        this.activeDeployments = new Map();
        this.deploymentHistory = [];
        
        // Metrics
        this.metrics = {
            deploymentsStarted: 0,
            deploymentsCompleted: 0,
            deploymentsFailed: 0,
            averageDeploymentTime: 0,
            totalDeploymentTime: 0
        };
    }

    /**
     * Deploy project to specified platform
     */
    async deployProject(projectPath, platform = 'vercel', options = {}) {
        const deploymentId = `deploy-${Date.now()}`;
        const projectName = options.projectName || path.basename(projectPath);
        
        try {
            this.logger.log(`🚀 Starting deployment: ${deploymentId} to ${platform}`);
            
            // Create deployment tracking
            const deployment = {
                id: deploymentId,
                projectPath,
                projectName,
                platform,
                status: 'initializing',
                startTime: Date.now(),
                options,
                logs: [],
                url: null
            };
            
            this.activeDeployments.set(deploymentId, deployment);
            this.metrics.deploymentsStarted++;
            
            // Validate project before deployment
            await this._validateProject(projectPath);
            
            // Platform-specific deployment
            let result;
            switch (platform.toLowerCase()) {
                case 'vercel':
                    result = await this._deployToVercel(projectPath, projectName, deployment);
                    break;
                case 'netlify':
                    result = await this._deployToNetlify(projectPath, projectName, deployment);
                    break;
                case 'github-pages':
                    result = await this._deployToGitHubPages(projectPath, projectName, deployment);
                    break;
                default:
                    throw new Error(`Unsupported deployment platform: ${platform}`);
            }
            
            // Update deployment status
            deployment.status = 'completed';
            deployment.endTime = Date.now();
            deployment.duration = deployment.endTime - deployment.startTime;
            deployment.url = result.url;
            deployment.deploymentUrl = result.deploymentUrl;
            deployment.result = result;
            
            // Update metrics
            this.metrics.deploymentsCompleted++;
            this._updateMetrics(deployment);
            
            this.logger.log(`✅ Deployment completed: ${deploymentId}`);
            this.logger.log(`🌐 Live URL: ${result.url}`);
            
            return {
                success: true,
                deploymentId,
                url: result.url,
                deploymentUrl: result.deploymentUrl,
                platform,
                duration: deployment.duration,
                projectName
            };
            
        } catch (error) {
            this.logger.error(`❌ Deployment failed: ${deploymentId}`, error);
            
            const deployment = this.activeDeployments.get(deploymentId);
            if (deployment) {
                deployment.status = 'failed';
                deployment.error = error.message;
                deployment.endTime = Date.now();
                deployment.duration = deployment.endTime - deployment.startTime;
            }
            
            this.metrics.deploymentsFailed++;
            
            return {
                success: false,
                deploymentId,
                error: error.message,
                platform
            };
        } finally {
            // Move to history
            const deployment = this.activeDeployments.get(deploymentId);
            if (deployment) {
                this.deploymentHistory.push(deployment);
                this.activeDeployments.delete(deploymentId);
            }
        }
    }

    /**
     * Deploy to Vercel
     */
    async _deployToVercel(projectPath, projectName, deployment) {
        if (!this.vercelToken) {
            throw new Error('Vercel token not configured. Set VERCEL_TOKEN environment variable.');
        }

        deployment.status = 'building';
        this.logger.log(`📦 Building project for Vercel deployment`);

        // Install Vercel CLI if not available
        await this._ensureVercelCLI();

        // Build the project if needed
        await this._buildProject(projectPath, deployment);

        // Deploy using Vercel CLI
        deployment.status = 'deploying';
        const deployResult = await this._executeVercelDeploy(projectPath, projectName, deployment);

        return {
            url: deployResult.url,
            deploymentUrl: deployResult.deploymentUrl,
            inspectorUrl: deployResult.inspectorUrl,
            platform: 'vercel'
        };
    }

    /**
     * Deploy to Netlify
     */
    async _deployToNetlify(projectPath, projectName, deployment) {
        if (!this.netlifyToken) {
            throw new Error('Netlify token not configured. Set NETLIFY_TOKEN environment variable.');
        }

        deployment.status = 'building';
        this.logger.log(`📦 Building project for Netlify deployment`);

        // Build the project
        await this._buildProject(projectPath, deployment);

        // Deploy using Netlify API
        deployment.status = 'deploying';
        const deployResult = await this._executeNetlifyDeploy(projectPath, projectName, deployment);

        return {
            url: deployResult.url,
            deploymentUrl: deployResult.admin_url,
            platform: 'netlify'
        };
    }

    /**
     * Deploy to GitHub Pages
     */
    async _deployToGitHubPages(projectPath, projectName, deployment) {
        if (!this.githubToken) {
            throw new Error('GitHub token not configured. Set GITHUB_TOKEN environment variable.');
        }

        deployment.status = 'creating-repository';
        this.logger.log(`📦 Creating GitHub repository and deploying to Pages`);

        // Create GitHub repository
        const repo = await this._createGitHubRepository(projectName);

        // Push project to repository
        await this._pushToGitHub(projectPath, repo, deployment);

        // Enable GitHub Pages
        await this._enableGitHubPages(repo.owner.login, repo.name);

        const pagesUrl = `https://${repo.owner.login}.github.io/${repo.name}`;

        return {
            url: pagesUrl,
            deploymentUrl: repo.html_url,
            repository: repo,
            platform: 'github-pages'
        };
    }

    /**
     * Validate project structure before deployment
     */
    async _validateProject(projectPath) {
        // Check if project directory exists
        try {
            await fs.access(projectPath);
        } catch (error) {
            throw new Error(`Project directory not found: ${projectPath}`);
        }

        // Check for main entry file
        const possibleEntryFiles = ['index.html', 'build/index.html', 'dist/index.html', 'public/index.html'];
        let hasEntryFile = false;

        for (const file of possibleEntryFiles) {
            try {
                await fs.access(path.join(projectPath, file));
                hasEntryFile = true;
                break;
            } catch (error) {
                // Continue checking
            }
        }

        if (!hasEntryFile) {
            this.logger.warn('⚠️ No main HTML file found. Deployment may not work correctly.');
        }
    }

    /**
     * Build project if build script exists
     */
    async _buildProject(projectPath, deployment) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            if (packageJson.scripts && packageJson.scripts.build) {
                this.logger.log(`🔨 Running build script`);
                
                // Install dependencies first
                await this._executeCommand('npm', ['install'], projectPath, deployment);
                
                // Run build
                await this._executeCommand('npm', ['run', 'build'], projectPath, deployment);
                
                this.logger.log(`✅ Build completed successfully`);
            }
        } catch (error) {
            this.logger.log('ℹ️ No package.json or build script found, skipping build step');
        }
    }

    /**
     * Execute Vercel deployment
     */
    async _executeVercelDeploy(projectPath, projectName, deployment) {
        return new Promise((resolve, reject) => {
            const args = [
                '--token', this.vercelToken,
                '--name', projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                '--yes'
            ];

            const vercelProcess = spawn('vercel', args, {
                cwd: projectPath,
                env: { ...process.env, VERCEL_TOKEN: this.vercelToken }
            });

            let stdout = '';
            let stderr = '';

            vercelProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                deployment.logs.push({ type: 'stdout', data: output, timestamp: Date.now() });
            });

            vercelProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                deployment.logs.push({ type: 'stderr', data: output, timestamp: Date.now() });
            });

            vercelProcess.on('close', (code) => {
                if (code === 0) {
                    // Extract URL from output
                    const urlMatch = stdout.match(/https:\/\/[^\s]+/);
                    const url = urlMatch ? urlMatch[0] : null;
                    
                    if (url) {
                        resolve({
                            url,
                            deploymentUrl: url,
                            inspectorUrl: `${url}/_inspector`
                        });
                    } else {
                        reject(new Error('Could not extract deployment URL from Vercel output'));
                    }
                } else {
                    reject(new Error(`Vercel deployment failed with exit code ${code}: ${stderr}`));
                }
            });

            vercelProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Execute Netlify deployment
     */
    async _executeNetlifyDeploy(projectPath, projectName, deployment) {
        // Determine build directory
        const buildDir = await this._findBuildDirectory(projectPath);
        
        // Create site
        const siteResponse = await axios.post('https://api.netlify.com/api/v1/sites', {
            name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        }, {
            headers: {
                'Authorization': `Bearer ${this.netlifyToken}`,
                'Content-Type': 'application/json'
            }
        });

        const siteId = siteResponse.data.id;

        // Deploy files
        const files = await this._collectFiles(buildDir);
        const deployResponse = await axios.post(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
            files
        }, {
            headers: {
                'Authorization': `Bearer ${this.netlifyToken}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            url: siteResponse.data.url,
            admin_url: siteResponse.data.admin_url,
            deploy_id: deployResponse.data.id
        };
    }

    /**
     * Create GitHub repository
     */
    async _createGitHubRepository(projectName) {
        const response = await axios.post('https://api.github.com/user/repos', {
            name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            description: `Autonomously generated project: ${projectName}`,
            private: false,
            auto_init: true
        }, {
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        return response.data;
    }

    /**
     * Push project to GitHub
     */
    async _pushToGitHub(projectPath, repo, deployment) {
        // Initialize git if not already done
        await this._executeCommand('git', ['init'], projectPath, deployment);
        await this._executeCommand('git', ['remote', 'add', 'origin', repo.clone_url], projectPath, deployment);
        
        // Add all files
        await this._executeCommand('git', ['add', '.'], projectPath, deployment);
        
        // Commit
        await this._executeCommand('git', ['commit', '-m', 'Initial commit from Coder1ide'], projectPath, deployment);
        
        // Push
        await this._executeCommand('git', ['push', '-u', 'origin', 'main'], projectPath, deployment);
    }

    /**
     * Enable GitHub Pages
     */
    async _enableGitHubPages(owner, repo) {
        await axios.post(`https://api.github.com/repos/${owner}/${repo}/pages`, {
            source: {
                branch: 'main',
                path: '/'
            }
        }, {
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
    }

    /**
     * Execute command with logging
     */
    async _executeCommand(command, args, cwd, deployment) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, { cwd });
            
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (deployment) {
                    deployment.logs.push({ type: 'stdout', data: output, timestamp: Date.now() });
                }
            });

            process.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (deployment) {
                    deployment.logs.push({ type: 'stderr', data: output, timestamp: Date.now() });
                }
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Ensure Vercel CLI is installed
     */
    async _ensureVercelCLI() {
        try {
            await this._executeCommand('vercel', ['--version'], process.cwd());
        } catch (error) {
            this.logger.log('📦 Installing Vercel CLI...');
            await this._executeCommand('npm', ['install', '-g', 'vercel'], process.cwd());
        }
    }

    /**
     * Find build directory
     */
    async _findBuildDirectory(projectPath) {
        const possibleDirs = ['build', 'dist', 'public', '.'];
        
        for (const dir of possibleDirs) {
            const dirPath = path.join(projectPath, dir);
            try {
                const stats = await fs.stat(dirPath);
                if (stats.isDirectory()) {
                    // Check if it has an index.html
                    try {
                        await fs.access(path.join(dirPath, 'index.html'));
                        return dirPath;
                    } catch (error) {
                        // Continue checking
                    }
                }
            } catch (error) {
                // Directory doesn't exist, continue
            }
        }
        
        return projectPath; // Default to project root
    }

    /**
     * Collect files for deployment
     */
    async _collectFiles(directory) {
        const files = {};
        
        async function walkDir(dir, basePath = '') {
            const items = await fs.readdir(dir, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(dir, item.name);
                const relativePath = path.join(basePath, item.name);
                
                if (item.isDirectory()) {
                    await walkDir(itemPath, relativePath);
                } else {
                    const content = await fs.readFile(itemPath, 'base64');
                    files[relativePath] = content;
                }
            }
        }
        
        await walkDir(directory);
        return files;
    }

    /**
     * Get deployment status
     */
    getDeploymentStatus(deploymentId) {
        const activeDeployment = this.activeDeployments.get(deploymentId);
        if (activeDeployment) {
            return { ...activeDeployment, isActive: true };
        }
        
        const historicalDeployment = this.deploymentHistory.find(d => d.id === deploymentId);
        if (historicalDeployment) {
            return { ...historicalDeployment, isActive: false };
        }
        
        return null;
    }

    /**
     * Get all active deployments
     */
    getActiveDeployments() {
        return Array.from(this.activeDeployments.values());
    }

    /**
     * Get deployment history
     */
    getDeploymentHistory(limit = 50) {
        return this.deploymentHistory
            .slice(-limit)
            .sort((a, b) => b.startTime - a.startTime);
    }

    /**
     * Get deployment metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeDeployments: this.activeDeployments.size,
            totalDeployments: this.deploymentHistory.length
        };
    }

    /**
     * Update metrics
     */
    _updateMetrics(deployment) {
        this.metrics.totalDeploymentTime += deployment.duration;
        this.metrics.averageDeploymentTime = this.metrics.totalDeploymentTime / this.metrics.deploymentsCompleted;
    }
}

module.exports = { DeploymentManager };