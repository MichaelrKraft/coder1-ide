// @ts-ignore - Prettier standalone modules
import * as prettier from "prettier/standalone";
// @ts-ignore
import * as parserBabel from "prettier/parser-babel";
// @ts-ignore
import * as parserTypeScript from "prettier/parser-typescript";
// @ts-ignore
import * as parserPostCSS from "prettier/parser-postcss";
// @ts-ignore
import * as parserHTML from "prettier/parser-html";

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

class PrettierService {
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
    this.loadUserConfig();
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
      htm: "html",
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
    try {
      const parser = this.detectParser(fileName);
      const config = this.getConfig();

      const formatted = await prettier.format(code, {
        ...config,
        parser,
        plugins: [parserBabel as any, parserTypeScript as any, parserPostCSS as any, parserHTML as any],
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

    // Common syntax error patterns and suggestions
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

    // Try to auto-fix common issues
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

    // Auto-fix missing semicolons
    if (errorMessage.includes("Missing semicolon")) {
      fixed = fixed.replace(/([^;])\s*\n/g, "$1;\n");
    }

    // Auto-fix trailing commas in objects
    if (errorMessage.includes("Trailing comma")) {
      fixed = fixed.replace(/,(\s*[}\]])/g, "$1");
    }

    // Auto-fix unclosed strings (basic)
    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      fixed += '"';
    }

    const singleQuoteCount = (fixed.match(/'/g) || []).length;
    if (singleQuoteCount % 2 !== 0) {
      fixed += "'";
    }

    // Auto-fix unclosed braces
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      fixed += "}".repeat(openBraces - closeBraces);
    }

    // Auto-fix unclosed brackets
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      fixed += "]".repeat(openBrackets - closeBrackets);
    }

    // Auto-fix unclosed parentheses
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
    
    // If formatting failed but we have an auto-fix, use it
    if (!result.success && result.formatted) {
      console.log("Applied auto-fix to Claude-generated code");
      return result.formatted;
    }
    
    // Return original code if formatting completely failed
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

const prettierServiceInstance = new PrettierService();
export default prettierServiceInstance;