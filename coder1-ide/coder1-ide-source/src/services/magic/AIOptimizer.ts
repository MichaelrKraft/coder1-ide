/**
 * AI Optimizer Service - Phase 2.3 Enhancement
 * Provides advanced accessibility checking and performance optimization for generated components
 */

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element: string;
  fix: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
}

interface PerformanceIssue {
  type: 'render' | 'memory' | 'bundle' | 'runtime';
  severity: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  suggestion: string;
}

interface OptimizationResult {
  originalCode: string;
  optimizedCode: string;
  accessibilityScore: number;
  performanceScore: number;
  accessibilityIssues: AccessibilityIssue[];
  performanceIssues: PerformanceIssue[];
  improvements: string[];
  codeSize: {
    before: number;
    after: number;
    reduction: number;
  };
}

interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTags?: Record<string, string>;
  structuredData?: any;
}

interface ComponentMetrics {
  renderTime?: number;
  memoryUsage?: number;
  domNodes?: number;
  reRenders?: number;
  bundleSize?: number;
}

class AIOptimizer {
  private accessibilityRules: Map<string, (code: string) => AccessibilityIssue[]> = new Map();
  private performancePatterns: Map<string, (code: string) => PerformanceIssue[]> = new Map();

  constructor() {
    this.initializeAccessibilityRules();
    this.initializePerformancePatterns();
  }

  /**
   * Initialize accessibility checking rules
   */
  private initializeAccessibilityRules() {
    // Alt text for images
    this.accessibilityRules.set('img-alt', (code: string) => {
      const issues: AccessibilityIssue[] = [];
      const imgRegex = /<img[^>]*>/g;
      const matches = code.match(imgRegex) || [];
      
      matches.forEach(img => {
        if (!img.includes('alt=')) {
          issues.push({
            type: 'error',
            rule: 'img-alt',
            description: 'Images must have alt text',
            element: img,
            fix: 'Add alt="" or descriptive alt text',
            wcagLevel: 'A'
          });
        }
      });
      
      return issues;
    });

    // ARIA labels for interactive elements
    this.accessibilityRules.set('aria-labels', (code: string) => {
      const issues: AccessibilityIssue[] = [];
      const buttonRegex = /<button[^>]*>([^<]*)<\/button>/g;
      let match;
      
      while ((match = buttonRegex.exec(code)) !== null) {
        const [fullMatch, content] = match;
        if (!content.trim() && !fullMatch.includes('aria-label')) {
          issues.push({
            type: 'error',
            rule: 'aria-labels',
            description: 'Buttons without text must have aria-label',
            element: fullMatch,
            fix: 'Add aria-label attribute with descriptive text',
            wcagLevel: 'A'
          });
        }
      }
      
      return issues;
    });

    // Semantic HTML
    this.accessibilityRules.set('semantic-html', (code: string) => {
      const issues: AccessibilityIssue[] = [];
      
      // Check for div soup
      const divCount = (code.match(/<div/g) || []).length;
      const semanticTags = ['nav', 'main', 'header', 'footer', 'section', 'article', 'aside'];
      const semanticCount = semanticTags.reduce((count, tag) => {
        return count + (code.match(new RegExp(`<${tag}`, 'g')) || []).length;
      }, 0);
      
      if (divCount > 10 && semanticCount < 2) {
        issues.push({
          type: 'warning',
          rule: 'semantic-html',
          description: 'Consider using semantic HTML elements',
          element: 'Multiple <div> elements',
          fix: 'Replace generic divs with semantic elements like <nav>, <main>, <section>',
          wcagLevel: 'AA'
        });
      }
      
      return issues;
    });

    // Color contrast
    this.accessibilityRules.set('color-contrast', (code: string) => {
      const issues: AccessibilityIssue[] = [];
      
      // Check for light text on light background
      if (code.includes('text-gray-300') && code.includes('bg-gray-100')) {
        issues.push({
          type: 'error',
          rule: 'color-contrast',
          description: 'Insufficient color contrast',
          element: 'text-gray-300 on bg-gray-100',
          fix: 'Use darker text color or lighter background',
          wcagLevel: 'AA'
        });
      }
      
      return issues;
    });

    // Keyboard navigation
    this.accessibilityRules.set('keyboard-nav', (code: string) => {
      const issues: AccessibilityIssue[] = [];
      
      // Check for onClick without keyboard handlers
      if (code.includes('onClick') && !code.includes('onKeyDown') && !code.includes('onKeyPress')) {
        issues.push({
          type: 'warning',
          rule: 'keyboard-nav',
          description: 'Interactive elements should support keyboard navigation',
          element: 'onClick handlers',
          fix: 'Add onKeyDown or onKeyPress handlers for keyboard support',
          wcagLevel: 'A'
        });
      }
      
      return issues;
    });

    // Form labels
    this.accessibilityRules.set('form-labels', (code: string) => {
      const issues: AccessibilityIssue[] = [];
      const inputRegex = /<input[^>]*>/g;
      const matches = code.match(inputRegex) || [];
      
      matches.forEach(input => {
        const hasLabel = code.includes('<label') && code.includes('htmlFor');
        const hasAriaLabel = input.includes('aria-label');
        
        if (!hasLabel && !hasAriaLabel && !input.includes('type="hidden"')) {
          issues.push({
            type: 'error',
            rule: 'form-labels',
            description: 'Form inputs must have associated labels',
            element: input,
            fix: 'Add <label> with htmlFor or aria-label attribute',
            wcagLevel: 'A'
          });
        }
      });
      
      return issues;
    });

    console.log('✅ Accessibility rules initialized:', this.accessibilityRules.size);
  }

  /**
   * Initialize performance optimization patterns
   */
  private initializePerformancePatterns() {
    // Check for unnecessary re-renders
    this.performancePatterns.set('unnecessary-renders', (code: string) => {
      const issues: PerformanceIssue[] = [];
      
      // Check for inline functions in render
      if (code.includes('onClick={() =>') || code.includes('onClick={function')) {
        issues.push({
          type: 'render',
          severity: 'medium',
          description: 'Inline functions cause unnecessary re-renders',
          impact: 'Component re-renders on every parent render',
          suggestion: 'Use useCallback hook or define functions outside render'
        });
      }
      
      return issues;
    });

    // Check for large lists without virtualization
    this.performancePatterns.set('list-virtualization', (code: string) => {
      const issues: PerformanceIssue[] = [];
      
      // Check for map over large arrays
      if (code.includes('.map(') && code.includes('100')) {
        issues.push({
          type: 'render',
          severity: 'high',
          description: 'Large lists should use virtualization',
          impact: 'Rendering many DOM nodes impacts performance',
          suggestion: 'Consider using react-window or react-virtualized for large lists'
        });
      }
      
      return issues;
    });

    // Check for missing React.memo
    this.performancePatterns.set('memo-optimization', (code: string) => {
      const issues: PerformanceIssue[] = [];
      
      // Check for functional components without memo
      const hasComplexProps = code.includes('props.') && !code.includes('React.memo');
      if (hasComplexProps) {
        issues.push({
          type: 'render',
          severity: 'low',
          description: 'Consider using React.memo for pure components',
          impact: 'Component re-renders when parent re-renders',
          suggestion: 'Wrap component with React.memo to prevent unnecessary re-renders'
        });
      }
      
      return issues;
    });

    // Check for heavy computations
    this.performancePatterns.set('heavy-computations', (code: string) => {
      const issues: PerformanceIssue[] = [];
      
      // Check for complex calculations in render
      if ((code.includes('filter(') || code.includes('reduce(')) && !code.includes('useMemo')) {
        issues.push({
          type: 'runtime',
          severity: 'medium',
          description: 'Heavy computations should be memoized',
          impact: 'Calculations run on every render',
          suggestion: 'Use useMemo hook to memoize expensive calculations'
        });
      }
      
      return issues;
    });

    // Check for bundle size issues
    this.performancePatterns.set('bundle-size', (code: string) => {
      const issues: PerformanceIssue[] = [];
      
      // Check for large libraries
      if (code.includes('import moment from') || code.includes('import _ from')) {
        issues.push({
          type: 'bundle',
          severity: 'high',
          description: 'Large library imports increase bundle size',
          impact: 'Slower initial page load',
          suggestion: 'Use tree-shakeable alternatives or import specific functions'
        });
      }
      
      return issues;
    });

    console.log('✅ Performance patterns initialized:', this.performancePatterns.size);
  }

  /**
   * Analyze component for accessibility issues
   */
  analyzeAccessibility(code: string): {
    score: number;
    issues: AccessibilityIssue[];
  } {
    const allIssues: AccessibilityIssue[] = [];
    
    // Run all accessibility rules
    this.accessibilityRules.forEach((checkRule) => {
      const issues = checkRule(code);
      allIssues.push(...issues);
    });
    
    // Calculate score (100 - 10 points per error, 5 per warning)
    const errorCount = allIssues.filter(i => i.type === 'error').length;
    const warningCount = allIssues.filter(i => i.type === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 5));
    
    return { score, issues: allIssues };
  }

  /**
   * Analyze component for performance issues
   */
  analyzePerformance(code: string): {
    score: number;
    issues: PerformanceIssue[];
  } {
    const allIssues: PerformanceIssue[] = [];
    
    // Run all performance patterns
    this.performancePatterns.forEach((checkPattern) => {
      const issues = checkPattern(code);
      allIssues.push(...issues);
    });
    
    // Calculate score
    const highCount = allIssues.filter(i => i.severity === 'high').length;
    const mediumCount = allIssues.filter(i => i.severity === 'medium').length;
    const lowCount = allIssues.filter(i => i.severity === 'low').length;
    const score = Math.max(0, 100 - (highCount * 15) - (mediumCount * 10) - (lowCount * 5));
    
    return { score, issues: allIssues };
  }

  /**
   * Optimize component code
   */
  async optimizeComponent(code: string): Promise<OptimizationResult> {
    let optimizedCode = code;
    const improvements: string[] = [];
    
    // Accessibility optimizations
    const { score: accessibilityScore, issues: accessibilityIssues } = this.analyzeAccessibility(code);
    
    // Auto-fix accessibility issues
    if (code.includes('<img') && !code.includes('alt=')) {
      optimizedCode = optimizedCode.replace(/<img([^>]*)>/g, '<img$1 alt="">');
      improvements.push('Added alt attributes to images');
    }
    
    if (code.includes('<button>') && !code.includes('type=')) {
      optimizedCode = optimizedCode.replace(/<button>/g, '<button type="button">');
      improvements.push('Added type attribute to buttons');
    }
    
    // Performance optimizations
    const { score: performanceScore, issues: performanceIssues } = this.analyzePerformance(code);
    
    // Add React.memo if not present
    if (!code.includes('React.memo') && code.includes('const') && code.includes('props')) {
      const componentMatch = code.match(/const\s+(\w+)\s*=\s*\(/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        optimizedCode = optimizedCode.replace(
          `export default ${componentName};`,
          `export default React.memo(${componentName});`
        );
        improvements.push('Added React.memo for performance optimization');
      }
    }
    
    // Add lazy loading for images
    if (code.includes('<img') && !code.includes('loading=')) {
      optimizedCode = optimizedCode.replace(/<img([^>]*)>/g, '<img$1 loading="lazy">');
      improvements.push('Added lazy loading to images');
    }
    
    // Calculate code size reduction
    const originalSize = code.length;
    const optimizedSize = optimizedCode.length;
    
    return {
      originalCode: code,
      optimizedCode,
      accessibilityScore,
      performanceScore,
      accessibilityIssues,
      performanceIssues,
      improvements,
      codeSize: {
        before: originalSize,
        after: optimizedSize,
        reduction: originalSize - optimizedSize
      }
    };
  }

  /**
   * Generate SEO metadata for component
   */
  generateSEOMetadata(componentType: string, content?: string): SEOMetadata {
    const metadata: SEOMetadata = {};
    
    switch (componentType) {
      case 'hero':
        metadata.title = 'Welcome to Our Platform';
        metadata.description = 'Discover amazing features and start your journey';
        metadata.keywords = ['platform', 'features', 'innovation'];
        break;
      case 'pricing':
        metadata.title = 'Pricing Plans - Choose Your Perfect Plan';
        metadata.description = 'Flexible pricing options to suit every need';
        metadata.keywords = ['pricing', 'plans', 'subscription'];
        break;
      case 'product':
        metadata.title = 'Product Showcase';
        metadata.description = 'Browse our collection of premium products';
        metadata.keywords = ['products', 'shop', 'store'];
        break;
    }
    
    // Open Graph tags
    metadata.ogTags = {
      'og:title': metadata.title || '',
      'og:description': metadata.description || '',
      'og:type': 'website'
    };
    
    return metadata;
  }

  /**
   * Measure component performance metrics
   */
  measureComponentMetrics(code: string): ComponentMetrics {
    const metrics: ComponentMetrics = {};
    
    // Estimate DOM nodes
    const elementMatches = code.match(/<[^/][^>]*>/g) || [];
    metrics.domNodes = elementMatches.length;
    
    // Estimate bundle size (rough calculation)
    metrics.bundleSize = code.length * 0.4; // Assuming ~40% after minification
    
    // Check for potential re-render triggers
    const stateHooks = (code.match(/useState/g) || []).length;
    const effectHooks = (code.match(/useEffect/g) || []).length;
    metrics.reRenders = stateHooks + effectHooks;
    
    return metrics;
  }

  /**
   * Generate accessibility report
   */
  generateAccessibilityReport(code: string): string {
    const { score, issues } = this.analyzeAccessibility(code);
    
    let report = `# Accessibility Report\n\n`;
    report += `## Score: ${score}/100\n\n`;
    
    if (issues.length === 0) {
      report += `✅ No accessibility issues found!\n`;
    } else {
      report += `## Issues Found:\n\n`;
      
      const errors = issues.filter(i => i.type === 'error');
      const warnings = issues.filter(i => i.type === 'warning');
      
      if (errors.length > 0) {
        report += `### Errors (${errors.length})\n`;
        errors.forEach(issue => {
          report += `- **${issue.rule}**: ${issue.description}\n`;
          report += `  - WCAG Level: ${issue.wcagLevel}\n`;
          report += `  - Fix: ${issue.fix}\n\n`;
        });
      }
      
      if (warnings.length > 0) {
        report += `### Warnings (${warnings.length})\n`;
        warnings.forEach(issue => {
          report += `- **${issue.rule}**: ${issue.description}\n`;
          report += `  - Fix: ${issue.fix}\n\n`;
        });
      }
    }
    
    return report;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(code: string): string {
    const { score, issues } = this.analyzePerformance(code);
    const metrics = this.measureComponentMetrics(code);
    
    let report = `# Performance Report\n\n`;
    report += `## Score: ${score}/100\n\n`;
    
    report += `## Metrics:\n`;
    report += `- DOM Nodes: ${metrics.domNodes}\n`;
    report += `- Estimated Bundle Size: ${Math.round(metrics.bundleSize || 0)} bytes\n`;
    report += `- Potential Re-renders: ${metrics.reRenders}\n\n`;
    
    if (issues.length === 0) {
      report += `✅ No performance issues found!\n`;
    } else {
      report += `## Issues Found:\n\n`;
      
      issues.forEach(issue => {
        const emoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        report += `${emoji} **${issue.description}**\n`;
        report += `- Impact: ${issue.impact}\n`;
        report += `- Suggestion: ${issue.suggestion}\n\n`;
      });
    }
    
    return report;
  }

  /**
   * Apply smart optimizations based on component type
   */
  applySmartOptimizations(code: string, componentType: string): string {
    let optimized = code;
    
    // Component-specific optimizations
    switch (componentType) {
      case 'list':
      case 'table':
        // Add virtualization for large lists
        if (!code.includes('react-window')) {
          optimized = `import { FixedSizeList } from 'react-window';\n${optimized}`;
        }
        break;
        
      case 'form':
        // Add form validation
        if (!code.includes('onSubmit')) {
          optimized = optimized.replace(
            '<form',
            '<form onSubmit={(e) => { e.preventDefault(); /* validation */ }}'
          );
        }
        break;
        
      case 'image':
      case 'gallery':
        // Add image optimization
        if (!code.includes('loading=')) {
          optimized = optimized.replace(/<img/g, '<img loading="lazy"');
        }
        break;
    }
    
    return optimized;
  }
}

// Create singleton instance
const aiOptimizer = new AIOptimizer();

export default aiOptimizer;
export type {
  AccessibilityIssue,
  PerformanceIssue,
  OptimizationResult,
  SEOMetadata,
  ComponentMetrics
};