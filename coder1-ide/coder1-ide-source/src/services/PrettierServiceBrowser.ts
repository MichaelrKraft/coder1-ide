// Browser-compatible Prettier service using dynamic imports
export interface PrettierConfig {
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: "none" | "es5" | "all";
  bracketSpacing: boolean;
  jsxBracketSameLine: boolean;
  arrowParens: "always" | "avoid";
  printWidth: number;
  endOfLine: "lf" | "crlf" | "cr" | "auto";
}

export interface FormatResult {
  success: boolean;
  formatted?: string;
  error?: string;
  suggestions?: string[];
}

class PrettierServiceBrowser {
  private prettier: any = null;
  private plugins: any = {};
  private isLoaded = false;
  
  private defaultConfig: PrettierConfig = {
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "es5",
    bracketSpacing: true,
    jsxBracketSameLine: false,
    arrowParens: "always",
    printWidth: 80,
    endOfLine: "lf",
  };

  private userConfig: Partial<PrettierConfig> = {};

  constructor() {
    this.loadPrettier();
    this.loadUserConfig();
  }

  private async loadPrettier() {
    if (this.isLoaded) return;
    
    try {
      // Try to load from node_modules first
      const [prettierModule, babel, typescript, postcss, html] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/typescript'),
        import('prettier/plugins/postcss'),
        import('prettier/plugins/html'),
      ]);
      
      this.prettier = prettierModule.default || prettierModule;
      this.plugins = {
        babel: babel.default || babel,
        typescript: typescript.default || typescript,
        postcss: postcss.default || postcss,
        html: html.default || html,
      };
      
      this.isLoaded = true;
      console.log('Prettier loaded successfully from node_modules');
    } catch (error) {
      console.warn('Failed to load Prettier from node_modules, trying CDN fallback', error);
      await this.loadFromCDN();
    }
  }

  private async loadFromCDN() {
    try {
      // Load Prettier from CDN as fallback
      const scripts = [
        'https://unpkg.com/prettier@3.3.3/standalone.js',
        'https://unpkg.com/prettier@3.3.3/plugins/babel.js',
        'https://unpkg.com/prettier@3.3.3/plugins/typescript.js',
        'https://unpkg.com/prettier@3.3.3/plugins/postcss.js',
        'https://unpkg.com/prettier@3.3.3/plugins/html.js',
      ];

      for (const src of scripts) {
        await this.loadScript(src);
      }

      // Access global Prettier objects
      this.prettier = (window as any).prettier;
      this.plugins = {
        babel: (window as any).prettierPlugins.babel,
        typescript: (window as any).prettierPlugins.typescript,
        postcss: (window as any).prettierPlugins.postcss,
        html: (window as any).prettierPlugins.html,
      };

      this.isLoaded = true;
      console.log('Prettier loaded successfully from CDN');
    } catch (error) {
      console.error('Failed to load Prettier from CDN', error);
      this.isLoaded = false;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private async loadUserConfig(): Promise<void> {
    try {
      const response = await fetch("/api/user/prettier-config");
      if (response.ok) {
        const config = await response.json();
        this.userConfig = config;
      }
    } catch (error) {
      console.log("Using default Prettier config");
    }
  }

  async saveUserConfig(config: Partial<PrettierConfig>): Promise<void> {
    try {
      await fetch("/api/user/prettier-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      this.userConfig = config;
    } catch (error) {
      console.error("Failed to save Prettier config:", error);
    }
  }

  private getConfig(): PrettierConfig {
    return { ...this.defaultConfig, ...this.userConfig };
  }

  private detectParser(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const parserMap: { [key: string]: string } = {
      js: "babel",
      jsx: "babel",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "scss",
      less: "less",
      md: "markdown",
      mdx: "mdx",
      yaml: "yaml",
      yml: "yaml",
    };
    return parserMap[ext || ""] || "babel";
  }

  async formatCode(
    code: string,
    fileName: string = "untitled.js"
  ): Promise<FormatResult> {
    // Ensure Prettier is loaded
    if (!this.isLoaded) {
      await this.loadPrettier();
    }

    if (!this.isLoaded || !this.prettier) {
      return {
        success: false,
        error: "Prettier is not loaded. Please refresh the page.",
      };
    }

    try {
      const parser = this.detectParser(fileName);
      const config = this.getConfig();
      
      // Get the appropriate plugins for the parser
      const plugins = [];
      if (parser === 'babel' || parser === 'typescript') {
        plugins.push(this.plugins.babel, this.plugins.typescript);
      } else if (parser === 'css' || parser === 'scss' || parser === 'less') {
        plugins.push(this.plugins.postcss);
      } else if (parser === 'html') {
        plugins.push(this.plugins.html);
      }

      const formatted = await this.prettier.format(code, {
        ...config,
        parser,
        plugins,
      });

      return {
        success: true,
        formatted,
      };
    } catch (error: any) {
      return this.handleFormatError(error, code);
    }
  }

  private handleFormatError(error: any, code: string): FormatResult {
    const errorMessage = error.message || "Unknown formatting error";
    const suggestions: string[] = [];

    if (errorMessage.includes("Unexpected token")) {
      suggestions.push("Check for missing semicolons or brackets");
      suggestions.push("Verify that all parentheses and braces are balanced");
    }

    if (errorMessage.includes("Unterminated")) {
      suggestions.push("Check for unclosed strings, comments, or JSX tags");
    }

    if (errorMessage.includes("Expected")) {
      suggestions.push("Check syntax around the error location");
      suggestions.push("Ensure proper use of commas and semicolons");
    }

    const autoFixed = this.attemptAutoFix(code, errorMessage);
    if (autoFixed && autoFixed !== code) {
      suggestions.push("Auto-fix available: Click to apply suggested fix");
      return {
        success: false,
        error: errorMessage,
        suggestions,
        formatted: autoFixed,
      };
    }

    return {
      success: false,
      error: errorMessage,
      suggestions,
    };
  }

  private attemptAutoFix(code: string, errorMessage: string): string | null {
    let fixed = code;

    if (errorMessage.includes("Missing semicolon")) {
      fixed = fixed.replace(/([^;])\s*\n/g, "$1;\n");
    }

    if (errorMessage.includes("Trailing comma")) {
      fixed = fixed.replace(/,(\s*[}\]])/g, "$1");
    }

    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      fixed += '"';
    }

    const singleQuoteCount = (fixed.match(/'/g) || []).length;
    if (singleQuoteCount % 2 !== 0) {
      fixed += "'";
    }

    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      fixed += "}".repeat(openBraces - closeBraces);
    }

    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      fixed += "]".repeat(openBrackets - closeBrackets);
    }

    const openParens = (fixed.match(/\(/g) || []).length;
    const closeParens = (fixed.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      fixed += ")".repeat(openParens - closeParens);
    }

    return fixed !== code ? fixed : null;
  }

  async formatOnClaudeGenerate(code: string, language: string): Promise<string> {
    const fileName = `generated.${this.getExtensionForLanguage(language)}`;
    const result = await this.formatCode(code, fileName);
    
    if (result.success && result.formatted) {
      console.log("Successfully formatted Claude-generated code");
      return result.formatted;
    }
    
    if (!result.success && result.formatted) {
      console.log("Applied auto-fix to Claude-generated code");
      return result.formatted;
    }
    
    console.warn("Could not format Claude-generated code:", result.error);
    return code;
  }

  private getExtensionForLanguage(language: string): string {
    const languageMap: { [key: string]: string } = {
      javascript: "js",
      typescript: "ts",
      jsx: "jsx",
      tsx: "tsx",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      markdown: "md",
      yaml: "yaml",
    };
    return languageMap[language.toLowerCase()] || "txt";
  }

  async batchFormat(files: { path: string; content: string }[]): Promise<
    Array<{
      path: string;
      result: FormatResult;
    }>
  > {
    const results = await Promise.all(
      files.map(async (file) => ({
        path: file.path,
        result: await this.formatCode(file.content, file.path),
      }))
    );
    return results;
  }
}

const prettierServiceInstance = new PrettierServiceBrowser();
export default prettierServiceInstance;