/**
 * GitHub Repository Manager
 * 
 * Handles automatic GitHub repository creation and management for generated projects
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class GitHubManager {
    constructor(options = {}) {
        this.githubToken = options.githubToken || process.env.GITHUB_TOKEN;
        this.username = options.username || process.env.GITHUB_USERNAME;
        this.logger = options.logger || console;
        
        this.isEnabled = !!this.githubToken;
        
        if (!this.githubToken) {
            this.logger.warn('⚠️ GitHub token not configured. GitHub integration disabled.');
        }
        
        // API configuration
        this.apiBase = 'https://api.github.com';
        this.headers = {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Coder1ide-Autonomous-Builder'
        };
        
        // Repository tracking
        this.createdRepositories = [];
        
        // Metrics
        this.metrics = {
            repositoriesCreated: 0,
            repositoriesFailed: 0,
            totalCommits: 0,
            totalPushes: 0
        };
    }

    /**
     * Create a new GitHub repository for the generated project
     */
    async createRepository(projectName, projectPath, options = {}) {
        if (!this.isEnabled) {
            return {
                success: false,
                error: 'GitHub integration not configured',
                repository: null
            };
        }
        
        try {
            this.logger.log(`🐙 Creating GitHub repository: ${projectName}`);
            
            // Sanitize repository name
            const repoName = this._sanitizeRepoName(projectName);
            
            // Repository configuration
            const repoConfig = {
                name: repoName,
                description: options.description || `Autonomously generated project: ${projectName}`,
                private: options.private || false,
                auto_init: false, // We'll push our own content
                gitignore_template: options.gitignoreTemplate || 'Node',
                license_template: options.licenseTemplate || 'mit',
                allow_squash_merge: true,
                allow_merge_commit: true,
                allow_rebase_merge: true,
                delete_branch_on_merge: true,
                has_issues: true,
                has_projects: true,
                has_wiki: true,
                homepage: options.homepage || ''
            };
            
            // Create repository via GitHub API
            const repoResponse = await axios.post(`${this.apiBase}/user/repos`, repoConfig, {
                headers: this.headers
            });
            
            const repository = repoResponse.data;
            this.logger.log(`✅ Repository created: ${repository.html_url}`);
            
            // Initialize local git repository and push content
            await this._initializeAndPushProject(projectPath, repository);
            
            // Set up repository settings
            await this._configureRepositorySettings(repository, options);
            
            // Add topics/tags
            if (options.topics && options.topics.length > 0) {
                await this._addRepositoryTopics(repository, options.topics);
            }
            
            // Update metrics
            this.metrics.repositoriesCreated++;
            this.createdRepositories.push({
                name: repository.name,
                url: repository.html_url,
                cloneUrl: repository.clone_url,
                createdAt: new Date().toISOString(),
                projectPath
            });
            
            return {
                success: true,
                repository: {
                    name: repository.name,
                    fullName: repository.full_name,
                    url: repository.html_url,
                    cloneUrl: repository.clone_url,
                    sshUrl: repository.ssh_url,
                    description: repository.description,
                    private: repository.private,
                    createdAt: repository.created_at,
                    pushedAt: repository.pushed_at
                },
                metrics: {
                    commits: 1, // Initial commit
                    files: await this._countFiles(projectPath)
                }
            };
            
        } catch (error) {
            this.logger.error(`❌ Failed to create repository: ${projectName}`, error);
            this.metrics.repositoriesFailed++;
            
            return {
                success: false,
                error: error.message,
                repository: null
            };
        }
    }

    /**
     * Initialize git repository and push project content
     */
    async _initializeAndPushProject(projectPath, repository) {
        try {
            this.logger.log(`📦 Initializing git repository and pushing content`);
            
            // Initialize git repository
            await this._executeGitCommand(['init'], projectPath);
            
            // Add remote origin
            await this._executeGitCommand(['remote', 'add', 'origin', repository.clone_url], projectPath);
            
            // Create .gitignore if it doesn't exist
            await this._ensureGitignore(projectPath);
            
            // Add all files
            await this._executeGitCommand(['add', '.'], projectPath);
            
            // Create initial commit
            const commitMessage = `🚀 Initial commit - Autonomous project generation by Coder1ide

Project: ${repository.name}
Generated: ${new Date().toISOString()}
Platform: Coder1ide Autonomous Development

Features:
- Autonomous code generation
- AI-powered development
- Production-ready deployment

Built with ❤️ by Coder1ide`;

            await this._executeGitCommand(['commit', '-m', commitMessage], projectPath);
            
            // Set up authentication for push
            const authenticatedUrl = repository.clone_url.replace(
                'https://github.com',
                `https://${this.githubToken}@github.com`
            );
            
            // Update remote URL with authentication
            await this._executeGitCommand(['remote', 'set-url', 'origin', authenticatedUrl], projectPath);
            
            // Push to GitHub
            await this._executeGitCommand(['push', '-u', 'origin', 'main'], projectPath);
            
            this.metrics.totalCommits++;
            this.metrics.totalPushes++;
            
            this.logger.log(`✅ Project pushed to GitHub successfully`);
            
        } catch (error) {
            this.logger.error(`❌ Failed to push project to GitHub:`, error);
            throw error;
        }
    }

    /**
     * Configure repository settings
     */
    async _configureRepositorySettings(repository, options) {
        try {
            // Enable GitHub Pages if requested
            if (options.enablePages) {
                await this._enableGitHubPages(repository);
            }
            
            // Add branch protection rules if requested
            if (options.protectMainBranch) {
                await this._protectMainBranch(repository);
            }
            
            // Create development branch if requested
            if (options.createDevBranch) {
                await this._createDevBranch(repository);
            }
            
        } catch (error) {
            this.logger.warn(`⚠️ Some repository configuration failed:`, error.message);
        }
    }

    /**
     * Enable GitHub Pages
     */
    async _enableGitHubPages(repository) {
        try {
            await axios.post(`${this.apiBase}/repos/${repository.full_name}/pages`, {
                source: {
                    branch: 'main',
                    path: '/'
                }
            }, {
                headers: this.headers
            });
            
            this.logger.log(`🌐 GitHub Pages enabled: https://${repository.owner.login}.github.io/${repository.name}`);
            
        } catch (error) {
            if (error.response && error.response.status === 409) {
                this.logger.log(`ℹ️ GitHub Pages already enabled for ${repository.name}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Protect main branch
     */
    async _protectMainBranch(repository) {
        try {
            await axios.put(`${this.apiBase}/repos/${repository.full_name}/branches/main/protection`, {
                required_status_checks: {
                    strict: true,
                    contexts: []
                },
                enforce_admins: false,
                required_pull_request_reviews: {
                    required_approving_review_count: 1,
                    dismiss_stale_reviews: true
                },
                restrictions: null
            }, {
                headers: this.headers
            });
            
            this.logger.log(`🛡️ Main branch protection enabled`);
            
        } catch (error) {
            this.logger.warn(`⚠️ Could not enable branch protection:`, error.message);
        }
    }

    /**
     * Create development branch
     */
    async _createDevBranch(repository) {
        try {
            // Get main branch SHA
            const mainBranchResponse = await axios.get(`${this.apiBase}/repos/${repository.full_name}/git/refs/heads/main`, {
                headers: this.headers
            });
            
            const mainSha = mainBranchResponse.data.object.sha;
            
            // Create development branch
            await axios.post(`${this.apiBase}/repos/${repository.full_name}/git/refs`, {
                ref: 'refs/heads/development',
                sha: mainSha
            }, {
                headers: this.headers
            });
            
            this.logger.log(`🌿 Development branch created`);
            
        } catch (error) {
            this.logger.warn(`⚠️ Could not create development branch:`, error.message);
        }
    }

    /**
     * Add topics to repository
     */
    async _addRepositoryTopics(repository, topics) {
        try {
            // Sanitize topics (lowercase, no spaces, etc.)
            const sanitizedTopics = topics.map(topic => 
                topic.toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/--+/g, '-')
                    .replace(/^-|-$/g, '')
            ).filter(topic => topic.length > 0);
            
            await axios.put(`${this.apiBase}/repos/${repository.full_name}/topics`, {
                names: ['coder1ide', 'autonomous-development', 'ai-generated', ...sanitizedTopics]
            }, {
                headers: {
                    ...this.headers,
                    'Accept': 'application/vnd.github.mercy-preview+json'
                }
            });
            
            this.logger.log(`🏷️ Topics added to repository`);
            
        } catch (error) {
            this.logger.warn(`⚠️ Could not add topics:`, error.message);
        }
    }

    /**
     * Execute git command
     */
    async _executeGitCommand(args, cwd) {
        return new Promise((resolve, reject) => {
            const gitProcess = spawn('git', args, {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            gitProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            gitProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            gitProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Git command failed: git ${args.join(' ')}\n${stderr}`));
                }
            });
            
            gitProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Ensure .gitignore file exists
     */
    async _ensureGitignore(projectPath) {
        const gitignorePath = path.join(projectPath, '.gitignore');
        
        try {
            await fs.access(gitignorePath);
        } catch (error) {
            // Create default .gitignore
            const defaultGitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
build/
dist/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Temporary files
tmp/
temp/

# Generated by Coder1ide
.coder1ide/`;

            await fs.writeFile(gitignorePath, defaultGitignore, 'utf8');
        }
    }

    /**
     * Count files in project
     */
    async _countFiles(projectPath) {
        let fileCount = 0;
        
        async function countInDir(dirPath) {
            try {
                const items = await fs.readdir(dirPath, { withFileTypes: true });
                
                for (const item of items) {
                    if (item.name.startsWith('.')) continue; // Skip hidden files
                    
                    const itemPath = path.join(dirPath, item.name);
                    
                    if (item.isDirectory()) {
                        await countInDir(itemPath);
                    } else {
                        fileCount++;
                    }
                }
            } catch (error) {
                // Skip inaccessible directories
            }
        }
        
        await countInDir(projectPath);
        return fileCount;
    }

    /**
     * Sanitize repository name for GitHub
     */
    _sanitizeRepoName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9-._]/g, '-')
            .replace(/--+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 100); // GitHub limit
    }

    /**
     * Update repository with new commits
     */
    async updateRepository(repositoryName, projectPath, commitMessage) {
        try {
            this.logger.log(`📤 Updating repository: ${repositoryName}`);
            
            // Add changes
            await this._executeGitCommand(['add', '.'], projectPath);
            
            // Commit changes
            await this._executeGitCommand(['commit', '-m', commitMessage], projectPath);
            
            // Push to GitHub
            await this._executeGitCommand(['push'], projectPath);
            
            this.metrics.totalCommits++;
            this.metrics.totalPushes++;
            
            this.logger.log(`✅ Repository updated successfully`);
            
            return { success: true };
            
        } catch (error) {
            this.logger.error(`❌ Failed to update repository:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get repository information
     */
    async getRepositoryInfo(repositoryName) {
        try {
            const response = await axios.get(`${this.apiBase}/repos/${this.username}/${repositoryName}`, {
                headers: this.headers
            });
            
            return {
                success: true,
                repository: response.data
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List user repositories
     */
    async listRepositories(options = {}) {
        try {
            const params = {
                sort: options.sort || 'created',
                direction: options.direction || 'desc',
                per_page: options.perPage || 30,
                page: options.page || 1
            };
            
            const response = await axios.get(`${this.apiBase}/user/repos`, {
                headers: this.headers,
                params
            });
            
            return {
                success: true,
                repositories: response.data,
                pagination: {
                    page: params.page,
                    perPage: params.per_page,
                    total: response.headers['x-total-count']
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete repository
     */
    async deleteRepository(repositoryName) {
        try {
            await axios.delete(`${this.apiBase}/repos/${this.username}/${repositoryName}`, {
                headers: this.headers
            });
            
            this.logger.log(`🗑️ Repository deleted: ${repositoryName}`);
            
            return { success: true };
            
        } catch (error) {
            this.logger.error(`❌ Failed to delete repository:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get created repositories
     */
    getCreatedRepositories() {
        return this.createdRepositories;
    }

    /**
     * Get GitHub metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            createdRepositories: this.createdRepositories.length
        };
    }
}

module.exports = { GitHubManager };