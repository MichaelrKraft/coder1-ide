/**
 * Project Detection Engine for Claude Code Hooks
 * Analyzes project structure and recommends relevant hook templates
 */

const fs = require('fs');
const path = require('path');

class ProjectDetector {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.detectionResults = null;
    }

    /**
     * Main detection method - analyzes project and returns recommendations
     */
    async detectProject() {
        try {
            const analysis = {
                projectType: await this.detectProjectType(),
                frameworks: await this.detectFrameworks(),
                tools: await this.detectTools(),
                languages: await this.detectLanguages(),
                buildSystems: await this.detectBuildSystems(),
                recommendations: []
            };

            // Generate hook recommendations based on analysis
            analysis.recommendations = this.generateRecommendations(analysis);
            
            this.detectionResults = analysis;
            return analysis;
        } catch (error) {
            console.error('Project detection failed:', error);
            return this.getDefaultRecommendations();
        }
    }

    /**
     * Detect primary project type
     */
    async detectProjectType() {
        const files = await this.getProjectFiles();
        
        // Check for specific project indicators
        if (files.includes('package.json')) {
            const packageJson = await this.readPackageJson();
            if (packageJson?.dependencies?.react) return 'react';
            if (packageJson?.dependencies?.vue) return 'vue';
            if (packageJson?.dependencies?.angular) return 'angular';
            if (packageJson?.dependencies?.next) return 'nextjs';
            if (packageJson?.dependencies?.express) return 'nodejs-backend';
            return 'nodejs';
        }
        
        if (files.includes('requirements.txt') || files.includes('setup.py')) return 'python';
        if (files.includes('Cargo.toml')) return 'rust';
        if (files.includes('go.mod')) return 'go';
        if (files.includes('composer.json')) return 'php';
        if (files.includes('Dockerfile')) return 'docker';
        
        return 'general';
    }

    /**
     * Detect frameworks in use
     */
    async detectFrameworks() {
        const frameworks = [];
        const packageJson = await this.readPackageJson();
        
        if (!packageJson?.dependencies) return frameworks;

        const frameworkMap = {
            'react': 'React',
            'vue': 'Vue.js',
            '@angular/core': 'Angular',
            'next': 'Next.js',
            'express': 'Express.js',
            'fastify': 'Fastify',
            'koa': 'Koa',
            'svelte': 'Svelte',
            'tailwindcss': 'Tailwind CSS',
            'typescript': 'TypeScript',
            'jest': 'Jest',
            'vitest': 'Vitest',
            'cypress': 'Cypress',
            'playwright': 'Playwright'
        };

        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        for (const [dep, name] of Object.entries(frameworkMap)) {
            if (allDeps[dep]) {
                frameworks.push(name);
            }
        }

        return frameworks;
    }

    /**
     * Detect development tools
     */
    async detectTools() {
        const tools = [];
        const files = await this.getProjectFiles();
        const packageJson = await this.readPackageJson();

        // Config file based detection
        const toolConfigs = {
            '.eslintrc.js': 'ESLint',
            '.eslintrc.json': 'ESLint',
            'eslint.config.js': 'ESLint',
            '.prettierrc': 'Prettier',
            '.prettierrc.js': 'Prettier',
            'prettier.config.js': 'Prettier',
            'jest.config.js': 'Jest',
            'cypress.config.js': 'Cypress',
            'playwright.config.js': 'Playwright',
            'vite.config.js': 'Vite',
            'webpack.config.js': 'Webpack',
            'tsconfig.json': 'TypeScript',
            '.gitignore': 'Git',
            'Dockerfile': 'Docker',
            'docker-compose.yml': 'Docker Compose'
        };

        for (const [configFile, tool] of Object.entries(toolConfigs)) {
            if (files.includes(configFile)) {
                tools.push(tool);
            }
        }

        // Package.json script based detection
        if (packageJson?.scripts) {
            const scripts = packageJson.scripts;
            if (scripts.lint || scripts['lint:fix']) tools.push('ESLint');
            if (scripts.format || scripts['format:check']) tools.push('Prettier');
            if (scripts.test) tools.push('Testing Framework');
            if (scripts.build) tools.push('Build System');
            if (scripts.dev || scripts.start) tools.push('Dev Server');
        }

        return [...new Set(tools)]; // Remove duplicates
    }

    /**
     * Detect programming languages
     */
    async detectLanguages() {
        const files = await this.getProjectFiles();
        const languages = [];

        const languageExtensions = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.py': 'Python',
            '.rs': 'Rust',
            '.go': 'Go',
            '.php': 'PHP',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.cs': 'C#',
            '.rb': 'Ruby',
            '.swift': 'Swift',
            '.kt': 'Kotlin'
        };

        for (const file of files) {
            const ext = path.extname(file);
            if (languageExtensions[ext] && !languages.includes(languageExtensions[ext])) {
                languages.push(languageExtensions[ext]);
            }
        }

        return languages;
    }

    /**
     * Detect build systems
     */
    async detectBuildSystems() {
        const files = await this.getProjectFiles();
        const buildSystems = [];

        const buildSystemFiles = {
            'package.json': 'npm/yarn',
            'yarn.lock': 'Yarn',
            'package-lock.json': 'npm',
            'pnpm-lock.yaml': 'pnpm',
            'Makefile': 'Make',
            'Cargo.toml': 'Cargo',
            'go.mod': 'Go Modules',
            'requirements.txt': 'pip',
            'Pipfile': 'Pipenv',
            'poetry.lock': 'Poetry'
        };

        for (const [file, system] of Object.entries(buildSystemFiles)) {
            if (files.includes(file)) {
                buildSystems.push(system);
            }
        }

        return buildSystems;
    }

    /**
     * Generate hook recommendations based on project analysis
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        // Frontend project recommendations
        if (['react', 'vue', 'angular', 'nextjs'].includes(analysis.projectType)) {
            recommendations.push({
                id: 'frontend-quality',
                name: 'Frontend Code Quality Pack',
                description: 'Auto-formatting, linting, and testing for modern frontend development',
                priority: 'high',
                hooks: ['prettier-format', 'eslint-fix', 'test-runner'],
                reason: `Detected ${analysis.projectType} project with frontend frameworks`
            });
        }

        // TypeScript recommendations
        if (analysis.frameworks.includes('TypeScript')) {
            recommendations.push({
                id: 'typescript-validation',
                name: 'TypeScript Validation',
                description: 'Type checking and compilation validation',
                priority: 'high',
                hooks: ['typescript-check', 'tsc-build'],
                reason: 'TypeScript detected in project'
            });
        }

        // Testing framework recommendations
        if (analysis.tools.some(tool => ['Jest', 'Vitest', 'Cypress', 'Playwright'].includes(tool))) {
            recommendations.push({
                id: 'automated-testing',
                name: 'Automated Testing',
                description: 'Run tests automatically after code changes',
                priority: 'medium',
                hooks: ['test-on-edit', 'test-coverage'],
                reason: 'Testing framework detected'
            });
        }

        // Git workflow recommendations
        if (analysis.tools.includes('Git')) {
            recommendations.push({
                id: 'git-workflow',
                name: 'Git Workflow Enhancement',
                description: 'Commit logging, branch protection, and automated checks',
                priority: 'medium',
                hooks: ['commit-logger', 'pre-commit-checks'],
                reason: 'Git repository detected'
            });
        }

        // Node.js backend recommendations
        if (['nodejs', 'nodejs-backend'].includes(analysis.projectType)) {
            recommendations.push({
                id: 'nodejs-backend',
                name: 'Node.js Backend Development',
                description: 'Server restart, API testing, and security scanning',
                priority: 'medium',
                hooks: ['nodemon-restart', 'api-test', 'security-scan'],
                reason: 'Node.js backend project detected'
            });
        }

        // Docker recommendations
        if (analysis.tools.includes('Docker')) {
            recommendations.push({
                id: 'docker-workflow',
                name: 'Docker Development',
                description: 'Container building and deployment automation',
                priority: 'low',
                hooks: ['docker-build', 'docker-test'],
                reason: 'Docker configuration detected'
            });
        }

        // General productivity recommendations
        recommendations.push({
            id: 'productivity-essentials',
            name: 'Productivity Essentials',
            description: 'Notifications, logging, and basic automation',
            priority: 'low',
            hooks: ['command-logger', 'task-notifications'],
            reason: 'Recommended for all projects'
        });

        return recommendations.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Get list of files in project directory
     */
    async getProjectFiles() {
        try {
            const files = fs.readdirSync(this.projectPath);
            return files.filter(file => !file.startsWith('.git') && file !== 'node_modules');
        } catch (error) {
            console.error('Failed to read project files:', error);
            return [];
        }
    }

    /**
     * Read and parse package.json if it exists
     */
    async readPackageJson() {
        try {
            const packagePath = path.join(this.projectPath, 'package.json');
            if (fs.existsSync(packagePath)) {
                const content = fs.readFileSync(packagePath, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('Failed to read package.json:', error);
        }
        return null;
    }

    /**
     * Fallback recommendations when detection fails
     */
    getDefaultRecommendations() {
        return {
            projectType: 'general',
            frameworks: [],
            tools: [],
            languages: [],
            buildSystems: [],
            recommendations: [
                {
                    id: 'basic-productivity',
                    name: 'Basic Productivity Pack',
                    description: 'Essential hooks for any development project',
                    priority: 'medium',
                    hooks: ['command-logger', 'task-notifications', 'prettier-format'],
                    reason: 'Default recommendations for all projects'
                }
            ]
        };
    }

    /**
     * Get cached detection results
     */
    getResults() {
        return this.detectionResults;
    }
}

module.exports = ProjectDetector;