import { ClaudePersona } from '../types/supervision';

export interface PersonaMetadata {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  mcpServers: string[];
}

export interface SuperClaudeCommand {
  name: string;
  description: string;
  personas: string[];
  mcpServers: string[];
  flags: string[];
  examples: string[];
}

export const SUPER_CLAUDE_COMMANDS: Record<string, SuperClaudeCommand> = {
  '/analyze': {
    name: 'analyze',
    description: 'Comprehensive code and architecture analysis',
    personas: ['analyzer', 'architect'],
    mcpServers: ['sequential', 'context7'],
    flags: ['--code', '--arch', '--security', '--performance', '--c7', '--seq'],
    examples: [
      '/analyze --code --arch --security',
      '/analyze --performance --seq',
      '/analyze --code --c7'
    ]
  },
  '/build': {
    name: 'build',
    description: 'Feature implementation and project creation',
    personas: ['frontend', 'backend'],
    mcpServers: ['magic', 'context7'],
    flags: ['--init', '--feature', '--react', '--api', '--magic', '--tdd'],
    examples: [
      '/build --feature --react --magic',
      '/build --api --backend --tdd',
      '/build --init --react --c7'
    ]
  },
  '/design': {
    name: 'design',
    description: 'Architectural design and system planning',
    personas: ['architect'],
    mcpServers: ['sequential', 'context7'],
    flags: ['--api', '--ddd', '--microservices', '--seq', '--ultrathink'],
    examples: [
      '/design --api --seq',
      '/design --microservices --ultrathink',
      '/design --ddd --c7'
    ]
  },
  '/test': {
    name: 'test',
    description: 'Comprehensive testing and validation',
    personas: ['qa'],
    mcpServers: ['puppeteer'],
    flags: ['--coverage', '--e2e', '--pup', '--validate'],
    examples: [
      '/test --coverage --e2e',
      '/test --pup --validate',
      '/test --coverage'
    ]
  },
  '/security': {
    name: 'security',
    description: 'Security analysis and hardening',
    personas: ['security'],
    mcpServers: ['sequential'],
    flags: ['--scan', '--owasp', '--strict', '--seq'],
    examples: [
      '/security --scan --owasp',
      '/security --strict --seq',
      '/security --scan'
    ]
  },
  '/improve': {
    name: 'improve',
    description: 'Code quality and performance improvements',
    personas: ['refactorer', 'performance'],
    mcpServers: ['sequential'],
    flags: ['--quality', '--performance', '--iterate', '--seq'],
    examples: [
      '/improve --quality --iterate',
      '/improve --performance --seq',
      '/improve --quality'
    ]
  },
  '/troubleshoot': {
    name: 'troubleshoot',
    description: 'Debug and investigate issues',
    personas: ['analyzer'],
    mcpServers: ['sequential', 'context7'],
    flags: ['--investigate', '--seq', '--evidence'],
    examples: [
      '/troubleshoot --investigate --seq',
      '/troubleshoot --evidence --c7',
      '/troubleshoot --investigate'
    ]
  },
  '/explain': {
    name: 'explain',
    description: 'Code explanation and documentation',
    personas: ['mentor'],
    mcpServers: ['context7'],
    flags: ['--depth', '--c7', '--examples'],
    examples: [
      '/explain --depth --c7',
      '/explain --examples',
      '/explain --c7'
    ]
  }
};

export const CLAUDE_PERSONAS: Record<string, PersonaMetadata> = {
  frontend: {
    id: 'frontend',
    name: 'Frontend Developer',
    description: 'UI/UX focus, accessibility, React/Vue components',
    capabilities: ['React', 'Vue', 'CSS', 'Accessibility', 'Design Systems'],
    mcpServers: ['magic', 'context7']
  },
  backend: {
    id: 'backend',
    name: 'Backend Developer',
    description: 'API design, scalability, reliability engineering',
    capabilities: ['APIs', 'Databases', 'Scalability', 'Performance'],
    mcpServers: ['context7', 'sequential']
  },
  architect: {
    id: 'architect',
    name: 'Software Architect',
    description: 'System design, scalability, long-term thinking',
    capabilities: ['Architecture', 'System Design', 'Scalability', 'Planning'],
    mcpServers: ['sequential', 'context7']
  },
  analyzer: {
    id: 'analyzer',
    name: 'Code Analyzer',
    description: 'Root cause analysis, evidence-based investigation',
    capabilities: ['Debugging', 'Analysis', 'Investigation', 'Problem Solving'],
    mcpServers: ['sequential', 'context7']
  },
  security: {
    id: 'security',
    name: 'Security Expert',
    description: 'Threat modeling, vulnerability assessment',
    capabilities: ['Security', 'OWASP', 'Vulnerability Assessment', 'Compliance'],
    mcpServers: ['sequential']
  },
  qa: {
    id: 'qa',
    name: 'Quality Assurance',
    description: 'Testing, quality assurance, edge cases',
    capabilities: ['Testing', 'Quality Assurance', 'Test Coverage', 'Edge Cases'],
    mcpServers: ['puppeteer']
  },
  performance: {
    id: 'performance',
    name: 'Performance Engineer',
    description: 'Optimization, profiling, bottlenecks',
    capabilities: ['Performance', 'Optimization', 'Profiling', 'Monitoring'],
    mcpServers: ['puppeteer', 'sequential']
  },
  refactorer: {
    id: 'refactorer',
    name: 'Code Refactorer',
    description: 'Code quality, technical debt, maintainability',
    capabilities: ['Refactoring', 'Code Quality', 'Technical Debt', 'Maintainability'],
    mcpServers: ['sequential']
  },
  mentor: {
    id: 'mentor',
    name: 'Code Mentor',
    description: 'Teaching, documentation, knowledge transfer',
    capabilities: ['Documentation', 'Teaching', 'Knowledge Transfer', 'Best Practices'],
    mcpServers: ['context7']
  }
};

export class SuperClaudeCommandProcessor {
  async processCommand(command: string, args: string[]): Promise<string> {
    const commandDef = SUPER_CLAUDE_COMMANDS[command];
    if (!commandDef) {
      return `Unknown Super Claude command: ${command}`;
    }

    const persona = this.selectPersona(commandDef.personas, args);
    const mcpServers = this.selectMCPServers(commandDef.mcpServers, args);
    const flags = this.parseFlags(args);

    return this.executeCommand(command, persona, mcpServers, flags);
  }

  private selectPersona(availablePersonas: string[], args: string[]): string {
    const personaFlag = args.find(arg => arg.startsWith('--persona-'));
    if (personaFlag) {
      const persona = personaFlag.replace('--persona-', '');
      if (CLAUDE_PERSONAS[persona]) {
        return persona;
      }
    }

    return availablePersonas[0];
  }

  private selectMCPServers(availableServers: string[], args: string[]): string[] {
    const servers: string[] = [];
    
    if (args.includes('--all-mcp')) {
      return availableServers;
    }

    if (args.includes('--c7')) servers.push('context7');
    if (args.includes('--seq')) servers.push('sequential');
    if (args.includes('--magic')) servers.push('magic');
    if (args.includes('--pup')) servers.push('puppeteer');

    return servers.length > 0 ? servers : availableServers;
  }

  private parseFlags(args: string[]): string[] {
    return args.filter(arg => arg.startsWith('--'));
  }

  private async executeCommand(command: string, persona: string, mcpServers: string[], flags: string[]): Promise<string> {
    const personaInfo = CLAUDE_PERSONAS[persona];
    
    return `🤖 Super Claude ${command} executed:
📋 Persona: ${personaInfo?.name || persona} (${personaInfo?.description || 'No description'})
🔧 MCP Servers: ${mcpServers.join(', ')}
🏷️ Flags: ${flags.join(', ')}
✅ Command completed successfully with ${persona} persona analysis`;
  }

  getCommandHelp(command?: string): string {
    if (command && SUPER_CLAUDE_COMMANDS[command]) {
      const cmd = SUPER_CLAUDE_COMMANDS[command];
      return `${command}: ${cmd.description}
Personas: ${cmd.personas.join(', ')}
MCP Servers: ${cmd.mcpServers.join(', ')}
Flags: ${cmd.flags.join(', ')}
Examples:
${cmd.examples.map(ex => `  ${ex}`).join('\n')}`;
    }

    return `🤖 Super Claude Framework Commands:
${Object.entries(SUPER_CLAUDE_COMMANDS).map(([name, cmd]) => 
  `  ${name} - ${cmd.description}`
).join('\n')}

Use '/help <command>' for detailed command information.`;
  }
}
