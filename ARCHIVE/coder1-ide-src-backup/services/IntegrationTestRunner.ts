/**
 * Integration Test Runner - Template System Backend API Integration
 * 
 * Provides API routes for the advanced project templates and quick-start system
 */

import { FileMonitoringService, ProjectTemplate, QuickStartConfig } from './FileMonitoringService';

interface TemplateSearchRequest {
    query?: string;
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
    limit?: number;
}

interface QuickStartRequest {
    templateId: string;
    customizations: {
        businessName?: string;
        industry?: string;
        targetAudience?: string;
        primaryGoal?: string;
        timeline?: string;
        budget?: string;
    };
    skipSteps?: string[];
    autoGenerate?: boolean;
}

class IntegrationTestRunner {
    private templateService: FileMonitoringService;

    constructor() {
        this.templateService = new FileMonitoringService();
    }

    /**
     * Get all available templates with filtering
     */
    public async getTemplates(request: TemplateSearchRequest = {}): Promise<{
        success: boolean;
        templates?: ProjectTemplate[];
        categories?: any[];
        error?: string;
    }> {
        try {
            let templates: ProjectTemplate[] = [];

            if (request.query) {
                // Search by query
                templates = this.templateService.searchTemplates(request.query);
            } else if (request.category) {
                // Filter by category
                templates = this.templateService.getTemplatesByCategory(request.category);
            } else if (request.difficulty) {
                // Filter by difficulty
                templates = this.templateService.getTemplatesByDifficulty(request.difficulty);
            } else {
                // Get all templates
                templates = this.templateService.getAllTemplates();
            }

            // Apply additional filtering
            if (request.tags && request.tags.length > 0) {
                templates = templates.filter(template =>
                    request.tags!.some(tag => template.tags.includes(tag))
                );
            }

            // Apply limit
            if (request.limit && request.limit > 0) {
                templates = templates.slice(0, request.limit);
            }

            // Get categories for sidebar
            const categories = this.templateService.getTemplateCategories();

            return {
                success: true,
                templates,
                categories
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get templates: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get popular templates
     */
    public async getPopularTemplates(): Promise<{
        success: boolean;
        templates?: ProjectTemplate[];
        error?: string;
    }> {
        try {
            const templates = this.templateService.getPopularTemplates();
            return { success: true, templates };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get popular templates: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get template by ID
     */
    public async getTemplate(templateId: string): Promise<{
        success: boolean;
        template?: ProjectTemplate;
        error?: string;
    }> {
        try {
            const template = this.templateService.getTemplate(templateId);
            
            if (!template) {
                return { success: false, error: 'Template not found' };
            }

            return { success: true, template };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get template recommendations based on user input
     */
    public async getTemplateRecommendations(userInput: string): Promise<{
        success: boolean;
        recommendations?: ProjectTemplate[];
        error?: string;
    }> {
        try {
            if (!userInput || userInput.trim().length === 0) {
                return { success: false, error: 'User input is required' };
            }

            const recommendations = this.templateService.getTemplateRecommendations(userInput);
            return { success: true, recommendations };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Apply template for quick-start project creation
     */
    public async applyTemplate(request: QuickStartRequest): Promise<{
        success: boolean;
        projectData?: any;
        projectId?: string;
        error?: string;
    }> {
        try {
            const config: QuickStartConfig = {
                templateId: request.templateId,
                customizations: request.customizations,
                skipSteps: request.skipSteps || [],
                autoGenerate: request.autoGenerate || false
            };

            const result = this.templateService.applyTemplate(request.templateId, config);
            
            if (!result.success) {
                return result;
            }

            // Generate project ID
            const projectId = `template-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Enhance project data with additional metadata
            const enhancedProjectData = {
                ...result.projectData,
                id: projectId,
                createdAt: new Date().toISOString(),
                createdFrom: 'template',
                templateApplied: true,
                status: 'template-applied'
            };

            return {
                success: true,
                projectData: enhancedProjectData,
                projectId
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get template categories
     */
    public async getTemplateCategories(): Promise<{
        success: boolean;
        categories?: any[];
        error?: string;
    }> {
        try {
            const categories = this.templateService.getTemplateCategories();
            return { success: true, categories };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Export template
     */
    public async exportTemplate(templateId: string): Promise<{
        success: boolean;
        template?: any;
        filename?: string;
        error?: string;
    }> {
        try {
            const template = this.templateService.exportTemplate(templateId);
            
            if (!template) {
                return { success: false, error: 'Template not found' };
            }

            const filename = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`;

            return {
                success: true,
                template,
                filename
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to export template: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get template statistics
     */
    public async getTemplateStats(): Promise<{
        success: boolean;
        stats?: {
            totalTemplates: number;
            categoriesCount: number;
            popularityAverage: number;
            difficultyDistribution: Record<string, number>;
            categoryDistribution: Record<string, number>;
        };
        error?: string;
    }> {
        try {
            const allTemplates = this.templateService.getAllTemplates();
            const categories = this.templateService.getTemplateCategories();

            const difficultyDistribution = allTemplates.reduce((acc, template) => {
                acc[template.difficulty] = (acc[template.difficulty] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const categoryDistribution = allTemplates.reduce((acc, template) => {
                acc[template.category] = (acc[template.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const popularityAverage = allTemplates.reduce((sum, template) => sum + template.popularity, 0) / allTemplates.length;

            const stats = {
                totalTemplates: allTemplates.length,
                categoriesCount: categories.length,
                popularityAverage: Math.round(popularityAverage),
                difficultyDistribution,
                categoryDistribution
            };

            return { success: true, stats };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get template stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Validate template configuration
     */
    public validateTemplateConfig(config: QuickStartConfig): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if template exists
        const template = this.templateService.getTemplate(config.templateId);
        if (!template) {
            errors.push('Template not found');
            return { isValid: false, errors, warnings };
        }

        // Validate customizations
        const { customizations } = config;
        
        if (customizations.businessName && customizations.businessName.length < 2) {
            errors.push('Business name must be at least 2 characters');
        }

        if (customizations.businessName && customizations.businessName.length > 100) {
            warnings.push('Business name is quite long, consider shortening for better usability');
        }

        if (customizations.targetAudience && customizations.targetAudience.length < 10) {
            warnings.push('Target audience description seems too short for effective personalization');
        }

        // Validate skip steps
        if (config.skipSteps) {
            const validSteps = ['questions', 'consultation', 'wireframes', 'prd'];
            const invalidSteps = config.skipSteps.filter(step => !validSteps.includes(step));
            
            if (invalidSteps.length > 0) {
                errors.push(`Invalid skip steps: ${invalidSteps.join(', ')}`);
            }

            if (config.skipSteps.includes('questions') && config.skipSteps.includes('prd')) {
                warnings.push('Skipping both questions and PRD generation may result in less personalized output');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

export { IntegrationTestRunner, TemplateSearchRequest, QuickStartRequest };