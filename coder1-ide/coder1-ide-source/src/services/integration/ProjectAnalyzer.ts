/**
 * Project Analyzer Service
 * Analyzes project structure, detects frameworks, styling systems, and code patterns
 * to enable context-aware component generation
 */

export type Framework = 'React' | 'Vue' | 'Angular' | 'Svelte' | 'Next' | 'Vanilla';
export type StylingSystem = 'Tailwind' | 'StyledComponents' | 'CSSModules' | 'SCSS' | 'CSS' | 'Emotion';
export type CodeStyle = {
  indentation: 'tabs' | 'spaces';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  componentPattern: 'function' | 'arrow' | 'class';
  propsPattern: 'destructured' | 'props';
};

export interface ProjectContext {
  framework: Framework;
  styling: StylingSystem;
  imports: string[];
  existingComponents: string[];
  codeStyle: CodeStyle;
  dependencies: Record<string, string>;
  isTypeScript: boolean;
}

class ProjectAnalyzer {
  private static instance: ProjectAnalyzer;
  private cachedContext: ProjectContext | null = null;

  private constructor() {}

  public static getInstance(): ProjectAnalyzer {
    if (!ProjectAnalyzer.instance) {
      ProjectAnalyzer.instance = new ProjectAnalyzer();
    }
    return ProjectAnalyzer.instance;
  }

  /**
   * Analyze the current project and return context
   */
  public analyzeProject(
    code: string,
    fileName: string,
    packageJson?: any
  ): ProjectContext {
    const framework = this.detectFramework(code, packageJson);
    const styling = this.detectStyling(code, packageJson);
    const imports = this.extractImportedLibraries(code);
    const existingComponents = this.extractComponents(code, framework);
    const codeStyle = this.analyzeCodeStyle(code);
    const dependencies = packageJson?.dependencies || {};
    const isTypeScript = fileName.endsWith('.ts') || fileName.endsWith('.tsx');

    const context: ProjectContext = {
      framework,
      styling,
      imports,
      existingComponents,
      codeStyle,
      dependencies,
      isTypeScript
    };

    this.cachedContext = context;
    return context;
  }

  /**
   * Detect the framework being used
   */
  public detectFramework(code: string, packageJson?: any): Framework {
    // Check imports first
    if (code.includes('from \'react\'') || code.includes('from "react"')) {
      if (code.includes('from \'next\'') || code.includes('from "next"')) {
        return 'Next';
      }
      return 'React';
    }

    if (code.includes('from \'vue\'') || code.includes('from "vue"') || 
        code.includes('from \'@vue') || code.includes('from "@vue')) {
      return 'Vue';
    }

    if (code.includes('from \'@angular') || code.includes('from "@angular') ||
        code.includes('@Component') || code.includes('@Injectable')) {
      return 'Angular';
    }

    if (code.includes('from \'svelte\'') || code.includes('from "svelte"') ||
        code.includes('<script>') && code.includes('<style>')) {
      return 'Svelte';
    }

    // Check package.json dependencies
    if (packageJson?.dependencies) {
      if (packageJson.dependencies.react) {
        return packageJson.dependencies.next ? 'Next' : 'React';
      }
      if (packageJson.dependencies.vue) return 'Vue';
      if (packageJson.dependencies['@angular/core']) return 'Angular';
      if (packageJson.dependencies.svelte) return 'Svelte';
    }

    // Check for JSX syntax
    if (/<[A-Z]\w*/.test(code) && /\/>/.test(code)) {
      return 'React';
    }

    return 'Vanilla';
  }

  /**
   * Detect the styling system being used
   */
  public detectStyling(code: string, packageJson?: any): StylingSystem {
    // Check for Tailwind classes
    if (/className=["'][^"']*(?:flex|grid|p-\d|m-\d|bg-\w+|text-\w+)/i.test(code)) {
      if (packageJson?.dependencies?.tailwindcss || 
          packageJson?.devDependencies?.tailwindcss) {
        return 'Tailwind';
      }
    }

    // Check for styled-components
    if (code.includes('styled.') || code.includes('styled(') ||
        code.includes('from \'styled-components\'') || 
        code.includes('from "styled-components"')) {
      return 'StyledComponents';
    }

    // Check for Emotion
    if (code.includes('from \'@emotion') || code.includes('from "@emotion') ||
        code.includes('css`') && code.includes('jsx')) {
      return 'Emotion';
    }

    // Check for CSS Modules
    if (/import\s+\w+\s+from\s+['"].*\.module\.css['"]/.test(code) ||
        code.includes('styles.') && code.includes('.module.css')) {
      return 'CSSModules';
    }

    // Check for SCSS
    if (/import\s+['"].*\.scss['"]/.test(code) ||
        packageJson?.dependencies?.sass || 
        packageJson?.devDependencies?.sass) {
      return 'SCSS';
    }

    return 'CSS';
  }

  /**
   * Extract imported libraries
   */
  public extractImportedLibraries(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const module = match[1];
      if (!module.startsWith('.') && !module.startsWith('/')) {
        imports.push(module);
      }
    }
    
    return Array.from(new Set(imports)); // Remove duplicates
  }

  /**
   * Extract component names from the code
   */
  public extractComponents(code: string, framework: Framework): string[] {
    const components: string[] = [];

    if (framework === 'React' || framework === 'Next') {
      // Function components
      const funcRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=|:|\()/g;
      let match;
      while ((match = funcRegex.exec(code)) !== null) {
        components.push(match[1]);
      }

      // Class components
      const classRegex = /class\s+([A-Z]\w+)\s+extends\s+(?:React\.)?Component/g;
      while ((match = classRegex.exec(code)) !== null) {
        components.push(match[1]);
      }
    } else if (framework === 'Vue') {
      // Vue components
      const vueRegex = /export\s+default\s+\{[\s\S]*?name:\s*['"](\w+)['"]/g;
      let match;
      while ((match = vueRegex.exec(code)) !== null) {
        components.push(match[1]);
      }
    } else if (framework === 'Angular') {
      // Angular components
      const ngRegex = /@Component\s*\([^)]*\)[\s\S]*?export\s+class\s+(\w+)/g;
      let match;
      while ((match = ngRegex.exec(code)) !== null) {
        components.push(match[1]);
      }
    }

    return components;
  }

  /**
   * Analyze code style patterns
   */
  public analyzeCodeStyle(code: string): CodeStyle {
    // Detect indentation
    const lines = code.split('\n');
    let useTabs = false;
    let indentSize = 2;
    
    for (const line of lines) {
      if (line.startsWith('\t')) {
        useTabs = true;
        break;
      } else if (line.startsWith('  ')) {
        const match = line.match(/^(\s+)/);
        if (match) {
          indentSize = match[1].length;
          break;
        }
      }
    }

    // Detect quotes
    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;
    const quotes = singleQuotes > doubleQuotes ? 'single' : 'double';

    // Detect semicolons
    const semicolons = /;\s*$/m.test(code);

    // Detect component pattern (React specific)
    let componentPattern: 'function' | 'arrow' | 'class' = 'function';
    if (/const\s+[A-Z]\w+\s*=\s*\(/.test(code)) {
      componentPattern = 'arrow';
    } else if (/class\s+[A-Z]\w+\s+extends/.test(code)) {
      componentPattern = 'class';
    }

    // Detect props pattern
    const propsPattern = /\(\s*\{[\s\S]*?\}\s*\)/.test(code) ? 'destructured' : 'props';

    return {
      indentation: useTabs ? 'tabs' : 'spaces',
      indentSize,
      quotes,
      semicolons,
      componentPattern,
      propsPattern
    };
  }

  /**
   * Get contextual suggestions based on project analysis
   */
  public getContextualSuggestions(context: ProjectContext): string[] {
    const suggestions: string[] = [];

    // Framework-specific suggestions
    if (context.framework === 'React' || context.framework === 'Next') {
      suggestions.push(
        'Create a form component with validation',
        'Generate a data table with sorting',
        'Build a modal dialog component',
        'Create a navigation menu',
        'Generate a card component'
      );

      if (context.framework === 'Next') {
        suggestions.push(
          'Create a server component',
          'Build an API route handler',
          'Generate a dynamic page component'
        );
      }
    }

    // Styling-specific suggestions
    if (context.styling === 'Tailwind') {
      suggestions.push(
        'Create a responsive grid layout',
        'Build a dark mode toggle component',
        'Generate a hero section with Tailwind'
      );
    }

    // Add suggestions based on existing components
    if (context.existingComponents.includes('Button')) {
      suggestions.push('Create a ButtonGroup component');
    }

    if (context.existingComponents.includes('Card')) {
      suggestions.push('Create a CardGrid component');
    }

    return suggestions;
  }

  /**
   * Generate a context-aware system prompt for AI
   */
  public generateSystemPrompt(context: ProjectContext, userPrompt: string): string {
    const { framework, styling, codeStyle, isTypeScript, imports } = context;

    let prompt = `Generate a ${framework} component with the following specifications:\n\n`;
    
    prompt += `User Request: ${userPrompt}\n\n`;
    
    prompt += `Technical Requirements:\n`;
    prompt += `- Framework: ${framework}\n`;
    prompt += `- Language: ${isTypeScript ? 'TypeScript' : 'JavaScript'}\n`;
    prompt += `- Styling: ${styling}\n`;
    
    if (styling === 'Tailwind') {
      prompt += `- Use Tailwind CSS classes for all styling\n`;
    } else if (styling === 'StyledComponents') {
      prompt += `- Use styled-components for styling\n`;
    } else if (styling === 'CSSModules') {
      prompt += `- Use CSS Modules with styles object\n`;
    }
    
    prompt += `\nCode Style Requirements:\n`;
    prompt += `- Indentation: ${codeStyle.indentation === 'tabs' ? 'tabs' : `${codeStyle.indentSize} spaces`}\n`;
    prompt += `- Quotes: ${codeStyle.quotes} quotes\n`;
    prompt += `- Semicolons: ${codeStyle.semicolons ? 'use semicolons' : 'no semicolons'}\n`;
    
    if (framework === 'React' || framework === 'Next') {
      prompt += `- Component style: ${codeStyle.componentPattern} components\n`;
      prompt += `- Props pattern: ${codeStyle.propsPattern}\n`;
    }
    
    if (imports.length > 0) {
      prompt += `\nProject uses these libraries (use them if relevant):\n`;
      prompt += imports.slice(0, 10).map(imp => `- ${imp}`).join('\n');
    }
    
    prompt += `\n\nIMPORTANT: 
- Generate ONLY the component code
- Include all necessary imports
- Follow the exact code style patterns specified
- Make the component production-ready
- Add helpful comments where appropriate`;

    return prompt;
  }

  /**
   * Check if a dependency is installed
   */
  public hasDependency(dependencyName: string): boolean {
    return Boolean(this.cachedContext?.dependencies[dependencyName]);
  }

  /**
   * Get the cached project context
   */
  public getCachedContext(): ProjectContext | null {
    return this.cachedContext;
  }
}

export default ProjectAnalyzer;