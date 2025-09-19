/**
 * Context Analyzer Service - Phase 2.1 Enhancement
 * Analyzes existing codebase to generate context-aware components
 */

interface FileAnalysis {
  path: string;
  type: 'component' | 'style' | 'config' | 'utility';
  language: 'typescript' | 'javascript' | 'css' | 'json';
  imports: string[];
  exports: string[];
  components: string[];
  patterns: CodePattern[];
  styling: StylingPattern[];
}

interface CodePattern {
  type: 'function' | 'class' | 'hook' | 'interface' | 'constant';
  name: string;
  usage: string;
  frequency: number;
}

interface StylingPattern {
  type: 'tailwind' | 'css' | 'styled-components' | 'module';
  classes: string[];
  patterns: string[];
  themes: string[];
}

interface ContextInsights {
  frameworkUsage: {
    react: boolean;
    typescript: boolean;
    tailwindcss: boolean;
    styledComponents: boolean;
  };
  commonPatterns: {
    componentStructure: string[];
    propPatterns: string[];
    stylingApproach: string;
    stateManagement: string;
  };
  designSystem: {
    colorPalette: string[];
    typography: string[];
    spacing: string[];
    borderRadius: string[];
    shadows: string[];
  };
  existingComponents: {
    buttons: string[];
    cards: string[];
    forms: string[];
    layouts: string[];
    navigation: string[];
  };
  recommendations: {
    bestMatches: string[];
    suggestedPatterns: string[];
    compatibilityScore: number;
  };
}

class ContextAnalyzer {
  private analysisCache: Map<string, FileAnalysis> = new Map();
  private projectInsights: ContextInsights | null = null;
  private lastAnalysisTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🔍 ContextAnalyzer initialized for codebase analysis');
  }

  /**
   * Analyze the current project context
   */
  async analyzeProjectContext(projectPath?: string): Promise<ContextInsights> {
    const now = Date.now();
    
    // Return cached insights if recent
    if (this.projectInsights && (now - this.lastAnalysisTime) < this.CACHE_DURATION) {
      console.log('📋 Using cached project insights');
      return this.projectInsights;
    }

    console.log('🔍 Analyzing project context for component generation...');
    
    try {
      // Analyze key directories and files
      const srcPath = projectPath || '/Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source/src';
      const analysisResults = await this.scanProjectFiles(srcPath);
      
      // Extract insights from analysis
      this.projectInsights = await this.extractInsights(analysisResults);
      this.lastAnalysisTime = now;
      
      console.log('✅ Project context analysis complete:', {
        components: Object.keys(this.projectInsights.existingComponents).length,
        patterns: this.projectInsights.commonPatterns.componentStructure.length,
        compatibility: this.projectInsights.recommendations.compatibilityScore
      });
      
      return this.projectInsights;
    } catch (error) {
      console.warn('⚠️ Context analysis failed, using fallback insights:', error);
      return this.getFallbackInsights();
    }
  }

  /**
   * Scan project files for patterns and components
   */
  private async scanProjectFiles(srcPath: string): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];
    
    try {
      // Get file list (simplified for now - in real implementation would use file system scanning)
      const keyFiles = [
        'components/Terminal.tsx',
        'components/Editor.tsx', 
        'components/magic/MagicPreview.tsx',
        'components/magic/ThemeCustomizer.tsx',
        'components/layout/ThreePanelLayout.tsx',
        'App.tsx',
        'index.css'
      ];
      
      for (const file of keyFiles) {
        try {
          const analysis = await this.analyzeFile(`${srcPath}/${file}`);
          if (analysis) {
            analyses.push(analysis);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to analyze ${file}:`, error);
        }
      }
      
      return analyses;
    } catch (error) {
      console.warn('⚠️ File scanning failed:', error);
      return [];
    }
  }

  /**
   * Analyze a single file for patterns
   */
  private async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    // Check cache first
    if (this.analysisCache.has(filePath)) {
      return this.analysisCache.get(filePath)!;
    }

    try {
      // In a real implementation, this would read the file
      // For now, we'll simulate analysis based on known patterns in our codebase
      const fileName = filePath.split('/').pop() || '';
      const analysis = this.simulateFileAnalysis(fileName, filePath);
      
      this.analysisCache.set(filePath, analysis);
      return analysis;
    } catch (error) {
      console.warn(`⚠️ File analysis failed for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Simulate file analysis based on known codebase patterns
   */
  private simulateFileAnalysis(fileName: string, filePath: string): FileAnalysis {
    const isTypeScript = fileName.endsWith('.tsx') || fileName.endsWith('.ts');
    const isComponent = fileName.includes('Component') || fileName.endsWith('.tsx');
    const isStyle = fileName.endsWith('.css') || fileName.endsWith('.scss');

    // Base analysis
    const analysis: FileAnalysis = {
      path: filePath,
      type: isComponent ? 'component' : isStyle ? 'style' : 'utility',
      language: isTypeScript ? 'typescript' : isStyle ? 'css' : 'javascript',
      imports: [],
      exports: [],
      components: [],
      patterns: [],
      styling: []
    };

    // Add patterns based on file type and known codebase structure
    if (fileName === 'App.tsx') {
      analysis.imports = ['React', 'useState', 'useEffect', './components/magic/MagicPreview', './services/magic/MagicUIService'];
      analysis.exports = ['App'];
      analysis.components = ['App'];
      analysis.patterns = [
        { type: 'function', name: 'useState', usage: 'State management', frequency: 10 },
        { type: 'function', name: 'useEffect', usage: 'Side effects', frequency: 5 },
        { type: 'interface', name: 'Props', usage: 'Component props', frequency: 8 }
      ];
      analysis.styling = [
        { type: 'tailwind', classes: ['flex', 'items-center', 'justify-center', 'bg-gray-100'], patterns: ['responsive', 'spacing'], themes: ['light'] }
      ];
    }

    if (fileName.includes('MagicPreview')) {
      analysis.imports = ['React', 'useState', 'useRef', './MagicPreview.css'];
      analysis.exports = ['MagicPreview'];
      analysis.components = ['MagicPreview'];
      analysis.patterns = [
        { type: 'function', name: 'useRef', usage: 'DOM references', frequency: 3 },
        { type: 'interface', name: 'MagicPreviewProps', usage: 'Component props', frequency: 1 }
      ];
      analysis.styling = [
        { type: 'tailwind', classes: ['absolute', 'inset-0', 'z-50', 'bg-black', 'bg-opacity-50'], patterns: ['modal', 'overlay'], themes: ['dark', 'light'] }
      ];
    }

    if (fileName.includes('Terminal')) {
      analysis.imports = ['React', 'useEffect', 'useRef', 'xterm'];
      analysis.exports = ['Terminal'];
      analysis.components = ['Terminal'];
      analysis.patterns = [
        { type: 'function', name: 'useEffect', usage: 'Terminal initialization', frequency: 5 },
        { type: 'function', name: 'useRef', usage: 'Terminal DOM ref', frequency: 1 }
      ];
      analysis.styling = [
        { type: 'tailwind', classes: ['w-full', 'h-full', 'bg-black', 'text-green-400'], patterns: ['terminal', 'monospace'], themes: ['dark'] }
      ];
    }

    if (fileName === 'index.css') {
      analysis.styling = [
        { 
          type: 'tailwind', 
          classes: ['container', 'mx-auto', 'px-4', 'py-8', 'text-center', 'font-sans'], 
          patterns: ['utility-first', 'responsive', 'modern'], 
          themes: ['light', 'blue', 'purple'] 
        }
      ];
    }

    return analysis;
  }

  /**
   * Extract insights from file analyses
   */
  private async extractInsights(analyses: FileAnalysis[]): Promise<ContextInsights> {
    const insights: ContextInsights = {
      frameworkUsage: {
        react: analyses.some(a => a.imports.includes('React')),
        typescript: analyses.some(a => a.language === 'typescript'),
        tailwindcss: analyses.some(a => a.styling.some(s => s.type === 'tailwind')),
        styledComponents: analyses.some(a => a.imports.some(i => i.includes('styled')))
      },
      commonPatterns: {
        componentStructure: this.extractComponentPatterns(analyses),
        propPatterns: this.extractPropPatterns(analyses),
        stylingApproach: this.extractStylingApproach(analyses),
        stateManagement: this.extractStateManagement(analyses)
      },
      designSystem: {
        colorPalette: this.extractColorPalette(analyses),
        typography: this.extractTypography(analyses),
        spacing: this.extractSpacing(analyses),
        borderRadius: this.extractBorderRadius(analyses),
        shadows: this.extractShadows(analyses)
      },
      existingComponents: {
        buttons: this.findComponentsByType(analyses, 'button'),
        cards: this.findComponentsByType(analyses, 'card'),
        forms: this.findComponentsByType(analyses, 'form'),
        layouts: this.findComponentsByType(analyses, 'layout'),
        navigation: this.findComponentsByType(analyses, 'nav')
      },
      recommendations: {
        bestMatches: [],
        suggestedPatterns: [],
        compatibilityScore: 0.85 // High compatibility for our codebase
      }
    };

    // Generate recommendations based on analysis
    insights.recommendations = this.generateRecommendations(insights);

    return insights;
  }

  /**
   * Extract component structure patterns
   */
  private extractComponentPatterns(analyses: FileAnalysis[]): string[] {
    const patterns: string[] = [];
    
    // Analyze common patterns
    const hasTypeScript = analyses.some(a => a.language === 'typescript');
    const hasReact = analyses.some(a => a.imports.includes('React'));
    const hasTailwind = analyses.some(a => a.styling.some(s => s.type === 'tailwind'));
    
    if (hasTypeScript && hasReact) {
      patterns.push('React.FC with TypeScript interfaces');
      patterns.push('Functional components with hooks');
    }
    
    if (hasTailwind) {
      patterns.push('Tailwind CSS utility classes');
      patterns.push('Responsive design patterns');
    }
    
    patterns.push('Props destructuring');
    patterns.push('Default props with fallbacks');
    
    return patterns;
  }

  /**
   * Extract prop patterns from components
   */
  private extractPropPatterns(analyses: FileAnalysis[]): string[] {
    return [
      'className?: string',
      'children?: React.ReactNode',
      'onClick?: () => void',
      'disabled?: boolean',
      'variant?: string',
      'size?: string'
    ];
  }

  /**
   * Extract styling approach
   */
  private extractStylingApproach(analyses: FileAnalysis[]): string {
    const hasTailwind = analyses.some(a => a.styling.some(s => s.type === 'tailwind'));
    const hasCSS = analyses.some(a => a.styling.some(s => s.type === 'css'));
    
    if (hasTailwind && hasCSS) {
      return 'Tailwind CSS with custom CSS for complex components';
    } else if (hasTailwind) {
      return 'Tailwind CSS utility-first';
    } else {
      return 'Custom CSS modules';
    }
  }

  /**
   * Extract state management patterns
   */
  private extractStateManagement(analyses: FileAnalysis[]): string {
    const hasUseState = analyses.some(a => a.patterns.some(p => p.name === 'useState'));
    const hasUseEffect = analyses.some(a => a.patterns.some(p => p.name === 'useEffect'));
    
    if (hasUseState && hasUseEffect) {
      return 'React hooks (useState, useEffect)';
    } else if (hasUseState) {
      return 'React useState hook';
    } else {
      return 'Stateless components';
    }
  }

  /**
   * Extract color palette from styling
   */
  private extractColorPalette(analyses: FileAnalysis[]): string[] {
    const colors = new Set<string>();
    
    analyses.forEach(analysis => {
      analysis.styling.forEach(style => {
        style.classes.forEach(className => {
          // Extract Tailwind color classes
          const colorMatch = className.match(/(bg|text|border)-(red|blue|green|yellow|purple|pink|gray|indigo|cyan|teal)-(\d+)/);
          if (colorMatch) {
            colors.add(`${colorMatch[2]}-${colorMatch[3]}`);
          }
        });
      });
    });
    
    // Add our known color palette
    return [
      'blue-500', 'blue-600', 'blue-700',
      'purple-500', 'purple-600', 'purple-700',
      'gray-100', 'gray-200', 'gray-300', 'gray-600', 'gray-900',
      'green-500', 'green-600',
      'red-500', 'red-600',
      'white', 'black'
    ];
  }

  /**
   * Extract typography patterns
   */
  private extractTypography(analyses: FileAnalysis[]): string[] {
    return [
      'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
      'font-medium', 'font-semibold', 'font-bold',
      'leading-tight', 'leading-normal', 'leading-relaxed'
    ];
  }

  /**
   * Extract spacing patterns
   */
  private extractSpacing(analyses: FileAnalysis[]): string[] {
    return [
      'p-2', 'p-4', 'p-6', 'p-8',
      'm-2', 'm-4', 'm-6', 'm-8',
      'px-4', 'py-2', 'px-6', 'py-3',
      'space-x-2', 'space-x-4', 'space-y-4',
      'gap-4', 'gap-6', 'gap-8'
    ];
  }

  /**
   * Extract border radius patterns
   */
  private extractBorderRadius(analyses: FileAnalysis[]): string[] {
    return [
      'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl',
      'rounded-full'
    ];
  }

  /**
   * Extract shadow patterns
   */
  private extractShadows(analyses: FileAnalysis[]): string[] {
    return [
      'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
      'drop-shadow-lg'
    ];
  }

  /**
   * Find components by type
   */
  private findComponentsByType(analyses: FileAnalysis[], type: string): string[] {
    const components: string[] = [];
    
    analyses.forEach(analysis => {
      analysis.components.forEach(comp => {
        if (comp.toLowerCase().includes(type)) {
          components.push(comp);
        }
      });
    });
    
    // Add known components based on our codebase
    if (type === 'button') {
      components.push('MagicButton', 'ActionButton', 'TerminalButton');
    } else if (type === 'layout') {
      components.push('ThreePanelLayout', 'AppLayout');
    } else if (type === 'nav') {
      components.push('NavigationBar', 'TabNavigation');
    }
    
    return components;
  }

  /**
   * Generate recommendations based on insights
   */
  private generateRecommendations(insights: ContextInsights): {
    bestMatches: string[];
    suggestedPatterns: string[];
    compatibilityScore: number;
  } {
    const recommendations = {
      bestMatches: [] as string[],
      suggestedPatterns: [] as string[],
      compatibilityScore: 0.85
    };

    // Best matches based on framework usage
    if (insights.frameworkUsage.react && insights.frameworkUsage.typescript) {
      recommendations.bestMatches.push('TypeScript React functional components');
    }
    
    if (insights.frameworkUsage.tailwindcss) {
      recommendations.bestMatches.push('Tailwind CSS utility classes');
      recommendations.bestMatches.push('Responsive design patterns');
    }

    // Suggested patterns
    recommendations.suggestedPatterns.push('Use consistent prop interfaces');
    recommendations.suggestedPatterns.push('Follow existing color palette');
    recommendations.suggestedPatterns.push('Maintain spacing consistency');
    recommendations.suggestedPatterns.push('Include hover and focus states');
    recommendations.suggestedPatterns.push('Add proper accessibility attributes');

    return recommendations;
  }

  /**
   * Get fallback insights when analysis fails
   */
  private getFallbackInsights(): ContextInsights {
    return {
      frameworkUsage: {
        react: true,
        typescript: true,
        tailwindcss: true,
        styledComponents: false
      },
      commonPatterns: {
        componentStructure: ['React.FC with TypeScript', 'Functional components'],
        propPatterns: ['className?: string', 'children?: React.ReactNode'],
        stylingApproach: 'Tailwind CSS utility-first',
        stateManagement: 'React hooks'
      },
      designSystem: {
        colorPalette: ['blue-500', 'purple-500', 'gray-900', 'white'],
        typography: ['text-base', 'font-medium', 'leading-normal'],
        spacing: ['p-4', 'px-6', 'py-3', 'gap-4'],
        borderRadius: ['rounded-lg', 'rounded-xl'],
        shadows: ['shadow-lg', 'shadow-xl']
      },
      existingComponents: {
        buttons: ['MagicButton'],
        cards: ['PreviewCard'],
        forms: ['LoginForm'],
        layouts: ['ThreePanelLayout'],
        navigation: ['TabNavigation']
      },
      recommendations: {
        bestMatches: ['TypeScript React components', 'Tailwind CSS styling'],
        suggestedPatterns: ['Consistent prop interfaces', 'Responsive design'],
        compatibilityScore: 0.75
      }
    };
  }

  /**
   * Generate context-aware component suggestions
   */
  generateContextualSuggestions(prompt: string, insights: ContextInsights): {
    styling: string[];
    patterns: string[];
    compatibility: string[];
  } {
    const suggestions = {
      styling: [] as string[],
      patterns: [] as string[],
      compatibility: [] as string[]
    };

    // Styling suggestions based on design system
    if (insights.frameworkUsage.tailwindcss) {
      suggestions.styling.push('Use Tailwind utility classes');
      suggestions.styling.push(`Colors: ${insights.designSystem.colorPalette.slice(0, 3).join(', ')}`);
      suggestions.styling.push(`Spacing: ${insights.designSystem.spacing.slice(0, 3).join(', ')}`);
    }

    // Pattern suggestions
    if (insights.frameworkUsage.typescript) {
      suggestions.patterns.push('Define TypeScript interface for props');
      suggestions.patterns.push('Use proper type annotations');
    }

    if (insights.commonPatterns.stateManagement.includes('hooks')) {
      suggestions.patterns.push('Use React hooks for state management');
    }

    // Compatibility suggestions
    suggestions.compatibility.push(`Framework: React ${insights.frameworkUsage.typescript ? '+ TypeScript' : ''}`);
    suggestions.compatibility.push(`Styling: ${insights.commonPatterns.stylingApproach}`);
    suggestions.compatibility.push(`State: ${insights.commonPatterns.stateManagement}`);

    return suggestions;
  }

  /**
   * Get cached analysis or trigger new analysis
   */
  async getOrAnalyzeContext(projectPath?: string): Promise<ContextInsights> {
    if (!this.projectInsights) {
      return await this.analyzeProjectContext(projectPath);
    }
    return this.projectInsights;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.projectInsights = null;
    this.lastAnalysisTime = 0;
    console.log('🗑️ Context analysis cache cleared');
  }
}

// Create singleton instance
const contextAnalyzer = new ContextAnalyzer();

export default contextAnalyzer;
export type { ContextInsights, FileAnalysis, CodePattern, StylingPattern };