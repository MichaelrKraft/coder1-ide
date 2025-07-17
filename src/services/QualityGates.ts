import { CodeAnalysis, QualityResult } from '../types/supervision';

export interface QualityGate {
  name: string;
  validator: (code: string) => Promise<QualityResult>;
  threshold: number;
  autoFix: boolean;
  category: 'security' | 'performance' | 'quality' | 'testing';
}

export const QUALITY_GATES: QualityGate[] = [
  {
    name: 'TypeScript Compliance',
    validator: async (code) => await validateTypeScript(code),
    threshold: 95,
    autoFix: true,
    category: 'quality'
  },
  {
    name: 'ESLint Rules',
    validator: async (code) => await validateESLint(code),
    threshold: 90,
    autoFix: true,
    category: 'quality'
  },
  {
    name: 'Security Vulnerabilities',
    validator: async (code) => await scanSecurity(code),
    threshold: 100,
    autoFix: false,
    category: 'security'
  },
  {
    name: 'Performance Impact',
    validator: async (code) => await analyzePerformance(code),
    threshold: 85,
    autoFix: false,
    category: 'performance'
  },
  {
    name: 'Test Coverage',
    validator: async (code) => await checkTestCoverage(code),
    threshold: 80,
    autoFix: false,
    category: 'testing'
  }
];

export class QualityGateService {
  async runAllGates(code: string): Promise<QualityResult[]> {
    const results: QualityResult[] = [];
    
    for (const gate of QUALITY_GATES) {
      try {
        const result = await gate.validator(code);
        results.push({
          ...result,
          gateName: gate.name,
          category: gate.category,
          threshold: gate.threshold,
          autoFixAvailable: gate.autoFix
        });
      } catch (error) {
        results.push({
          gateName: gate.name,
          category: gate.category,
          threshold: gate.threshold,
          score: 0,
          passed: false,
          issues: [`Gate execution failed: ${error}`],
          autoFixAvailable: false
        });
      }
    }
    
    return results;
  }

  async runGatesByCategory(code: string, category: QualityGate['category']): Promise<QualityResult[]> {
    const categoryGates = QUALITY_GATES.filter(gate => gate.category === category);
    const results: QualityResult[] = [];
    
    for (const gate of categoryGates) {
      const result = await gate.validator(code);
      results.push({
        ...result,
        gateName: gate.name,
        category: gate.category,
        threshold: gate.threshold,
        autoFixAvailable: gate.autoFix
      });
    }
    
    return results;
  }

  async autoFixIssues(code: string): Promise<{ fixedCode: string; appliedFixes: string[] }> {
    let fixedCode = code;
    const appliedFixes: string[] = [];

    fixedCode = this.fixTypeScriptIssues(fixedCode, appliedFixes);
    fixedCode = this.fixESLintIssues(fixedCode, appliedFixes);
    fixedCode = this.fixFormattingIssues(fixedCode, appliedFixes);

    return { fixedCode, appliedFixes };
  }

  private fixTypeScriptIssues(code: string, appliedFixes: string[]): string {
    let fixed = code;

    if (!fixed.includes('export') && (fixed.includes('function') || fixed.includes('class'))) {
      fixed = fixed.replace(/(function|class)\s+(\w+)/, 'export $1 $2');
      appliedFixes.push('Added missing export statement');
    }

    fixed = fixed.replace(/:\s*any\b/g, ': unknown');
    if (fixed !== code) {
      appliedFixes.push('Replaced "any" types with "unknown"');
    }

    return fixed;
  }

  private fixESLintIssues(code: string, appliedFixes: string[]): string {
    let fixed = code;

    fixed = fixed.replace(/console\.log\([^)]*\);?\s*/g, '');
    if (fixed !== code) {
      appliedFixes.push('Removed console.log statements');
    }

    fixed = fixed.replace(/var\s+/g, 'const ');
    if (fixed !== code) {
      appliedFixes.push('Replaced var with const');
    }

    return fixed;
  }

  private fixFormattingIssues(code: string, appliedFixes: string[]): string {
    let fixed = code;

    const lines = fixed.split('\n');
    const formattedLines = lines.map(line => {
      if (line.length > 120) {
        return line.substring(0, 117) + '...';
      }
      return line;
    });

    fixed = formattedLines.join('\n');
    if (fixed !== code) {
      appliedFixes.push('Fixed line length issues');
    }

    return fixed;
  }
}

async function validateTypeScript(code: string): Promise<QualityResult> {
  let score = 100;
  const issues: string[] = [];

  if (!code.includes('export')) {
    score -= 15;
    issues.push('Missing export statement');
  }

  const anyCount = (code.match(/:\s*any\b/g) || []).length;
  if (anyCount > 0) {
    score -= anyCount * 10;
    issues.push(`Found ${anyCount} usage(s) of 'any' type`);
  }

  if (!code.includes('interface') && !code.includes('type') && code.length > 100) {
    score -= 10;
    issues.push('No type definitions found');
  }

  return {
    score: Math.max(0, score),
    passed: score >= 95,
    issues,
    suggestions: issues.length > 0 ? ['Add proper TypeScript types', 'Remove any types'] : []
  };
}

async function validateESLint(code: string): Promise<QualityResult> {
  let score = 100;
  const issues: string[] = [];

  const consoleCount = (code.match(/console\./g) || []).length;
  if (consoleCount > 0) {
    score -= consoleCount * 5;
    issues.push(`Found ${consoleCount} console statement(s)`);
  }

  const varCount = (code.match(/var\s+/g) || []).length;
  if (varCount > 0) {
    score -= varCount * 8;
    issues.push(`Found ${varCount} var declaration(s), use const/let instead`);
  }

  const lines = code.split('\n');
  const longLines = lines.filter(line => line.length > 120);
  if (longLines.length > 0) {
    score -= longLines.length * 3;
    issues.push(`Found ${longLines.length} line(s) exceeding 120 characters`);
  }

  return {
    score: Math.max(0, score),
    passed: score >= 90,
    issues,
    suggestions: issues.length > 0 ? ['Remove console statements', 'Use const/let instead of var', 'Break long lines'] : []
  };
}

async function scanSecurity(code: string): Promise<QualityResult> {
  let score = 100;
  const issues: string[] = [];

  if (code.includes('eval(')) {
    score -= 50;
    issues.push('Dangerous eval() usage detected');
  }

  if (code.includes('innerHTML')) {
    score -= 30;
    issues.push('Potential XSS vulnerability via innerHTML');
  }

  if (code.includes('document.write')) {
    score -= 25;
    issues.push('Unsafe document.write usage');
  }

  if (code.includes('localStorage') && !code.includes('JSON.parse')) {
    score -= 15;
    issues.push('Unsafe localStorage usage without validation');
  }

  return {
    score: Math.max(0, score),
    passed: score === 100,
    issues,
    suggestions: issues.length > 0 ? ['Remove eval() usage', 'Use textContent instead of innerHTML', 'Validate localStorage data'] : []
  };
}

async function analyzePerformance(code: string): Promise<QualityResult> {
  let score = 100;
  const issues: string[] = [];

  const nestedLoops = code.match(/for\s*\([^}]*for\s*\(/g);
  if (nestedLoops && nestedLoops.length > 0) {
    score -= 25;
    issues.push('Nested loops detected - potential O(n²) complexity');
  }

  const regexCount = (code.match(/new RegExp/g) || []).length;
  if (regexCount > 3) {
    score -= regexCount * 5;
    issues.push(`Multiple regex operations (${regexCount}) may impact performance`);
  }

  const timerCount = (code.match(/(setTimeout|setInterval)/g) || []).length;
  if (timerCount > 2) {
    score -= timerCount * 3;
    issues.push(`Multiple timers (${timerCount}) detected`);
  }

  return {
    score: Math.max(0, score),
    passed: score >= 85,
    issues,
    suggestions: issues.length > 0 ? ['Optimize nested loops', 'Cache regex patterns', 'Consolidate timers'] : []
  };
}

async function checkTestCoverage(code: string): Promise<QualityResult> {
  let score = 0;
  const issues: string[] = [];

  const hasTests = code.includes('test(') || code.includes('it(') || code.includes('describe(');
  const hasAssertions = code.includes('expect(') || code.includes('assert');
  
  if (hasTests && hasAssertions) {
    score = 85;
  } else if (hasTests) {
    score = 50;
    issues.push('Tests found but no assertions detected');
  } else {
    score = 0;
    issues.push('No tests found');
  }

  return {
    score,
    passed: score >= 80,
    issues,
    suggestions: issues.length > 0 ? ['Add test cases', 'Add assertions to tests'] : []
  };
}
