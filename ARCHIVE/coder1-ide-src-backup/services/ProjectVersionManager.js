/**
 * Project Version Manager - Comprehensive versioning and iteration tracking
 * 
 * Tracks all project changes, enables rollback, comparison, and branching
 * for Smart PRD & Wireframe Generator projects
 */

class ProjectVersionManager {
    constructor() {
        this.versions = new Map(); // projectId -> versions[]
        this.currentVersions = new Map(); // projectId -> current versionId
        this.iterationPlans = new Map(); // projectId -> plans[]
        this.versionHistory = new Map(); // versionId -> version
    }

    /**
     * Create initial version for a new project
     */
    createInitialVersion(projectId, initialData, createdBy, title = 'Initial Version') {
        const versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const versionNumber = '1.0.0';

        const version = {
            id: versionId,
            projectId,
            versionNumber,
            title,
            description: 'Initial project creation with base requirements and PRD',
            createdAt: new Date().toISOString(),
            createdBy,
            isCurrentVersion: true,
            branchName: 'main',
            tags: ['initial', 'baseline'],
            changelog: [{
                id: `change-${Date.now()}`,
                section: 'questions',
                changeType: 'added',
                description: 'Created initial project structure and requirements',
                newValue: initialData,
                impact: 'high',
                timestamp: new Date().toISOString()
            }],
            snapshot: initialData,
            metadata: {
                iterationType: 'major',
                confidence: 95,
                approvalStatus: 'approved',
                approvedBy: createdBy,
                approvedAt: new Date().toISOString(),
                size: JSON.stringify(initialData).length,
                checksum: this.calculateChecksum(initialData)
            }
        };

        // Store version
        if (!this.versions.has(projectId)) {
            this.versions.set(projectId, []);
        }
        this.versions.get(projectId).push(version);
        this.currentVersions.set(projectId, versionId);
        this.versionHistory.set(versionId, version);

        return version;
    }

    /**
     * Create new version from changes
     */
    createVersion(projectId, newData, changeDescription, createdBy, iterationType = 'minor', parentVersionId = null) {
        const currentVersionId = parentVersionId || this.currentVersions.get(projectId);
        const currentVersion = currentVersionId ? this.versionHistory.get(currentVersionId) : null;
        
        if (!currentVersion) {
            throw new Error('No current version found for project');
        }

        // Generate version number
        const versionNumber = this.generateVersionNumber(currentVersion.versionNumber, iterationType);
        const versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Analyze changes
        const changelog = this.analyzeChanges(currentVersion.snapshot, newData);

        // Determine confidence based on change impact
        const confidence = this.calculateConfidence(changelog);

        const version = {
            id: versionId,
            projectId,
            versionNumber,
            title: changeDescription,
            description: this.generateChangeDescription(changelog),
            createdAt: new Date().toISOString(),
            createdBy,
            isCurrentVersion: true,
            parentVersionId: currentVersionId,
            branchName: currentVersion.branchName,
            tags: this.generateTags(changelog, iterationType),
            changelog,
            snapshot: newData,
            metadata: {
                iterationType,
                confidence,
                approvalStatus: confidence > 80 ? 'approved' : 'pending',
                size: JSON.stringify(newData).length,
                checksum: this.calculateChecksum(newData)
            }
        };

        // Update current version status
        currentVersion.isCurrentVersion = false;

        // Store new version
        this.versions.get(projectId).push(version);
        this.currentVersions.set(projectId, versionId);
        this.versionHistory.set(versionId, version);

        return version;
    }

    /**
     * Get all versions for a project
     */
    getProjectVersions(projectId) {
        return this.versions.get(projectId) || [];
    }

    /**
     * Get current version for a project
     */
    getCurrentVersion(projectId) {
        const currentVersionId = this.currentVersions.get(projectId);
        return currentVersionId ? this.versionHistory.get(currentVersionId) || null : null;
    }

    /**
     * Get specific version by ID
     */
    getVersion(versionId) {
        return this.versionHistory.get(versionId) || null;
    }

    /**
     * Rollback to a specific version
     */
    rollbackToVersion(projectId, targetVersionId, rollbackBy) {
        const targetVersion = this.versionHistory.get(targetVersionId);
        if (!targetVersion || targetVersion.projectId !== projectId) {
            return { success: false, error: 'Target version not found' };
        }

        try {
            const newVersion = this.createVersion(
                projectId,
                targetVersion.snapshot,
                `Rollback to version ${targetVersion.versionNumber}`,
                rollbackBy,
                'patch'
            );

            newVersion.tags.push('rollback');
            newVersion.metadata.approvalStatus = 'pending'; // Require approval for rollbacks

            return { success: true, newVersion };
        } catch (error) {
            return { 
                success: false, 
                error: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }

    /**
     * Create a new branch from a version
     */
    createBranch(versionId, branchName, createdBy, description = null) {
        const sourceVersion = this.versionHistory.get(versionId);
        if (!sourceVersion) return null;

        const branchVersionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const branchVersion = {
            ...sourceVersion,
            id: branchVersionId,
            versionNumber: `${sourceVersion.versionNumber}-${branchName}`,
            title: `Branch: ${branchName}`,
            description: description || `New branch created from ${sourceVersion.versionNumber}`,
            createdAt: new Date().toISOString(),
            createdBy,
            isCurrentVersion: false,
            parentVersionId: versionId,
            branchName,
            tags: [...sourceVersion.tags, 'branch', branchName],
            changelog: [{
                id: `change-${Date.now()}`,
                section: 'settings',
                changeType: 'added',
                description: `Created branch '${branchName}' from version ${sourceVersion.versionNumber}`,
                impact: 'low',
                timestamp: new Date().toISOString()
            }],
            metadata: {
                ...sourceVersion.metadata,
                iterationType: 'branch'
            }
        };

        // Store branch version
        this.versions.get(sourceVersion.projectId).push(branchVersion);
        this.versionHistory.set(branchVersionId, branchVersion);

        return branchVersion;
    }

    /**
     * Compare two versions
     */
    compareVersions(versionAId, versionBId) {
        const versionA = this.versionHistory.get(versionAId);
        const versionB = this.versionHistory.get(versionBId);
        
        if (!versionA || !versionB) return null;

        const differences = this.analyzeVersionDifferences(versionA, versionB);
        const compatibility = this.assessCompatibility(versionA, versionB);
        const statistics = this.calculateComparisonStatistics(differences);

        return {
            versionA,
            versionB,
            differences,
            compatibility,
            statistics
        };
    }

    /**
     * Create iteration plan
     */
    createIterationPlan(projectId, title, description, targetVersion, plannedChanges, timeline) {
        const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const plan = {
            id: planId,
            projectId,
            title,
            description,
            targetVersion,
            plannedChanges,
            timeline,
            resources: {
                estimatedHours: plannedChanges.reduce((sum, change) => sum + (change.estimatedEffort || 0), 0),
                requiredSkills: [...new Set(plannedChanges.flatMap(change => this.inferRequiredSkills(change)))],
                assignedTeam: []
            },
            success_criteria: this.generateSuccessCriteria(plannedChanges),
            risks: this.identifyIterationRisks(plannedChanges),
            status: 'planning'
        };

        if (!this.iterationPlans.has(projectId)) {
            this.iterationPlans.set(projectId, []);
        }
        this.iterationPlans.get(projectId).push(plan);

        return plan;
    }

    /**
     * Get iteration plans for a project
     */
    getIterationPlans(projectId) {
        return this.iterationPlans.get(projectId) || [];
    }

    /**
     * Update iteration plan status
     */
    updateIterationStatus(planId, status, completedMilestones = []) {
        for (const plans of this.iterationPlans.values()) {
            const plan = plans.find(p => p.id === planId);
            if (plan) {
                plan.status = status;
                
                if (completedMilestones.length > 0 && plan.timeline.milestones) {
                    plan.timeline.milestones.forEach(milestone => {
                        if (completedMilestones.includes(milestone.id)) {
                            milestone.status = 'completed';
                        }
                    });
                }
                
                return true;
            }
        }
        return false;
    }

    /**
     * Get version history tree for visualization
     */
    getVersionTree(projectId) {
        const versions = this.getProjectVersions(projectId);
        const tree = { nodes: [], edges: [] };

        versions.forEach(version => {
            tree.nodes.push({
                id: version.id,
                label: version.versionNumber,
                title: version.title,
                branch: version.branchName,
                isCurrentVersion: version.isCurrentVersion,
                createdAt: version.createdAt,
                iterationType: version.metadata.iterationType
            });

            if (version.parentVersionId) {
                tree.edges.push({
                    from: version.parentVersionId,
                    to: version.id,
                    type: version.metadata.iterationType
                });
            }
        });

        return tree;
    }

    // Private helper methods

    generateVersionNumber(currentVersion, iterationType) {
        const [major, minor, patch] = currentVersion.split('.').map(Number);

        switch (iterationType) {
            case 'major':
                return `${major + 1}.0.0`;
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'patch':
                return `${major}.${minor}.${patch + 1}`;
            case 'branch':
                return `${major}.${minor}.${patch}`;
            default:
                return `${major}.${minor}.${patch + 1}`;
        }
    }

    analyzeChanges(oldData, newData) {
        const changes = [];
        const timestamp = new Date().toISOString();

        // Compare each section
        Object.keys(oldData).forEach(section => {
            const oldValue = oldData[section];
            const newValue = newData[section];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                const changeType = this.determineChangeType(oldValue, newValue);
                const impact = this.assessChangeImpact(section, changeType);

                changes.push({
                    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    section,
                    changeType,
                    description: this.generateSingleChangeDescription(section, changeType, impact),
                    oldValue,
                    newValue,
                    impact,
                    timestamp
                });
            }
        });

        return changes;
    }

    determineChangeType(oldValue, newValue) {
        if (!oldValue && newValue) return 'added';
        if (oldValue && !newValue) return 'removed';
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            if (oldValue.length !== newValue.length) return 'modified';
            return JSON.stringify(oldValue) === JSON.stringify(newValue) ? 'modified' : 'reordered';
        }
        return 'modified';
    }

    assessChangeImpact(section, changeType) {
        const highImpactSections = ['questions', 'prd'];
        const highImpactChanges = ['removed', 'added'];

        if (highImpactSections.includes(section) && highImpactChanges.includes(changeType)) {
            return 'high';
        }
        if (changeType === 'modified') {
            return 'medium';
        }
        return 'low';
    }

    calculateConfidence(changelog) {
        let baseConfidence = 100;
        
        changelog.forEach(change => {
            switch (change.impact) {
                case 'high':
                    baseConfidence -= 15;
                    break;
                case 'medium':
                    baseConfidence -= 5;
                    break;
                case 'low':
                    baseConfidence -= 1;
                    break;
            }
        });

        return Math.max(0, Math.min(100, baseConfidence));
    }

    generateTags(changelog, iterationType) {
        const tags = [iterationType];
        
        changelog.forEach(change => {
            if (change.impact === 'high') tags.push('breaking-change');
            if (change.section === 'prd') tags.push('documentation');
            if (change.section === 'wireframes') tags.push('design');
        });

        return [...new Set(tags)];
    }

    generateChangeDescription(changelog) {
        const summaries = changelog.map(change => 
            `${change.changeType} ${change.section} (${change.impact} impact)`
        );
        return `Updated project with ${summaries.length} changes: ${summaries.join(', ')}`;
    }

    generateSingleChangeDescription(section, changeType, impact) {
        return `${changeType} ${section} (${impact} impact)`;
    }

    calculateChecksum(data) {
        const dataString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    analyzeVersionDifferences(versionA, versionB) {
        // Mock implementation for MVP
        return [
            {
                section: 'questions',
                changes: [],
                summary: 'Questions section updated',
                impact: 'minor'
            }
        ];
    }

    assessCompatibility(versionA, versionB) {
        return {
            isBackwardCompatible: true,
            migrationRequired: false,
            riskLevel: 'low',
            recommendations: ['Test thoroughly before deployment']
        };
    }

    calculateComparisonStatistics(differences) {
        return {
            totalChanges: differences.length,
            addedItems: 0,
            modifiedItems: differences.length,
            removedItems: 0,
            linesChanged: differences.length * 5 // Mock calculation
        };
    }

    inferRequiredSkills(change) {
        const skillMap = {
            'prd': ['technical-writing', 'product-management'],
            'wireframes': ['ux-design', 'prototyping'],
            'consultation': ['business-analysis', 'stakeholder-management']
        };
        return skillMap[change.section] || ['general'];
    }

    generateSuccessCriteria(changes) {
        return [
            'All planned changes implemented successfully',
            'No regression in existing functionality',
            'Documentation updated and accurate',
            'Stakeholder approval obtained'
        ];
    }

    identifyIterationRisks(changes) {
        const risks = [];
        
        if (changes.some(c => c.priority === 'high')) {
            risks.push({
                id: 'high-priority-risk',
                description: 'High priority changes may introduce breaking changes',
                probability: 'medium',
                impact: 'high',
                mitigation: 'Thorough testing and staged rollout',
                contingency: 'Rollback plan prepared'
            });
        }

        return risks;
    }
}

module.exports = { ProjectVersionManager };