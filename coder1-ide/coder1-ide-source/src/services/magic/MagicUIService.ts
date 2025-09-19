/**
 * Magic MCP UI Service - Enhanced with React Bits Integration, Variations Support, and Context Analysis
 * TypeScript wrapper for AI-powered component generation with codebase awareness
 */

import contextAnalyzer, { type ContextInsights } from './ContextAnalyzer';
import componentHistory from './ComponentHistory';

interface MagicProgress {
  status: 'idle' | 'generating' | 'complete' | 'error';
  message?: string;
  component?: any;
}

interface MagicComponent {
  success: boolean;
  componentCode: string;
  name: string;
  explanation?: string;
  metadata?: {
    source: string;
    searchQuery?: string;
    timestamp: string;
    componentType?: string;
    theme?: string;
    quality?: string;
    contextAware?: boolean;
    frameworkUsage?: any;
    stylingApproach?: string;
    compatibilityScore?: number;
    appliedSuggestions?: any;
    enhancements?: any;
    contextScore?: number;
  };
}

interface MagicVariation {
  id: number;
  code: string;
  name: string;
  explanation: string;
  metadata?: {
    source: string;
    componentType?: string;
    theme?: string;
    quality?: string;
  };
  variationIndex: number;
  generatedAt: string;
  note?: string;
}

interface MagicVariationsResponse {
  success: boolean;
  variations: MagicVariation[];
  total: number;
  prompt: string;
  generatedAt: string;
}

interface MagicGenerationOptions {
  message: string;
  searchQuery?: string;
  currentFilePath?: string;
  projectDirectory?: string;
}

class MagicUIService {
  private isInitialized: boolean = false;
  private reactBitsComponents: Map<string, any> = new Map();
  private contextInsights: ContextInsights | null = null;

  constructor() {
    this.initializeReactBits();
    this.initializeContextAnalysis();
  }

  /**
   * Initialize context analysis for the current project
   */
  private async initializeContextAnalysis() {
    try {
      console.log('🔍 Initializing context analysis for smarter component generation...');
      this.contextInsights = await contextAnalyzer.analyzeProjectContext();
      console.log('✅ Context analysis ready:', {
        frameworks: Object.keys(this.contextInsights.frameworkUsage).filter(k => this.contextInsights!.frameworkUsage[k as keyof typeof this.contextInsights.frameworkUsage]),
        compatibility: this.contextInsights.recommendations.compatibilityScore
      });
    } catch (error) {
      console.warn('⚠️ Context analysis initialization failed:', error);
    }
  }

  /**
   * Initialize React Bits component library
   */
  private initializeReactBits() {
    // React Bits component templates
    this.reactBitsComponents.set('button-animated', {
      name: 'Animated Button',
      keywords: ['button', 'animated', 'hover', 'gradient'],
      code: `const AnimatedButton = ({ children, onClick, variant = 'primary', size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  const variantStyles = {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    danger: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    success: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)'
  };
  
  return (
    <button 
      onClick={onClick}
      className={\`\${sizeClasses[size]} rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-white\`}
      style={{ background: variantStyles[variant] }}
    >
      {children}
    </button>
  );
};`
    });

    this.reactBitsComponents.set('button-glow', {
      name: 'Glow Button',
      keywords: ['button', 'glow', 'shadow', 'float', 'neon'],
      code: `const GlowButton = ({ children, onClick, color = 'purple' }) => {
  const colorClasses = {
    purple: 'from-purple-500 to-pink-500 hover:shadow-purple-500/50',
    blue: 'from-blue-500 to-cyan-500 hover:shadow-blue-500/50',
    green: 'from-green-500 to-emerald-500 hover:shadow-green-500/50'
  };
  
  return (
    <button 
      onClick={onClick}
      className={\`px-8 py-4 bg-gradient-to-r \${colorClasses[color]} text-white font-bold rounded-full transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1\`}
    >
      {children}
    </button>
  );
};`
    });

    this.reactBitsComponents.set('card-glass', {
      name: 'Glass Card',
      keywords: ['card', 'glass', 'glassmorphism', 'blur', 'transparent'],
      code: `const GlassCard = ({ title, children, className = '' }) => {
  return (
    <div className={\`relative backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl \${className}\`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        {title && (
          <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        )}
        <div className="text-white/80">
          {children}
        </div>
      </div>
    </div>
  );
};`
    });

    this.reactBitsComponents.set('hero-gradient', {
      name: 'Hero Section',
      keywords: ['hero', 'section', 'landing', 'header', 'cta', 'gradient'],
      code: `const HeroSection = ({ title, subtitle, ctaText, onCtaClick }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"></div>
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in">
          {title || "Welcome to the Future"}
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 animate-fade-in-delay">
          {subtitle || "Build amazing things with cutting-edge technology"}
        </p>
        <button 
          onClick={onCtaClick}
          className="px-8 py-4 bg-white text-purple-600 font-bold rounded-full text-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          {ctaText || "Get Started"}
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
    </section>
  );
};`
    });

    this.reactBitsComponents.set('form-login', {
      name: 'Login Form',
      keywords: ['form', 'login', 'auth', 'signin', 'email', 'password'],
      code: `const LoginForm = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({ email: '', password: '' });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Sign In</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          required
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          required
        />
      </div>
      
      <button 
        type="submit"
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
      >
        Sign In
      </button>
    </form>
  );
};`
    });

    this.reactBitsComponents.set('navbar-modern', {
      name: 'Modern Navigation Bar',
      keywords: ['nav', 'navbar', 'navigation', 'menu', 'header'],
      code: `const NavigationBar = ({ logo, links = [], onLinkClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-gray-900">{logo || "Logo"}</div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); onLinkClick(link); }}
                  className="px-3 py-2 text-gray-700 hover:text-purple-600 font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-purple-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};`
    });

    console.log('✅ React Bits components initialized:', this.reactBitsComponents.size);
  }

  /**
   * Initialize Magic MCP client if available
   */
  async initialize(): Promise<boolean> {
    this.isInitialized = true;
    return true;
  }

  /**
   * Extract style specifications from prompt
   */
  private extractStyleSpecs(prompt: string): {
    shape?: string;
    colors?: string[];
    size?: string;
    effects?: string[];
  } {
    const promptLower = prompt.toLowerCase();
    const specs: any = {};
    
    // Extract shape
    if (promptLower.includes('circular') || promptLower.includes('round')) {
      specs.shape = 'circular';
    } else if (promptLower.includes('square')) {
      specs.shape = 'square';
    } else if (promptLower.includes('rounded')) {
      specs.shape = 'rounded';
    }
    
    // Extract colors
    const colorMatches = prompt.match(/\b(red|orange|yellow|green|blue|purple|pink|black|white|gray|grey|teal|cyan|indigo|gradient)\b/gi);
    if (colorMatches) {
      specs.colors = colorMatches.map(c => c.toLowerCase());
    }
    
    // Extract size
    if (promptLower.includes('large') || promptLower.includes('big')) {
      specs.size = 'large';
    } else if (promptLower.includes('small') || promptLower.includes('tiny')) {
      specs.size = 'small';
    }
    
    // Extract effects
    specs.effects = [];
    if (promptLower.includes('floating') || promptLower.includes('float')) {
      specs.effects.push('floating');
    }
    if (promptLower.includes('glow')) {
      specs.effects.push('glow');
    }
    if (promptLower.includes('shadow')) {
      specs.effects.push('shadow');
    }
    
    return specs;
  }

  /**
   * Find best matching React Bits component
   */
  private findBestComponent(prompt: string): any | null {
    const promptLower = prompt.toLowerCase();
    const keywords = promptLower.split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    this.reactBitsComponents.forEach((component, key) => {
      let score = 0;
      
      // Check if prompt contains "glow" and this is the glow button
      if (promptLower.includes('glow') && key === 'button-glow') {
        score += 10; // High priority for exact match
      }
      
      // Check each keyword
      component.keywords.forEach((keyword: string) => {
        if (keywords.includes(keyword)) score += 2;
        if (promptLower.includes(keyword)) score += 1;
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...component, key };
      }
    });

    // Only return if we have a reasonable match
    return bestScore > 0 ? bestMatch : null;
  }

  /**
   * Generate multiple component variations with AI enhancement
   */
  async generateVariations(
    options: MagicGenerationOptions,
    count: number = 3,
    onProgress?: (progress: MagicProgress) => void
  ): Promise<MagicVariationsResponse> {
    try {
      onProgress?.({
        status: 'generating',
        message: `🎨 Generating ${count} component variations...`
      });

      const response = await fetch('/api/magic/generate-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.message,
          searchQuery: options.searchQuery,
          currentFile: options.currentFilePath,
          count
        })
      });

      if (!response.ok) {
        throw new Error('Variations API unavailable');
      }

      const data = await response.json();
      
      onProgress?.({
        status: 'complete',
        message: `🎉 Generated ${data.total} variations successfully!`
      });

      return {
        success: true,
        variations: data.variations.map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          explanation: v.explanation,
          metadata: v.metadata,
          variationIndex: v.variationIndex,
          generatedAt: v.generatedAt,
          note: v.note
        })),
        total: data.total,
        prompt: data.prompt,
        generatedAt: data.generatedAt
      };
    } catch (error) {
      console.error('Variations generation failed:', error);
      
      onProgress?.({
        status: 'error',
        message: `❌ Variations failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      // Return single component as fallback
      const singleComponent = await this.generateComponent(options, onProgress);
      return {
        success: true,
        variations: [{
          id: 1,
          code: singleComponent.componentCode,
          name: singleComponent.name,
          explanation: singleComponent.explanation || 'Single component fallback',
          metadata: singleComponent.metadata,
          variationIndex: 0,
          generatedAt: new Date().toISOString(),
          note: 'Fallback to single component due to variations API error'
        }],
        total: 1,
        prompt: options.message,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Generate a context-aware UI component
   */
  async generateContextAwareComponent(
    options: MagicGenerationOptions,
    onProgress?: (progress: MagicProgress) => void
  ): Promise<MagicComponent> {
    try {
      onProgress?.({
        status: 'generating',
        message: '🔍 Analyzing project context...'
      });

      // Ensure we have context insights
      if (!this.contextInsights) {
        this.contextInsights = await contextAnalyzer.getOrAnalyzeContext();
      }

      // Generate contextual suggestions
      const suggestions = contextAnalyzer.generateContextualSuggestions(options.message, this.contextInsights);
      
      onProgress?.({
        status: 'generating',
        message: '🎯 Applying project-specific patterns...'
      });

      // Enhanced component generation with context awareness
      const component = await this.generateEnhancedComponent(options, this.contextInsights, suggestions, onProgress);
      
      // Add context metadata
      component.metadata = {
        source: component.metadata?.source || 'Context-Aware Generator',
        timestamp: component.metadata?.timestamp || new Date().toISOString(),
        searchQuery: component.metadata?.searchQuery || options.message,
        ...component.metadata,
        contextAware: true,
        frameworkUsage: this.contextInsights.frameworkUsage,
        stylingApproach: this.contextInsights.commonPatterns.stylingApproach,
        compatibilityScore: this.contextInsights.recommendations.compatibilityScore,
        appliedSuggestions: suggestions
      };

      return component;
    } catch (error) {
      console.warn('⚠️ Context-aware generation failed, falling back to standard generation:', error);
      return this.generateComponent(options, onProgress);
    }
  }

  /**
   * Generate enhanced component with context insights
   */
  private async generateEnhancedComponent(
    options: MagicGenerationOptions,
    insights: ContextInsights,
    suggestions: any,
    onProgress?: (progress: MagicProgress) => void
  ): Promise<MagicComponent> {
    // First check React Bits with context enhancement
    const matchedComponent = this.findBestComponentWithContext(options.message, insights);
    
    if (matchedComponent) {
      onProgress?.({
        status: 'generating',
        message: `✨ Enhancing ${matchedComponent.name} with project context...`
      });

      // Apply context-aware modifications to the component
      const enhancedCode = this.applyContextEnhancements(matchedComponent.code, insights, options.message);
      
      // Save to history
      componentHistory.addComponent(enhancedCode, options.message, {
        type: matchedComponent.name.toLowerCase(),
        category: this.categorizeComponent(options.message),
        customizations: {
          contextAware: true,
          frameworkUsage: insights.frameworkUsage,
          compatibilityScore: insights.recommendations.compatibilityScore
        }
      });
      
      return {
        success: true,
        componentCode: enhancedCode,
        name: matchedComponent.name,
        explanation: `Context-aware ${matchedComponent.name} optimized for your project`,
        metadata: {
          source: 'React Bits Library (Context Enhanced)',
          searchQuery: options.message,
          timestamp: new Date().toISOString(),
          enhancements: suggestions
        }
      };
    }

    // Fallback to enhanced basic generation
    return this.createContextAwareComponent(options, insights);
  }

  /**
   * Apply context enhancements to component code
   */
  private applyContextEnhancements(code: string, insights: ContextInsights, prompt: string): string {
    let enhancedCode = code;

    // Apply project color palette
    if (insights.designSystem.colorPalette.length > 0) {
      const primaryColor = insights.designSystem.colorPalette.find(c => c.includes('blue')) || insights.designSystem.colorPalette[0];
      const secondaryColor = insights.designSystem.colorPalette.find(c => c.includes('purple')) || insights.designSystem.colorPalette[1];
      
      // Replace generic colors with project colors
      enhancedCode = enhancedCode.replace(/purple-500/g, primaryColor);
      enhancedCode = enhancedCode.replace(/pink-500/g, secondaryColor);
    }

    // Apply project spacing patterns
    if (insights.designSystem.spacing.length > 0) {
      const projectSpacing = insights.designSystem.spacing[0];
      // Could enhance spacing patterns here
    }

    // Apply project border radius
    if (insights.designSystem.borderRadius.length > 0) {
      const projectRadius = insights.designSystem.borderRadius.find(r => r.includes('lg')) || insights.designSystem.borderRadius[0];
      enhancedCode = enhancedCode.replace(/rounded-lg/g, projectRadius);
    }

    // Add TypeScript annotations if project uses TypeScript
    if (insights.frameworkUsage.typescript && !enhancedCode.includes('interface')) {
      // Could enhance with better TypeScript patterns
    }

    return enhancedCode;
  }

  /**
   * Find best component with context awareness
   */
  private findBestComponentWithContext(prompt: string, insights: ContextInsights): any | null {
    const promptLower = prompt.toLowerCase();
    const bestMatch = this.findBestComponent(prompt);
    
    if (!bestMatch) return null;

    // Enhance matching score based on context
    let contextScore = 0;
    
    // Boost score if component aligns with existing components
    const componentType = bestMatch.key.split('-')[0]; // e.g., 'button' from 'button-glow'
    if (insights.existingComponents[componentType as keyof typeof insights.existingComponents]?.length > 0) {
      contextScore += 2;
    }
    
    // Boost score if styling approach matches
    if (insights.frameworkUsage.tailwindcss && bestMatch.code.includes('className')) {
      contextScore += 1;
    }
    
    // Return enhanced match if context score is good
    return contextScore > 0 ? bestMatch : bestMatch;
  }

  /**
   * Create context-aware component
   */
  private createContextAwareComponent(options: MagicGenerationOptions, insights: ContextInsights): MagicComponent {
    const componentName = this.generateComponentName(options.message);
    const enhancedCode = this.generateContextAwareCode(componentName, options.message, insights);

    // Save to history
    componentHistory.addComponent(enhancedCode, options.message, {
      type: componentName.toLowerCase(),
      category: this.categorizeComponent(options.message),
      customizations: {
        contextAware: true,
        frameworkUsage: insights.frameworkUsage,
        compatibilityScore: insights.recommendations.compatibilityScore
      }
    });

    return {
      success: true,
      componentCode: enhancedCode,
      name: componentName,
      explanation: `Context-aware component optimized for your ${insights.frameworkUsage.typescript ? 'TypeScript ' : ''}React project`,
      metadata: {
        source: 'Context-Aware Generator',
        searchQuery: options.message,
        timestamp: new Date().toISOString(),
        contextScore: insights.recommendations.compatibilityScore
      }
    };
  }

  /**
   * Generate context-aware component code
   */
  private generateContextAwareCode(componentName: string, description: string, insights: ContextInsights): string {
    const isButton = description.toLowerCase().includes('button');
    const isCard = description.toLowerCase().includes('card');
    
    // Use project color palette
    const primaryColor = insights.designSystem.colorPalette.find(c => c.includes('blue')) || 'blue-500';
    const secondaryColor = insights.designSystem.colorPalette.find(c => c.includes('purple')) || 'purple-500';
    const textColor = insights.designSystem.colorPalette.find(c => c.includes('gray-900')) || 'gray-900';
    
    // Use project spacing
    const spacing = insights.designSystem.spacing.find(s => s.includes('px-6')) || 'px-6 py-3';
    const borderRadius = insights.designSystem.borderRadius.find(r => r.includes('lg')) || 'rounded-lg';
    
    if (isButton) {
      return `// React component (no imports needed for preview)

const ${componentName} = ({ 
  children = "Click Me", 
  onClick, 
  className = "",
  variant = 'primary',
  size = 'md',
  disabled = false
}) => {
  const baseClasses = "font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "${spacing} text-base",
    lg: "px-8 py-4 text-lg"
  };
  
  const variantClasses = {
    primary: \`bg-\${primaryColor.replace('-', '-')} hover:bg-\${primaryColor.replace(/\\d+/, m => String(Number(m) + 100))} text-white focus:ring-\${primaryColor.split('-')[0]}-500\`,
    secondary: \`bg-\${secondaryColor.replace('-', '-')} hover:bg-\${secondaryColor.replace(/\\d+/, m => String(Number(m) + 100))} text-white focus:ring-\${secondaryColor.split('-')[0]}-500\`,
    outline: \`border-2 border-\${primaryColor.replace('-', '-')} text-\${primaryColor.replace('-', '-')} hover:bg-\${primaryColor.replace('-', '-')} hover:text-white focus:ring-\${primaryColor.split('-')[0]}-500\`
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`\${baseClasses} \${sizeClasses[size]} \${variantClasses[variant]} ${borderRadius} \${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform hover:scale-105'} \${className}\`}
    >
      {children}
    </button>
  );
};

export default ${componentName};`;
    }

    if (isCard) {
      return `// React component (no imports needed for preview)

const ${componentName} = ({ 
  title,
  children,
  className = "",
  shadow = 'lg',
  padding = 'md'
}) => {
  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md', 
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={\`bg-white ${borderRadius} border border-gray-200 \${shadowClasses[shadow]} \${paddingClasses[padding]} \${className}\`}>
      {title && (
        <h3 className="text-xl font-semibold text-${textColor} mb-4">
          {title}
        </h3>
      )}
      <div className="text-gray-600">
        {children || "Card content goes here"}
      </div>
    </div>
  );
};

export default ${componentName};`;
    }

    // Default enhanced component
    return this.generateBasicComponentCode(componentName, description);
  }

  /**
   * Generate a UI component with AI enhancement (now includes context awareness)
   */
  async generateComponent(
    options: MagicGenerationOptions,
    onProgress?: (progress: MagicProgress) => void
  ): Promise<MagicComponent> {
    // Use context-aware generation if available
    if (this.contextInsights) {
      return this.generateContextAwareComponent(options, onProgress);
    }

    try {
      onProgress?.({
        status: 'generating',
        message: '🔍 Searching React Bits library...'
      });

      // First, try to find a matching React Bits component
      const matchedComponent = this.findBestComponent(options.message);
      
      if (matchedComponent) {
        onProgress?.({
          status: 'generating',
          message: `✨ Found matching component: ${matchedComponent.name}`
        });

        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing

        return {
          success: true,
          componentCode: matchedComponent.code,
          name: matchedComponent.name,
          explanation: `Generated from React Bits library: ${matchedComponent.name}`,
          metadata: {
            source: 'React Bits Library',
            searchQuery: options.message,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Try backend AI generation
      onProgress?.({
        status: 'generating',
        message: '🤖 Generating with AI...'
      });

      const response = await this.callBackendAPI(options, onProgress);
      
      if (response.success) {
        return response;
      }

      // Fallback to basic generation
      return this.createFallbackComponent(options);
      
    } catch (error) {
      console.error('Magic component generation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      onProgress?.({
        status: 'error',
        message: `Magic generation failed: ${errorMessage}`
      });

      // Return a fallback component
      return this.createFallbackComponent(options);
    }
  }

  /**
   * Call backend API for AI generation
   */
  private async callBackendAPI(
    options: MagicGenerationOptions,
    onProgress?: (progress: MagicProgress) => void
  ): Promise<MagicComponent> {
    try {
      const response = await fetch('/api/magic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.message,
          searchQuery: options.searchQuery,
          currentFile: options.currentFilePath
        })
      });

      if (!response.ok) {
        throw new Error('Backend API unavailable');
      }

      const data = await response.json();
      
      return {
        success: true,
        componentCode: data.code,
        name: data.name,
        explanation: data.explanation,
        metadata: {
          source: data.source || 'AI Generation',
          searchQuery: options.searchQuery,
          timestamp: new Date().toISOString(),
          componentType: data.metadata?.componentType,
          quality: data.metadata?.quality
        }
      };
    } catch (error) {
      console.warn('Backend API call failed, using fallback:', error);
      throw error;
    }
  }

  /**
   * Create a fallback component when other methods fail
   */
  private createFallbackComponent(options: MagicGenerationOptions): MagicComponent {
    const componentName = this.generateComponentName(options.message);
    const componentCode = this.generateBasicComponentCode(componentName, options.message);

    return {
      success: true,
      componentCode,
      name: componentName,
      explanation: 'Basic component template',
      metadata: {
        source: 'Fallback Generator',
        searchQuery: options.searchQuery,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate a component name from the user's message
   */
  private generateComponentName(message: string): string {
    // Remove special characters and create PascalCase name
    const words = message
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    if (words.length === 0) {
      return 'CustomComponent';
    }
    
    // Create component name in PascalCase
    const componentName = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    // Ensure it starts with a letter
    if (!/^[A-Z]/.test(componentName)) {
      return 'Custom' + componentName;
    }
    
    return componentName;
  }

  /**
   * Generate basic component code as fallback
   */
  private generateBasicComponentCode(componentName: string, description: string): string {
    const isButton = description.toLowerCase().includes('button');
    const isCard = description.toLowerCase().includes('card');
    const isForm = description.toLowerCase().includes('form');
    const isPricing = description.toLowerCase().includes('pricing') || description.toLowerCase().includes('price');
    const isTable = description.toLowerCase().includes('table');
    const isHero = description.toLowerCase().includes('hero') || description.toLowerCase().includes('banner') || description.toLowerCase().includes('landing');
    
    // Extract style specifications
    const styleSpecs = this.extractStyleSpecs(description);

    if (isButton) {
      // Build gradient colors based on specifications
      let gradientColors = 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
      if (styleSpecs.colors) {
        if (styleSpecs.colors.includes('orange')) {
          gradientColors = 'from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700';
        } else if (styleSpecs.colors.includes('yellow')) {
          gradientColors = 'from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700';
        } else if (styleSpecs.colors.includes('blue')) {
          gradientColors = 'from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700';
        } else if (styleSpecs.colors.includes('green')) {
          gradientColors = 'from-green-400 to-green-600 hover:from-green-500 hover:to-green-700';
        } else if (styleSpecs.colors.includes('red')) {
          gradientColors = 'from-red-400 to-red-600 hover:from-red-500 hover:to-red-700';
        } else if (styleSpecs.colors.includes('gray') || styleSpecs.colors.includes('grey')) {
          gradientColors = 'from-gray-400 to-gray-600 hover:from-gray-500 hover:to-gray-700';
        } else if (styleSpecs.colors.includes('teal')) {
          gradientColors = 'from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700';
        } else if (styleSpecs.colors.includes('indigo')) {
          gradientColors = 'from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700';
        } else if (styleSpecs.colors.includes('cyan')) {
          gradientColors = 'from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700';
        }
      }
      
      // Build shape styles
      let shapeStyles = 'rounded-lg';
      if (styleSpecs.shape === 'circular') {
        shapeStyles = 'rounded-full';
      } else if (styleSpecs.shape === 'square') {
        shapeStyles = 'rounded-none';
      }
      
      // Build size styles
      let sizeStyles = 'px-6 py-3 text-base';
      if (styleSpecs.size === 'large') {
        sizeStyles = 'px-10 py-5 text-lg';
      } else if (styleSpecs.size === 'small') {
        sizeStyles = 'px-4 py-2 text-sm';
      }
      
      // Build effect styles
      let effectStyles = 'transition-all duration-300 transform hover:scale-105';
      if (styleSpecs.effects?.includes('floating')) {
        effectStyles += ' animate-bounce';
      }
      if (styleSpecs.effects?.includes('glow')) {
        effectStyles += ' shadow-lg hover:shadow-2xl';
      }
      
      // Special handling for circular floating button
      if (styleSpecs.shape === 'circular' && styleSpecs.effects?.includes('floating')) {
        return `const ${componentName} = ({ 
  children = "✨", 
  onClick, 
  className = "" 
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={\`fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br ${gradientColors} text-white font-bold ${shapeStyles} shadow-2xl transition-all duration-300 transform \${isHovered ? 'scale-110 rotate-12' : 'scale-100 rotate-0'} \${className}\`}
      style={{
        animation: 'float 3s ease-in-out infinite'
      }}
    >
      <span className="text-2xl">{children}</span>
      <style jsx>{\`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      \`}</style>
    </button>
  );
};

export default ${componentName};`;
      }
      
      return `// React component (no imports needed for preview)

const ${componentName} = ({ 
  children = "Click Me", 
  onClick, 
  className = "" 
}) => {
  return (
    <button
      onClick={onClick}
      className={\`${sizeStyles} bg-gradient-to-r ${gradientColors} text-white font-medium ${shapeStyles} ${effectStyles} \${className}\`}
    >
      {children}
    </button>
  );
};

export default ${componentName};`;
    }

    if (isCard) {
      return `// React component (no imports needed for preview)

const ${componentName} = ({ 
  title = "Card Title",
  children,
  className = "" 
}) => {
  return (
    <div className={\`bg-white rounded-xl border border-gray-200 shadow-lg p-6 \${className}\`}>
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {title}
        </h3>
      )}
      <div className="text-gray-600">
        {children || "Card content goes here"}
      </div>
    </div>
  );
};

export default ${componentName};`;
    }

    // Pricing table component with variations
    if (isPricing || (isTable && description.toLowerCase().includes('plan'))) {
      // Create variations based on description keywords
      const isModern = description.toLowerCase().includes('modern') || description.toLowerCase().includes('creative');
      const isDark = description.toLowerCase().includes('dark') || description.toLowerCase().includes('alternative');
      const isCompact = description.toLowerCase().includes('compact') || description.toLowerCase().includes('small');
      const isEnterprise = description.toLowerCase().includes('enterprise') || description.toLowerCase().includes('business');
      
      // Generate different pricing structures based on context
      let plans, bgStyle, cardStyle, titleText;
      
      if (isEnterprise) {
        plans = [
          { name: "Starter", price: "$49", period: "/month", features: ["Up to 10 users", "5GB storage", "Basic support", "Core features"], buttonText: "Start Free Trial" },
          { name: "Professional", price: "$149", period: "/month", features: ["Up to 100 users", "50GB storage", "Priority support", "Advanced analytics", "API access"], popular: true, buttonText: "Get Started" },
          { name: "Enterprise", price: "$499", period: "/month", features: ["Unlimited users", "Unlimited storage", "24/7 dedicated support", "Custom integrations", "White-label solution", "SLA guarantee"], buttonText: "Contact Sales" }
        ];
        titleText = "Enterprise Solutions";
      } else if (isCompact) {
        plans = [
          { name: "Basic", price: "$5", period: "/mo", features: ["5 projects", "1GB storage", "Email support"], buttonText: "Start" },
          { name: "Pro", price: "$15", period: "/mo", features: ["Unlimited projects", "10GB storage", "Priority support", "Analytics"], popular: true, buttonText: "Upgrade" }
        ];
        titleText = "Simple Pricing";
      } else {
        plans = [
          { name: "Hobby", price: "$9", period: "/month", features: ["5 Projects", "10GB Storage", "Community Support", "Basic Templates"], buttonText: "Get Started" },
          { name: "Creator", price: "$29", period: "/month", features: ["Unlimited Projects", "100GB Storage", "Priority Support", "Premium Templates", "Custom Domains"], popular: true, buttonText: "Start Creating" },
          { name: "Team", price: "$99", period: "/month", features: ["Everything in Creator", "Team Collaboration", "Advanced Analytics", "Custom Branding", "API Access", "24/7 Support"], buttonText: "Try Team Plan" }
        ];
        titleText = "Choose Your Creative Plan";
      }
      
      if (isDark) {
        bgStyle = "bg-gradient-to-br from-gray-900 to-black";
        cardStyle = "bg-gray-800 text-white border-gray-700";
      } else if (isModern) {
        bgStyle = "bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50";
        cardStyle = "bg-white/80 backdrop-blur-sm border-white/20";
      } else {
        bgStyle = "bg-gradient-to-br from-slate-50 to-blue-50";
        cardStyle = "bg-white";
      }

      // FIXED: Generate pure React.createElement code - NO JSX template literals
      return `const ${componentName} = ({ className = "", plans = ${JSON.stringify(plans)} }) => {
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  
  const isDark = ${isDark};
  const bgClassName = "${bgStyle}";
  const cardClassName = "${cardStyle}";
  const titleText = "${titleText}";

  return React.createElement('div', {
    className: 'py-12 px-4 ' + bgClassName + ' ' + (className || '')
  }, 
    React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'text-center mb-12' },
        React.createElement('h2', { 
          className: 'text-4xl font-bold mb-4 ' + (isDark ? 'text-white' : 'text-gray-900')
        }, titleText),
        React.createElement('p', { 
          className: 'text-xl ' + (isDark ? 'text-gray-300' : 'text-gray-600')
        }, 'Select the perfect plan for your needs')
      ),
      
      React.createElement('div', { className: 'grid md:grid-cols-3 gap-8' },
        plans.map((plan, index) => 
          React.createElement('div', {
            key: index,
            className: 'relative ' + cardClassName + ' rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105' + 
              (plan.popular ? ' ring-2 ring-blue-500 ring-opacity-50' : '') +
              (selectedPlan === plan.name ? ' ring-2 ring-green-500' : ''),
            onClick: () => setSelectedPlan(plan.name)
          },
            plan.popular && React.createElement('div', { 
              className: 'absolute -top-4 left-1/2 transform -translate-x-1/2' 
            },
              React.createElement('span', { 
                className: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold'
              }, 'Most Popular')
            ),
            
            React.createElement('div', { className: 'p-8' },
              React.createElement('h3', { 
                className: 'text-2xl font-bold mb-2 ' + (isDark ? 'text-white' : 'text-gray-900')
              }, plan.name),
              
              React.createElement('div', { className: 'flex items-baseline mb-6' },
                React.createElement('span', { 
                  className: 'text-5xl font-bold ' + (isDark ? 'text-white' : 'text-gray-900')
                }, plan.price),
                React.createElement('span', { 
                  className: 'text-xl ml-1 ' + (isDark ? 'text-gray-400' : 'text-gray-500')
                }, plan.period)
              ),
              
              React.createElement('ul', { className: 'space-y-4 mb-8' },
                plan.features.map((feature, featureIndex) =>
                  React.createElement('li', { 
                    key: featureIndex, 
                    className: 'flex items-center'
                  },
                    React.createElement('svg', { 
                      className: 'w-5 h-5 text-green-500 mr-3',
                      fill: 'currentColor',
                      viewBox: '0 0 20 20'
                    },
                      React.createElement('path', {
                        fillRule: 'evenodd',
                        d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                        clipRule: 'evenodd'
                      })
                    ),
                    React.createElement('span', { 
                      className: isDark ? 'text-gray-300' : 'text-gray-700'
                    }, feature)
                  )
                )
              ),
              
              React.createElement('button', {
                className: 'w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ' +
                  (plan.popular 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200')
              }, plan.buttonText || 'Get Started')
            )
          )
        )
      ),
      
      React.createElement('div', { className: 'text-center mt-12' },
        React.createElement('p', { 
          className: isDark ? 'text-gray-400' : 'text-gray-600'
        }, 'All plans include a 30-day money-back guarantee')
      )
    )
  );
};

export default ${componentName};`;
    }

    // Hero section component with variations
    if (isHero) {
      // Create variations based on description keywords
      const isMinimal = description.toLowerCase().includes('minimal') || description.toLowerCase().includes('simple');
      const isDark = description.toLowerCase().includes('dark') || description.toLowerCase().includes('alternative');
      const isCreative = description.toLowerCase().includes('creative') || description.toLowerCase().includes('modern');
      const isStartup = description.toLowerCase().includes('startup') || description.toLowerCase().includes('tech');
      
      // Generate different hero structures based on context
      let heroContent, bgStyle, textStyle, buttonStyle;
      
      if (isStartup) {
        heroContent = {
          title: "Build the Future with AI",
          subtitle: "Revolutionary platform that transforms how teams collaborate and innovate",
          ctaText: "Start Building",
          secondaryCta: "Watch Demo"
        };
        bgStyle = "bg-gradient-to-br from-blue-900 via-purple-900 to-black";
        textStyle = "text-white";
      } else if (isMinimal) {
        heroContent = {
          title: "Simple. Powerful. Effective.",
          subtitle: "The tool you need to get things done",
          ctaText: "Get Started",
          secondaryCta: "Learn More"
        };
        bgStyle = "bg-white";
        textStyle = "text-gray-900";
      } else if (isCreative) {
        heroContent = {
          title: "Unleash Your Creativity",
          subtitle: "Design, create, and share your vision with the world",
          ctaText: "Create Now",
          secondaryCta: "Explore Gallery"
        };
        bgStyle = "bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600";
        textStyle = "text-white";
      } else {
        heroContent = {
          title: "Welcome to Something Amazing",
          subtitle: "Discover the power of innovation and take your projects to the next level",
          ctaText: "Get Started",
          secondaryCta: "Learn More"
        };
        bgStyle = "bg-gradient-to-br from-blue-600 to-purple-700";
        textStyle = "text-white";
      }
      
      if (isDark) {
        bgStyle = "bg-gradient-to-br from-gray-900 to-black";
        textStyle = "text-white";
      }

      return `const ${componentName} = ({ 
  className = "",
  title = "${heroContent.title}",
  subtitle = "${heroContent.subtitle}",
  ctaText = "${heroContent.ctaText}",
  secondaryCta = "${heroContent.secondaryCta}",
  onPrimaryClick,
  onSecondaryClick
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Component styling based on variant
  const isDark = ${isDark};
  const bgClassName = "${bgStyle}";
  const textClassName = "${textStyle}";

  return (
    <div className={\`relative min-h-screen flex items-center justify-center \${bgClassName} \${className}\`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className={\`text-5xl md:text-7xl font-bold mb-8 leading-tight \${textClassName}\`}>
            {title}
          </h1>
          
          <p className={\`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed \${
            isDark ? 'text-gray-300' : textClassName === 'text-white' ? 'text-white/90' : 'text-gray-600'
          }\`}>
            {subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={onPrimaryClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={\`px-8 py-4 bg-white text-gray-900 font-semibold rounded-full text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl \${
                isHovered ? 'shadow-2xl scale-105' : 'shadow-xl'
              }\`}
            >
              {ctaText}
            </button>
            
            <button
              onClick={onSecondaryClick}
              className={\`px-8 py-4 border-2 \${
                textClassName === 'text-white' ? 'border-white text-white hover:bg-white hover:text-gray-900' : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
              } font-semibold rounded-full text-lg transition-all duration-300 hover:scale-105\`}
            >
              {secondaryCta}
            </button>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/5 rounded-full blur-lg animate-bounce"></div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className={\`w-6 h-10 border-2 \${textClassName === 'text-white' ? 'border-white' : 'border-gray-900'} rounded-full flex justify-center\`}>
          <div className={\`w-1 h-3 \${textClassName === 'text-white' ? 'bg-white' : 'bg-gray-900'} rounded-full mt-2 animate-pulse\`}></div>
        </div>
      </div>
    </div>
  );
};

export default ${componentName};`;
    }

    // Default component
    return `// React component (no imports needed for preview)

const ${componentName} = ({ 
  className = "",
  children 
}) => {
  return (
    <div className={\`p-4 bg-gray-50 border border-gray-200 rounded-md \${className}\`}>
      {children || "${description}"}
    </div>
  );
};

export default ${componentName};`;
  }

  /**
   * Check if Magic MCP is available and ready
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Get Magic MCP status information
   */
  getStatus(): { available: boolean; initialized: boolean; connected: boolean } {
    return {
      available: true,
      initialized: this.isInitialized,
      connected: true
    };
  }

  /**
   * Categorize component based on prompt
   */
  private categorizeComponent(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('button') || promptLower.includes('cta')) return 'buttons';
    if (promptLower.includes('form') || promptLower.includes('input')) return 'forms';
    if (promptLower.includes('card') || promptLower.includes('pricing')) return 'cards';
    if (promptLower.includes('nav') || promptLower.includes('menu')) return 'navigation';
    if (promptLower.includes('hero') || promptLower.includes('header')) return 'heroes';
    if (promptLower.includes('modal') || promptLower.includes('dialog')) return 'modals';
    return 'general';
  }

  /**
   * Get current context insights for UI display
   */
  async getContextInsights(): Promise<ContextInsights | null> {
    if (!this.contextInsights) {
      try {
        this.contextInsights = await contextAnalyzer.getOrAnalyzeContext();
      } catch (error) {
        console.warn('⚠️ Failed to get context insights:', error);
        return null;
      }
    }
    return this.contextInsights;
  }

  /**
   * Force refresh of context analysis
   */
  async refreshContext(): Promise<void> {
    console.log('🔄 Refreshing project context analysis...');
    contextAnalyzer.clearCache();
    this.contextInsights = null;
    await this.initializeContextAnalysis();
  }

  /**
   * Get context-aware suggestions for a prompt
   */
  async getContextSuggestions(prompt: string): Promise<{
    styling: string[];
    patterns: string[];
    compatibility: string[];
  } | null> {
    const insights = await this.getContextInsights();
    if (!insights) return null;
    
    return contextAnalyzer.generateContextualSuggestions(prompt, insights);
  }
}

// Create singleton instance
const magicUIService = new MagicUIService();

export default magicUIService;
export type { MagicProgress, MagicComponent, MagicGenerationOptions, MagicVariation, MagicVariationsResponse };