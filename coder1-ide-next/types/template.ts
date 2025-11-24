/**
 * Template System Type Definitions
 * 
 * Defines types for the SaaS template recommendation and customization system.
 */

/**
 * Template Category
 * Categorizes templates by their primary focus and tech stack
 */
export type TemplateCategory = 
  | 'enterprise'    // Enterprise-focused with SSO, audit logs, compliance
  | 'modern-js'     // Modern JavaScript/TypeScript stacks (Next.js, Nuxt, etc.)
  | 'python'        // Python-based (Django, FastAPI, Flask)
  | 'specialized';  // Specialized use cases (browser extensions, mobile, etc.)

/**
 * Difficulty Level
 * Indicates setup complexity and required expertise
 */
export type DifficultyLevel = 
  | 'beginner'      // Simple setup, well-documented, few dependencies
  | 'intermediate'  // Moderate complexity, some configuration required
  | 'advanced';     // Complex setup, deep technical knowledge needed

/**
 * Project Type
 * Matches the projectType from DetailedRequirements
 */
export type ProjectType = 
  | 'web-application'
  | 'api'
  | 'dashboard'
  | 'mobile-app'
  | 'cli-tool'
  | 'library'
  | 'full-stack';

/**
 * Tech Stack Configuration
 * Specific technologies used in the template
 */
export interface TechStack {
  frontend?: string;      // e.g., "Next.js", "React", "Vue", "Svelte"
  backend?: string;       // e.g., "Express", "Django", "FastAPI", "Rails"
  database?: string;      // e.g., "PostgreSQL", "MongoDB", "MySQL", "Supabase"
  auth?: string;          // e.g., "NextAuth", "Clerk", "Supabase Auth", "Auth0"
  payments?: string;      // e.g., "Stripe", "Lemon Squeezy", "Paddle"
  hosting?: string;       // e.g., "Vercel", "Netlify", "AWS", "Railway"
  styling?: string;       // e.g., "Tailwind CSS", "styled-components", "CSS Modules"
  testing?: string;       // e.g., "Jest", "Vitest", "Playwright", "Cypress"
}

/**
 * Compatibility Configuration
 * Used for matching templates to user requirements
 */
export interface CompatibilityConfig {
  projectTypes: ProjectType[];  // Compatible project types
  keywords: string[];            // Keywords for matching (lowercase)
  excludeKeywords?: string[];    // Anti-patterns (incompatible use cases)
}

/**
 * Template Metadata
 * Additional information about the template
 */
export interface TemplateMetadata {
  stars?: number;          // GitHub stars
  forks?: number;          // GitHub forks
  lastUpdated?: string;    // ISO date of last commit
  license?: string;        // License type (MIT, Apache, etc.)
  language?: string;       // Primary language
  contributors?: number;   // Number of contributors
  openIssues?: number;     // Number of open issues
  isActive?: boolean;      // Is actively maintained?
}

/**
 * Template Interface
 * Complete definition of a SaaS template
 */
export interface Template {
  // Identity
  id: string;                           // Unique slug (e.g., "boxyhq-saas-starter")
  name: string;                         // Display name
  description: string;                  // Concise description (1-2 sentences)
  category: TemplateCategory;           // Template category
  
  // Technical Details
  techStack: TechStack;                 // Technologies used
  features: string[];                   // List of included features
  
  // Links
  githubUrl: string;                    // GitHub repository URL
  docsUrl?: string;                     // Documentation URL
  demoUrl?: string;                     // Live demo URL
  
  // Compatibility
  compatibility: CompatibilityConfig;   // Matching configuration
  estimatedSetupTime: string;           // e.g., "30 minutes", "1-2 hours"
  difficultyLevel: DifficultyLevel;     // Setup difficulty
  
  // Metadata
  metadata?: TemplateMetadata;          // Additional repository info
}

/**
 * Template Recommendation
 * Template with computed compatibility score
 */
export interface TemplateRecommendation {
  template: Template;                   // The template
  compatibilityScore: number;           // Score 0-100
  matchReasons: string[];               // Why it was recommended
  missingFeatures?: string[];           // Features user wants but template lacks
}

/**
 * Template Catalog
 * Collection of all available templates
 */
export interface TemplateCatalog {
  version: string;                      // Catalog version
  lastUpdated: string;                  // ISO date
  templates: Template[];                // All templates
}

/**
 * Template Customization Request
 * Input for template customization
 */
export interface TemplateCustomizationRequest {
  templateId: string;                   // Template to customize
  projectName: string;                  // User's project name
  targetDirectory: string;              // Where to create project
  requirements: {                       // User requirements
    features: string[];
    techStack?: Partial<TechStack>;
    removeFeatures?: string[];
  };
  options?: {                           // Additional options
    skipGitInit?: boolean;
    skipInstall?: boolean;
    generateEnvExample?: boolean;
  };
}

/**
 * Template Customization Result
 * Output from template customization
 */
export interface TemplateCustomizationResult {
  success: boolean;                     // Did customization succeed?
  projectPath: string;                  // Path to customized project
  summary: string;                      // Markdown summary of changes
  filesModified: string[];              // List of modified files
  filesCreated: string[];               // List of created files
  filesRemoved: string[];               // List of removed files
  nextSteps: string[];                  // What user should do next
  errors?: string[];                    // Any errors encountered
}

/**
 * Template Recommendation Request
 * Input for recommendation API
 */
export interface TemplateRecommendationRequest {
  requirements: {
    projectType?: string;
    features: string[];
    targetAudience?: string;
    techStack?: Partial<TechStack>;
    scope?: 'mvp' | 'full-featured' | 'prototype';
    initialRequest?: string;
  };
  limit?: number;                       // Max recommendations to return
  minCompatibilityScore?: number;       // Minimum score threshold
}

/**
 * Template Recommendation Response
 * Output from recommendation API
 */
export interface TemplateRecommendationResponse {
  success: boolean;
  templates: TemplateRecommendation[];  // Recommended templates
  totalCount: number;                   // Total templates evaluated
  averageScore?: number;                // Average compatibility score
  processingTime?: number;              // Time taken in ms
}

/**
 * Template Filter Options
 * Options for filtering template catalog
 */
export interface TemplateFilterOptions {
  category?: TemplateCategory;
  difficultyLevel?: DifficultyLevel;
  techStack?: Partial<TechStack>;
  minStars?: number;
  activeOnly?: boolean;
  keywords?: string[];
}
