/**
 * Page Composer Service - Phase 2.2 Enhancement
 * Orchestrates multi-component workflows for generating complete page sections
 */

import magicUIService, { MagicComponent, MagicGenerationOptions } from './MagicUIService';
import contextAnalyzer, { ContextInsights } from './ContextAnalyzer';

interface PageSection {
  id: string;
  name: string;
  description: string;
  components: ComponentSpec[];
  layout: LayoutSpec;
  theme?: ThemeSpec;
}

interface ComponentSpec {
  id: string;
  type: string;
  prompt: string;
  position: Position;
  props?: Record<string, any>;
  dependencies?: string[];
}

interface Position {
  row: number;
  column: number;
  width: number;
  height: number;
}

interface LayoutSpec {
  type: 'grid' | 'flex' | 'absolute';
  columns?: number;
  rows?: number;
  gap?: string;
  padding?: string;
}

interface ThemeSpec {
  primaryColor?: string;
  secondaryColor?: string;
  style?: 'modern' | 'minimal' | 'corporate' | 'creative';
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  sections: PageSection[];
  category: 'landing' | 'dashboard' | 'ecommerce' | 'portfolio' | 'blog';
}

interface GeneratedPage {
  success: boolean;
  sections: GeneratedSection[];
  fullPageCode: string;
  metadata: PageMetadata;
}

interface GeneratedSection {
  sectionId: string;
  name: string;
  components: MagicComponent[];
  layoutCode: string;
  combinedCode: string;
}

interface PageMetadata {
  template?: string;
  componentCount: number;
  generatedAt: string;
  contextScore?: number;
  appliedTheme?: string;
}

class PageComposer {
  private templates: Map<string, PageTemplate> = new Map();
  private contextInsights: ContextInsights | null = null;

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize page templates
   */
  private initializeTemplates() {
    // Landing Page Template
    this.templates.set('landing-startup', {
      id: 'landing-startup',
      name: 'Startup Landing Page',
      description: 'Modern landing page with hero, features, pricing, and CTA',
      category: 'landing',
      sections: [
        {
          id: 'hero',
          name: 'Hero Section',
          description: 'Eye-catching hero with headline and CTA',
          components: [
            {
              id: 'hero-main',
              type: 'hero',
              prompt: 'modern hero section with gradient background and animated elements',
              position: { row: 0, column: 0, width: 12, height: 1 }
            }
          ],
          layout: { type: 'flex', columns: 1 }
        },
        {
          id: 'features',
          name: 'Features Section',
          description: 'Key features in a grid layout',
          components: [
            {
              id: 'feature-1',
              type: 'card',
              prompt: 'feature card with icon and description for "Fast Performance"',
              position: { row: 0, column: 0, width: 4, height: 1 }
            },
            {
              id: 'feature-2',
              type: 'card',
              prompt: 'feature card with icon and description for "Secure & Reliable"',
              position: { row: 0, column: 4, width: 4, height: 1 }
            },
            {
              id: 'feature-3',
              type: 'card',
              prompt: 'feature card with icon and description for "Easy Integration"',
              position: { row: 0, column: 8, width: 4, height: 1 }
            }
          ],
          layout: { type: 'grid', columns: 3, gap: '2rem', padding: '4rem 2rem' }
        },
        {
          id: 'pricing',
          name: 'Pricing Section',
          description: 'Tiered pricing plans',
          components: [
            {
              id: 'pricing-table',
              type: 'pricing',
              prompt: 'modern pricing table with 3 tiers for SaaS startup',
              position: { row: 0, column: 0, width: 12, height: 1 }
            }
          ],
          layout: { type: 'flex', columns: 1, padding: '4rem 2rem' }
        },
        {
          id: 'cta',
          name: 'Call to Action',
          description: 'Final CTA section',
          components: [
            {
              id: 'cta-banner',
              type: 'banner',
              prompt: 'CTA banner with "Start Your Free Trial" message and email signup',
              position: { row: 0, column: 0, width: 12, height: 1 }
            }
          ],
          layout: { type: 'flex', columns: 1, padding: '4rem 2rem' }
        }
      ]
    });

    // Dashboard Template
    this.templates.set('dashboard-analytics', {
      id: 'dashboard-analytics',
      name: 'Analytics Dashboard',
      description: 'Data dashboard with charts, metrics, and tables',
      category: 'dashboard',
      sections: [
        {
          id: 'header',
          name: 'Dashboard Header',
          description: 'Navigation and user info',
          components: [
            {
              id: 'nav-bar',
              type: 'navigation',
              prompt: 'dashboard navigation bar with logo, menu items, and user avatar',
              position: { row: 0, column: 0, width: 12, height: 1 }
            }
          ],
          layout: { type: 'flex', columns: 1 }
        },
        {
          id: 'metrics',
          name: 'Key Metrics',
          description: 'Important KPI cards',
          components: [
            {
              id: 'metric-revenue',
              type: 'metric-card',
              prompt: 'metric card showing revenue with trend indicator',
              position: { row: 0, column: 0, width: 3, height: 1 }
            },
            {
              id: 'metric-users',
              type: 'metric-card',
              prompt: 'metric card showing active users with percentage change',
              position: { row: 0, column: 3, width: 3, height: 1 }
            },
            {
              id: 'metric-conversion',
              type: 'metric-card',
              prompt: 'metric card showing conversion rate with chart',
              position: { row: 0, column: 6, width: 3, height: 1 }
            },
            {
              id: 'metric-satisfaction',
              type: 'metric-card',
              prompt: 'metric card showing customer satisfaction score',
              position: { row: 0, column: 9, width: 3, height: 1 }
            }
          ],
          layout: { type: 'grid', columns: 4, gap: '1.5rem', padding: '2rem' }
        },
        {
          id: 'charts',
          name: 'Data Visualization',
          description: 'Charts and graphs',
          components: [
            {
              id: 'chart-line',
              type: 'chart',
              prompt: 'line chart component showing revenue over time',
              position: { row: 0, column: 0, width: 8, height: 1 }
            },
            {
              id: 'chart-pie',
              type: 'chart',
              prompt: 'pie chart showing traffic sources distribution',
              position: { row: 0, column: 8, width: 4, height: 1 }
            }
          ],
          layout: { type: 'grid', columns: 12, gap: '1.5rem', padding: '2rem' }
        }
      ]
    });

    // E-commerce Template
    this.templates.set('ecommerce-products', {
      id: 'ecommerce-products',
      name: 'Product Showcase',
      description: 'E-commerce product listing with filters',
      category: 'ecommerce',
      sections: [
        {
          id: 'filters',
          name: 'Filter Sidebar',
          description: 'Product filtering options',
          components: [
            {
              id: 'filter-panel',
              type: 'filter',
              prompt: 'product filter sidebar with categories, price range, and ratings',
              position: { row: 0, column: 0, width: 3, height: 1 }
            }
          ],
          layout: { type: 'flex', columns: 1 }
        },
        {
          id: 'products',
          name: 'Product Grid',
          description: 'Product cards in grid',
          components: [
            {
              id: 'product-1',
              type: 'product-card',
              prompt: 'product card with image, title, price, and add to cart button',
              position: { row: 0, column: 0, width: 3, height: 1 }
            },
            {
              id: 'product-2',
              type: 'product-card',
              prompt: 'product card with sale badge and discount price',
              position: { row: 0, column: 3, width: 3, height: 1 }
            },
            {
              id: 'product-3',
              type: 'product-card',
              prompt: 'product card with "new arrival" label',
              position: { row: 0, column: 6, width: 3, height: 1 }
            },
            {
              id: 'product-4',
              type: 'product-card',
              prompt: 'product card with customer rating stars',
              position: { row: 0, column: 9, width: 3, height: 1 }
            }
          ],
          layout: { type: 'grid', columns: 4, gap: '2rem', padding: '2rem' }
        }
      ]
    });

    console.log('✅ Page templates initialized:', this.templates.size);
  }

  /**
   * Generate a complete page from a template
   */
  async generatePage(
    templateId: string,
    customizations?: {
      theme?: ThemeSpec;
      sectionOverrides?: Record<string, Partial<PageSection>>;
    },
    onProgress?: (message: string, progress: number) => void
  ): Promise<GeneratedPage> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template '${templateId}' not found`);
      }

      onProgress?.(`Starting page generation: ${template.name}`, 0);

      // Get context insights
      this.contextInsights = await contextAnalyzer.getOrAnalyzeContext();

      const generatedSections: GeneratedSection[] = [];
      const totalSections = template.sections.length;
      let sectionIndex = 0;

      // Generate each section
      for (const section of template.sections) {
        onProgress?.(
          `Generating ${section.name}...`,
          (sectionIndex / totalSections) * 100
        );

        const generatedSection = await this.generateSection(
          section,
          customizations?.theme,
          customizations?.sectionOverrides?.[section.id]
        );

        generatedSections.push(generatedSection);
        sectionIndex++;
      }

      onProgress?.('Combining page components...', 90);

      // Combine all sections into full page
      const fullPageCode = this.combinePageSections(
        generatedSections,
        template,
        customizations?.theme
      );

      onProgress?.('Page generation complete!', 100);

      return {
        success: true,
        sections: generatedSections,
        fullPageCode,
        metadata: {
          template: templateId,
          componentCount: generatedSections.reduce((acc, s) => acc + s.components.length, 0),
          generatedAt: new Date().toISOString(),
          contextScore: this.contextInsights?.recommendations.compatibilityScore,
          appliedTheme: customizations?.theme?.style
        }
      };
    } catch (error) {
      console.error('Page generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a single section with its components
   */
  private async generateSection(
    section: PageSection,
    theme?: ThemeSpec,
    overrides?: Partial<PageSection>
  ): Promise<GeneratedSection> {
    const mergedSection = { ...section, ...overrides };
    const components: MagicComponent[] = [];

    // Generate each component in the section
    for (const spec of mergedSection.components) {
      const component = await this.generateComponent(spec, theme);
      components.push(component);
    }

    // Generate layout code
    const layoutCode = this.generateLayoutCode(mergedSection.layout, components, mergedSection);

    // Combine components into section
    const combinedCode = this.combineSectionComponents(components, layoutCode, mergedSection);

    return {
      sectionId: mergedSection.id,
      name: mergedSection.name,
      components,
      layoutCode,
      combinedCode
    };
  }

  /**
   * Generate a single component
   */
  private async generateComponent(
    spec: ComponentSpec,
    theme?: ThemeSpec
  ): Promise<MagicComponent> {
    let prompt = spec.prompt;

    // Apply theme to prompt if specified
    if (theme) {
      prompt = this.applyThemeToPrompt(prompt, theme);
    }

    const options: MagicGenerationOptions = {
      message: prompt,
      searchQuery: spec.type
    };

    // Generate component with context awareness
    const component = await magicUIService.generateComponent(options);
    
    // Add position metadata
    if (component.metadata) {
      component.metadata.componentType = spec.type;
    }

    return component;
  }

  /**
   * Apply theme modifications to component prompt
   */
  private applyThemeToPrompt(prompt: string, theme: ThemeSpec): string {
    let themedPrompt = prompt;

    if (theme.style) {
      themedPrompt = `${prompt} with ${theme.style} style`;
    }

    if (theme.primaryColor) {
      themedPrompt += ` using ${theme.primaryColor} as primary color`;
    }

    if (theme.secondaryColor) {
      themedPrompt += ` and ${theme.secondaryColor} as secondary color`;
    }

    return themedPrompt;
  }

  /**
   * Generate layout code for a section
   */
  private generateLayoutCode(
    layout: LayoutSpec,
    components: MagicComponent[],
    section: PageSection
  ): string {
    const { type, columns = 1, rows = 1, gap = '1rem', padding = '2rem' } = layout;

    if (type === 'grid') {
      return `
const ${section.id}Layout = ({ children }) => {
  return (
    <div className="grid grid-cols-${columns} gap-${gap.replace('rem', '')} p-${padding.replace('rem', '')}" id="${section.id}">
      {children}
    </div>
  );
};`;
    } else if (type === 'flex') {
      return `
const ${section.id}Layout = ({ children }) => {
  return (
    <div className="flex flex-col gap-${gap.replace('rem', '')} p-${padding.replace('rem', '')}" id="${section.id}">
      {children}
    </div>
  );
};`;
    } else {
      return `
const ${section.id}Layout = ({ children }) => {
  return (
    <div className="relative p-${padding.replace('rem', '')}" id="${section.id}">
      {children}
    </div>
  );
};`;
    }
  }

  /**
   * Combine components into a section
   */
  private combineSectionComponents(
    components: MagicComponent[],
    layoutCode: string,
    section: PageSection
  ): string {
    const componentImports = components
      .map(c => `// ${c.name} component code here`)
      .join('\n');

    const componentUsage = components
      .map(c => `      <${c.name} />`)
      .join('\n');

    return `
// Section: ${section.name}
${componentImports}

${layoutCode}

const ${section.id}Section = () => {
  return (
    <${section.id}Layout>
${componentUsage}
    </${section.id}Layout>
  );
};

export default ${section.id}Section;`;
  }

  /**
   * Combine all sections into a full page
   */
  private combinePageSections(
    sections: GeneratedSection[],
    template: PageTemplate,
    theme?: ThemeSpec
  ): string {
    const imports = sections
      .map(s => `import ${s.sectionId}Section from './${s.sectionId}';`)
      .join('\n');

    const sectionUsage = sections
      .map(s => `      <${s.sectionId}Section />`)
      .join('\n');

    return `import React from 'react';
${imports}

const ${template.name.replace(/\s+/g, '')}Page = () => {
  return (
    <div className="min-h-screen ${theme?.style ? `theme-${theme.style}` : ''}">
${sectionUsage}
    </div>
  );
};

export default ${template.name.replace(/\s+/g, '')}Page;`;
  }

  /**
   * Get available templates
   */
  getTemplates(): PageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): PageTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Create custom template
   */
  createCustomTemplate(template: PageTemplate): void {
    this.templates.set(template.id, template);
    console.log(`✅ Custom template '${template.name}' created`);
  }

  /**
   * Generate section preview
   */
  async generateSectionPreview(
    sectionType: 'hero' | 'features' | 'pricing' | 'testimonials' | 'footer',
    theme?: ThemeSpec
  ): Promise<GeneratedSection> {
    const sectionTemplates: Record<string, PageSection> = {
      hero: {
        id: 'hero-preview',
        name: 'Hero Section',
        description: 'Hero section preview',
        components: [{
          id: 'hero-main',
          type: 'hero',
          prompt: 'modern hero section with headline and CTA',
          position: { row: 0, column: 0, width: 12, height: 1 }
        }],
        layout: { type: 'flex', columns: 1 }
      },
      features: {
        id: 'features-preview',
        name: 'Features Section',
        description: 'Features section preview',
        components: [
          {
            id: 'feature-1',
            type: 'feature-card',
            prompt: 'feature card with icon',
            position: { row: 0, column: 0, width: 4, height: 1 }
          },
          {
            id: 'feature-2',
            type: 'feature-card',
            prompt: 'feature card with icon',
            position: { row: 0, column: 4, width: 4, height: 1 }
          },
          {
            id: 'feature-3',
            type: 'feature-card',
            prompt: 'feature card with icon',
            position: { row: 0, column: 8, width: 4, height: 1 }
          }
        ],
        layout: { type: 'grid', columns: 3, gap: '2rem' }
      },
      pricing: {
        id: 'pricing-preview',
        name: 'Pricing Section',
        description: 'Pricing section preview',
        components: [{
          id: 'pricing-table',
          type: 'pricing',
          prompt: 'pricing table with 3 tiers',
          position: { row: 0, column: 0, width: 12, height: 1 }
        }],
        layout: { type: 'flex', columns: 1 }
      },
      testimonials: {
        id: 'testimonials-preview',
        name: 'Testimonials Section',
        description: 'Testimonials section preview',
        components: [
          {
            id: 'testimonial-1',
            type: 'testimonial',
            prompt: 'testimonial card with quote and author',
            position: { row: 0, column: 0, width: 4, height: 1 }
          },
          {
            id: 'testimonial-2',
            type: 'testimonial',
            prompt: 'testimonial card with rating',
            position: { row: 0, column: 4, width: 4, height: 1 }
          },
          {
            id: 'testimonial-3',
            type: 'testimonial',
            prompt: 'testimonial card with company logo',
            position: { row: 0, column: 8, width: 4, height: 1 }
          }
        ],
        layout: { type: 'grid', columns: 3, gap: '2rem' }
      },
      footer: {
        id: 'footer-preview',
        name: 'Footer Section',
        description: 'Footer section preview',
        components: [{
          id: 'footer-main',
          type: 'footer',
          prompt: 'footer with links, social media, and copyright',
          position: { row: 0, column: 0, width: 12, height: 1 }
        }],
        layout: { type: 'flex', columns: 1 }
      }
    };

    const section = sectionTemplates[sectionType];
    if (!section) {
      throw new Error(`Unknown section type: ${sectionType}`);
    }

    return this.generateSection(section, theme);
  }
}

// Create singleton instance
const pageComposer = new PageComposer();

export default pageComposer;
export type {
  PageSection,
  ComponentSpec,
  LayoutSpec,
  ThemeSpec,
  PageTemplate,
  GeneratedPage,
  GeneratedSection,
  PageMetadata
};