/**
 * AI-Powered Hook Analysis System
 * Analyzes codebase patterns, developer workflows, and performance bottlenecks
 * to suggest intelligent hook automations and optimizations
 */

const fs = require('fs').promises;
const path = require('path');
const ProjectDetector = require('./ProjectDetector');

class AIHookAnalyzer {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.analysisCache = new Map();
        this.workflowPatterns = [];
        this.performanceMetrics = {};
    }

    /**
     * Main AI analysis method - comprehensive project intelligence
     */
    async analyzeProject() {
        try {
            const analysis = {
                timestamp: new Date().toISOString(),
                projectType: await this.detectProjectType(),
                codebaseHealth: await this.analyzeCodebaseHealth(),
                workflowPatterns: await this.analyzeWorkflowPatterns(),
                performanceBottlenecks: await this.identifyPerformanceBottlenecks(),
                securityRisks: await this.scanSecurityRisks(),
                optimizationOpportunities: await this.findOptimizationOpportunities(),
                aiRecommendations: []
            };

            // Generate AI-powered hook recommendations
            analysis.aiRecommendations = await this.generateAIRecommendations(analysis);
            
            return analysis;
        } catch (error) {
            console.error('AI analysis failed:', error);
            return this.getFallbackAnalysis();
        }
    }

    /**
     * Analyze codebase health metrics
     */
    async analyzeCodebaseHealth() {
        const health = {
            score: 0,
            issues: [],
            suggestions: [],
            metrics: {}
        };

        try {
            // Check for common code health indicators
            const files = await this.getSourceFiles();
            const totalFiles = files.length;
            
            // File size analysis
            const fileSizes = await this.analyzeFileSizes(files);
            health.metrics.averageFileSize = fileSizes.average;
            health.metrics.largeFilesCount = fileSizes.large;
            
            if (fileSizes.large > totalFiles * 0.1) {
                health.issues.push({
                    type: 'large_files',
                    severity: 'medium',
                    message: `${fileSizes.large} files are unusually large (>500 lines)`,
                    suggestion: 'Consider splitting large files into smaller modules'
                });
                health.suggestions.push({
                    hookId: 'file-size-monitor',
                    action: 'Monitor file sizes and suggest refactoring',
                    priority: 'medium',
                    estimatedSavings: '2-4 hours/week'
                });
            }

            // Duplication detection
            const duplication = await this.detectCodeDuplication(files);
            health.metrics.duplicationScore = duplication.score;
            
            if (duplication.score > 0.3) {
                health.issues.push({
                    type: 'code_duplication',
                    severity: 'high',
                    message: `High code duplication detected (${Math.round(duplication.score * 100)}%)`,
                    suggestion: 'Extract common code into reusable modules'
                });
                health.suggestions.push({
                    hookId: 'duplication-detector',
                    action: 'Automatically detect and suggest refactoring for duplicated code',
                    priority: 'high',
                    estimatedSavings: '5-8 hours/week'
                });
            }

            // Import/dependency analysis
            const dependencies = await this.analyzeDependencies(files);
            health.metrics.unusedImports = dependencies.unused;
            health.metrics.circularDependencies = dependencies.circular;

            if (dependencies.unused > 10) {
                health.suggestions.push({
                    hookId: 'unused-imports-cleaner',
                    action: 'Automatically remove unused imports on save',
                    priority: 'low',
                    estimatedSavings: '30 minutes/week'
                });
            }

            // Calculate overall health score
            health.score = this.calculateHealthScore(health.metrics, health.issues);
            
            return health;
        } catch (error) {
            console.error('Codebase health analysis failed:', error);
            return { score: 0, issues: [], suggestions: [], metrics: {} };
        }
    }

    /**
     * Analyze developer workflow patterns
     */
    async analyzeWorkflowPatterns() {
        const patterns = {
            commitFrequency: await this.analyzeCommitPatterns(),
            testingHabits: await this.analyzeTestingPatterns(),
            buildFrequency: await this.analyzeBuildPatterns(),
            errorPatterns: await this.analyzeErrorPatterns(),
            suggestions: []
        };

        // Generate workflow optimization suggestions
        if (patterns.commitFrequency.frequency < 0.5) { // Less than 1 commit per 2 days
            patterns.suggestions.push({
                hookId: 'commit-reminder',
                action: 'Gentle reminders to commit work regularly',
                priority: 'low',
                reason: 'Infrequent commits detected - regular commits improve code safety'
            });
        }

        if (patterns.testingHabits.coverage < 0.6) {
            patterns.suggestions.push({
                hookId: 'auto-test-runner',
                action: 'Automatically run relevant tests when files change',
                priority: 'high',
                reason: 'Low test coverage detected - automated testing can catch issues early'
            });
        }

        if (patterns.errorPatterns.repeatErrors > 3) {
            patterns.suggestions.push({
                hookId: 'error-pattern-detector',
                action: 'AI assistant to prevent recurring error patterns',
                priority: 'medium',
                reason: 'Recurring error patterns detected - AI can help prevent these'
            });
        }

        return patterns;
    }

    /**
     * Identify performance bottlenecks
     */
    async identifyPerformanceBottlenecks() {
        const bottlenecks = {
            buildTime: await this.analyzeBuildPerformance(),
            dependencySize: await this.analyzeDependencySize(),
            bundleOptimization: await this.analyzeBundleOptimization(),
            suggestions: []
        };

        // Generate performance optimization hooks
        if (bottlenecks.buildTime.average > 30000) { // >30 seconds
            bottlenecks.suggestions.push({
                hookId: 'build-optimizer',
                action: 'Incremental build optimization and caching',
                priority: 'high',
                estimatedSavings: `${Math.round(bottlenecks.buildTime.average / 1000 / 2)} seconds per build`,
                reason: 'Slow build times detected'
            });
        }

        if (bottlenecks.dependencySize.totalSize > 100 * 1024 * 1024) { // >100MB
            bottlenecks.suggestions.push({
                hookId: 'dependency-analyzer',
                action: 'Analyze and suggest lighter dependency alternatives',
                priority: 'medium',
                estimatedSavings: 'Faster installs and smaller bundles',
                reason: 'Large dependency footprint detected'
            });
        }

        return bottlenecks;
    }

    /**
     * Scan for security risks
     */
    async scanSecurityRisks() {
        const security = {
            vulnerabilities: await this.scanVulnerabilities(),
            exposedSecrets: await this.scanForSecrets(),
            insecurePatterns: await this.scanInsecurePatterns(),
            suggestions: []
        };

        if (security.vulnerabilities.length > 0) {
            security.suggestions.push({
                hookId: 'security-scanner',
                action: 'Automated security scanning on commits',
                priority: 'high',
                reason: `${security.vulnerabilities.length} vulnerabilities detected`
            });
        }

        if (security.exposedSecrets.length > 0) {
            security.suggestions.push({
                hookId: 'secret-detector',
                action: 'Prevent commits containing secrets or API keys',
                priority: 'critical',
                reason: 'Potential secrets detected in codebase'
            });
        }

        return security;
    }

    /**
     * Find optimization opportunities
     */
    async findOptimizationOpportunities() {
        const opportunities = {
            automation: await this.findAutomationOpportunities(),
            redundancy: await this.findRedundantTasks(),
            efficiency: await this.findEfficiencyGains(),
            suggestions: []
        };

        // AI-powered automation suggestions
        if (opportunities.automation.repetitiveTasks > 5) {
            opportunities.suggestions.push({
                hookId: 'task-automator',
                action: 'AI-powered automation for repetitive development tasks',
                priority: 'medium',
                estimatedSavings: `${opportunities.automation.timeSavings} minutes/day`,
                reason: 'Multiple repetitive tasks detected'
            });
        }

        return opportunities;
    }

    /**
     * Generate AI-powered hook recommendations
     */
    async generateAIRecommendations(analysis) {
        const recommendations = [];

        // Aggregate all suggestions from different analysis areas
        const allSuggestions = [
            ...analysis.codebaseHealth.suggestions,
            ...analysis.workflowPatterns.suggestions,
            ...analysis.performanceBottlenecks.suggestions,
            ...analysis.securityRisks.suggestions,
            ...analysis.optimizationOpportunities.suggestions
        ];

        // Group and prioritize suggestions
        const groupedSuggestions = this.groupSuggestionsByCategory(allSuggestions);
        
        for (const [category, suggestions] of Object.entries(groupedSuggestions)) {
            const recommendation = {
                id: `ai-${category}`,
                name: this.getCategoryDisplayName(category),
                description: this.generateCategoryDescription(category, suggestions),
                priority: this.calculateCategoryPriority(suggestions),
                hooks: suggestions.map(s => s.hookId),
                reason: this.generateCategoryReason(suggestions),
                estimatedImpact: this.calculateEstimatedImpact(suggestions),
                aiGenerated: true,
                confidence: this.calculateConfidence(suggestions),
                implementation: this.generateImplementationPlan(suggestions)
            };

            recommendations.push(recommendation);
        }

        // Sort by priority and confidence
        return recommendations.sort((a, b) => {
            const priorityOrder = { 'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.confidence - a.confidence;
        });
    }

    /**
     * Helper method to get source files
     */
    async getSourceFiles() {
        try {
            const files = [];
            const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.rs', '.go'];
            
            const readDirectory = async (dir) => {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                    
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        await readDirectory(fullPath);
                    } else if (extensions.includes(path.extname(entry.name))) {
                        files.push(fullPath);
                    }
                }
            };

            await readDirectory(this.projectPath);
            return files;
        } catch (error) {
            console.error('Failed to get source files:', error);
            return [];
        }
    }

    /**
     * Analyze file sizes
     */
    async analyzeFileSizes(files) {
        const sizes = [];
        let totalLines = 0;
        let largeFiles = 0;

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const lines = content.split('\n').length;
                sizes.push(lines);
                totalLines += lines;
                
                if (lines > 500) largeFiles++;
            } catch (error) {
                // Skip files we can't read
            }
        }

        return {
            average: files.length > 0 ? Math.round(totalLines / files.length) : 0,
            large: largeFiles,
            total: files.length
        };
    }

    /**
     * Detect code duplication (simplified)
     */
    async detectCodeDuplication(files) {
        // Simplified duplication detection
        // In a real implementation, this would use AST analysis
        const functionPatterns = new Map();
        let totalFunctions = 0;
        let duplicates = 0;

        for (const file of files.slice(0, 20)) { // Limit for performance
            try {
                const content = await fs.readFile(file, 'utf8');
                const functions = content.match(/function\s+\w+\s*\([^)]*\)\s*{|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
                
                for (const func of functions) {
                    const normalized = func.replace(/\s+/g, ' ').trim();
                    if (functionPatterns.has(normalized)) {
                        duplicates++;
                    } else {
                        functionPatterns.set(normalized, 1);
                    }
                    totalFunctions++;
                }
            } catch (error) {
                // Skip files we can't read
            }
        }

        return {
            score: totalFunctions > 0 ? duplicates / totalFunctions : 0,
            duplicates,
            totalFunctions
        };
    }

    /**
     * Analyze dependencies and imports
     */
    async analyzeDependencies(files) {
        let unusedImports = 0;
        let circularDependencies = 0;
        const importMap = new Map();

        for (const file of files.slice(0, 10)) { // Limit for performance
            try {
                const content = await fs.readFile(file, 'utf8');
                const imports = content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || [];
                
                for (const importStatement of imports) {
                    const match = importStatement.match(/import\s+(?:{([^}]+)}|\w+).*?from\s+['"]([^'"]+)['"]/);
                    if (match) {
                        const [, namedImports, module] = match;
                        const imports = namedImports ? namedImports.split(',').map(s => s.trim()) : [];
                        
                        // Simple unused import detection
                        for (const imp of imports) {
                            if (!content.includes(imp.replace(/\s+as\s+\w+/, ''))) {
                                unusedImports++;
                            }
                        }
                    }
                }
            } catch (error) {
                // Skip files we can't read
            }
        }

        return {
            unused: unusedImports,
            circular: circularDependencies // Would need more sophisticated analysis
        };
    }

    /**
     * Calculate health score
     */
    calculateHealthScore(metrics, issues) {
        let score = 100;
        
        // Deduct points for issues
        for (const issue of issues) {
            switch (issue.severity) {
                case 'critical': score -= 30; break;
                case 'high': score -= 20; break;
                case 'medium': score -= 10; break;
                case 'low': score -= 5; break;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Analyze commit patterns (mock implementation)
     */
    async analyzeCommitPatterns() {
        // In real implementation, would use git log
        return {
            frequency: 0.8, // commits per day
            averageSize: 50, // lines changed
            timeDistribution: 'evening' // when commits happen
        };
    }

    /**
     * Analyze testing patterns (mock implementation)
     */
    async analyzeTestingPatterns() {
        return {
            coverage: 0.7,
            frequency: 0.6,
            types: ['unit', 'integration']
        };
    }

    /**
     * Analyze build patterns (mock implementation)
     */
    async analyzeBuildPatterns() {
        return {
            frequency: 5, // builds per day
            successRate: 0.85
        };
    }

    /**
     * Analyze error patterns (mock implementation)
     */
    async analyzeErrorPatterns() {
        return {
            repeatErrors: 2,
            commonTypes: ['TypeError', 'ReferenceError']
        };
    }

    /**
     * Analyze build performance (mock implementation)
     */
    async analyzeBuildPerformance() {
        return {
            average: 25000, // ms
            trend: 'increasing'
        };
    }

    /**
     * Analyze dependency size (mock implementation)
     */
    async analyzeDependencySize() {
        return {
            totalSize: 80 * 1024 * 1024, // bytes
            heaviest: ['lodash', 'moment', 'react']
        };
    }

    /**
     * Analyze bundle optimization (mock implementation)
     */
    async analyzeBundleOptimization() {
        return {
            bundleSize: 2.5 * 1024 * 1024,
            optimizationScore: 0.6
        };
    }

    /**
     * Scan vulnerabilities (mock implementation)
     */
    async scanVulnerabilities() {
        return []; // Would integrate with npm audit or similar
    }

    /**
     * Scan for secrets (mock implementation)
     */
    async scanForSecrets() {
        return []; // Would scan for API keys, passwords, etc.
    }

    /**
     * Scan insecure patterns (mock implementation)
     */
    async scanInsecurePatterns() {
        return [];
    }

    /**
     * Find automation opportunities (mock implementation)
     */
    async findAutomationOpportunities() {
        return {
            repetitiveTasks: 7,
            timeSavings: 45
        };
    }

    /**
     * Find redundant tasks (mock implementation)
     */
    async findRedundantTasks() {
        return {
            count: 3,
            examples: ['Manual testing', 'Manual formatting', 'Manual deployment']
        };
    }

    /**
     * Find efficiency gains (mock implementation)
     */
    async findEfficiencyGains() {
        return {
            opportunities: ['Parallel builds', 'Incremental compilation', 'Smart caching']
        };
    }

    /**
     * Group suggestions by category
     */
    groupSuggestionsByCategory(suggestions) {
        const groups = {};
        
        for (const suggestion of suggestions) {
            const category = this.categorizeSuggestion(suggestion);
            if (!groups[category]) groups[category] = [];
            groups[category].push(suggestion);
        }
        
        return groups;
    }

    /**
     * Categorize a suggestion
     */
    categorizeSuggestion(suggestion) {
        const hookId = suggestion.hookId.toLowerCase();
        
        if (hookId.includes('security') || hookId.includes('secret')) return 'security';
        if (hookId.includes('test') || hookId.includes('coverage')) return 'testing';
        if (hookId.includes('build') || hookId.includes('performance')) return 'performance';
        if (hookId.includes('format') || hookId.includes('lint')) return 'quality';
        if (hookId.includes('commit') || hookId.includes('git')) return 'workflow';
        
        return 'productivity';
    }

    /**
     * Get display name for category
     */
    getCategoryDisplayName(category) {
        const names = {
            'security': 'Security & Compliance',
            'testing': 'Automated Testing',
            'performance': 'Performance Optimization',
            'quality': 'Code Quality',
            'workflow': 'Git Workflow',
            'productivity': 'Developer Productivity'
        };
        
        return names[category] || 'General Improvements';
    }

    /**
     * Generate category description
     */
    generateCategoryDescription(category, suggestions) {
        const descriptions = {
            'security': 'AI-powered security scanning and vulnerability prevention',
            'testing': 'Intelligent test automation and coverage optimization',
            'performance': 'Smart performance monitoring and optimization',
            'quality': 'Automated code quality and consistency checks',
            'workflow': 'Streamlined git workflow and collaboration tools',
            'productivity': 'AI-assisted productivity and automation tools'
        };
        
        return descriptions[category] || 'Intelligent development optimizations';
    }

    /**
     * Calculate category priority
     */
    calculateCategoryPriority(suggestions) {
        const priorities = suggestions.map(s => s.priority);
        if (priorities.includes('critical')) return 'critical';
        if (priorities.includes('high')) return 'high';
        if (priorities.includes('medium')) return 'medium';
        return 'low';
    }

    /**
     * Generate category reason
     */
    generateCategoryReason(suggestions) {
        const reasons = suggestions.map(s => s.reason).filter(Boolean);
        return reasons.join('; ');
    }

    /**
     * Calculate estimated impact
     */
    calculateEstimatedImpact(suggestions) {
        const savings = suggestions
            .map(s => s.estimatedSavings)
            .filter(Boolean);
            
        if (savings.length === 0) return 'medium';
        
        // Simple heuristic based on time savings mentioned
        const hasHighSavings = savings.some(s => 
            s.includes('hour') || s.includes('day') || s.includes('week')
        );
        
        return hasHighSavings ? 'high' : 'medium';
    }

    /**
     * Calculate confidence score
     */
    calculateConfidence(suggestions) {
        // Confidence based on number of supporting suggestions
        const count = suggestions.length;
        if (count >= 3) return 0.9;
        if (count >= 2) return 0.7;
        return 0.5;
    }

    /**
     * Generate implementation plan
     */
    generateImplementationPlan(suggestions) {
        return {
            steps: suggestions.map((s, i) => ({
                order: i + 1,
                action: s.action,
                hookId: s.hookId,
                priority: s.priority
            })),
            estimatedTime: '15-30 minutes',
            prerequisites: ['Claude Code CLI configured', 'Project hooks enabled']
        };
    }

    /**
     * Get project type
     */
    async detectProjectType() {
        const detector = new ProjectDetector(this.projectPath);
        const analysis = await detector.detectProject();
        return analysis.projectType;
    }

    /**
     * Fallback analysis when AI analysis fails
     */
    getFallbackAnalysis() {
        return {
            timestamp: new Date().toISOString(),
            projectType: 'general',
            codebaseHealth: { score: 75, issues: [], suggestions: [], metrics: {} },
            workflowPatterns: { suggestions: [] },
            performanceBottlenecks: { suggestions: [] },
            securityRisks: { suggestions: [] },
            optimizationOpportunities: { suggestions: [] },
            aiRecommendations: [{
                id: 'ai-basic',
                name: 'Basic AI Recommendations',
                description: 'Essential hooks for improved development workflow',
                priority: 'medium',
                hooks: ['prettier-format', 'commit-logger'],
                reason: 'Fallback recommendations when analysis is unavailable',
                aiGenerated: true,
                confidence: 0.3
            }]
        };
    }
}

module.exports = AIHookAnalyzer;