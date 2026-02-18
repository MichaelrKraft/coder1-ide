import type { ConfigType } from './types';

let client: any = null;

function getClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Anthropic client cannot be used in browser');
  }
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk').default;
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return client;
}

interface GenerationResult {
  success: boolean;
  config?: string;
  type?: ConfigType;
  error?: string;
  metadata?: {
    tokens: number;
    model: string;
    generationTime: number;
  };
}

const SYSTEM_PROMPTS = {
  agent: `You are an expert at creating Claude Code agent configurations. Create a complete, production-ready agent config based on the user's request.

Format your response EXACTLY like this template:

name: [Agent Name]
description: [Brief description]

<agent>
  <role>
    [Detailed role description]
  </role>
  
  <capabilities>
    - [Capability 1]
    - [Capability 2]
    - [Capability 3]
  </capabilities>
  
  <instructions>
    [Detailed instructions for the agent]
  </instructions>
  
  <tools>
    - [Tool 1]
    - [Tool 2]
  </tools>
</agent>

IMPORTANT:
- Include name and description at the top
- Use proper XML tags
- Be specific and actionable
- Focus on the user's exact needs`,

  hook: `You are an expert at creating Claude Code hook configurations. Create a complete, production-ready hook based on the user's request.

Format your response EXACTLY like this template:

#!/bin/bash
# Hook: [Hook Name]
# Event: [trigger-event]
# Description: [Brief description]

# Validate inputs
if [ -z "$CODER1_PROJECT_ROOT" ]; then
  echo "Error: CODER1_PROJECT_ROOT not set"
  exit 1
fi

# Hook logic
[Your hook implementation here]

# Exit with status
exit 0

IMPORTANT:
- Include proper bash shebang
- Add descriptive comments
- Validate all inputs
- Handle errors gracefully
- Exit with appropriate status codes`,

  skill: `You are an expert at creating Claude Code skill configurations. Create a complete, production-ready skill based on the user's request.

Format your response EXACTLY like this template:

name: [Skill Name]
description: [Brief description]
category: [development|testing|deployment|analysis]

<skill>
  <triggers>
    - [When to use this skill]
  </triggers>
  
  <steps>
    1. [Step 1]
    2. [Step 2]
    3. [Step 3]
  </steps>
  
  <tools_required>
    - [Tool 1]
    - [Tool 2]
  </tools_required>
  
  <success_criteria>
    - [Criterion 1]
    - [Criterion 2]
  </success_criteria>
</skill>

IMPORTANT:
- Include name, description, and category
- Use proper XML tags
- Provide clear, sequential steps
- Define success criteria`,

  command: `You are an expert at creating Claude Code slash command configurations. Create a complete, production-ready command based on the user's request.

Format your response EXACTLY like this template:

{
  "name": "[command-name]",
  "description": "[Brief description]",
  "usage": "/[command-name] [arguments]",
  "examples": [
    "/[command-name] example-arg"
  ],
  "implementation": {
    "type": "tool_call|bash_script|api_request",
    "action": "[specific action to take]",
    "parameters": {
      "param1": "value1"
    }
  },
  "permissions": ["Read", "Execute"],
  "aliases": ["[alias1]", "[alias2]"]
}

IMPORTANT:
- Use valid JSON format
- Include all required fields
- Provide clear examples
- Define proper permissions`,

  mcp: `You are an expert at creating MCP (Model Context Protocol) server configurations. Create a complete, production-ready MCP config based on the user's request.

Format your response EXACTLY like this template:

{
  "mcpServers": {
    "[server-name]": {
      "command": "[command to run]",
      "args": ["[arg1]", "[arg2]"],
      "env": {
        "[ENV_VAR]": "[value]"
      }
    }
  }
}

For example, a filesystem MCP:
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "env": {}
    }
  }
}

IMPORTANT:
- Use valid JSON format
- Include the "mcpServers" wrapper
- Specify the correct command and args
- Include any required environment variables
- Server name should be descriptive but lowercase with hyphens`,

  template: `You are an expert at creating project templates for development. Create a complete, production-ready project template configuration based on the user's request.

Format your response EXACTLY like this template:

{
  "name": "[template-name]",
  "description": "[Brief description]",
  "category": "[saas|web-app|api|cli|library]",
  "techStack": {
    "frontend": "[React|Vue|Svelte|None]",
    "backend": "[Node|Python|Go|Rust|None]",
    "database": "[PostgreSQL|MongoDB|SQLite|None]"
  },
  "features": [
    "[Feature 1]",
    "[Feature 2]"
  ],
  "structure": {
    "directories": [
      "src/",
      "tests/",
      "docs/"
    ],
    "files": [
      "README.md",
      "package.json",
      ".gitignore"
    ]
  },
  "setup": {
    "install": "[install command]",
    "dev": "[dev command]",
    "build": "[build command]"
  }
}

IMPORTANT:
- Use valid JSON format
- Include all required fields
- Specify appropriate tech stack
- Define clear project structure
- Provide setup commands`,
};

const TYPE_DETECTION_KEYWORDS = {
  agent: ['agent', 'bot', 'assistant', 'specialist', 'expert', 'ai'],
  hook: ['hook', 'trigger', 'event', 'watch', 'monitor', 'pre-', 'post-', 'on-'],
  skill: ['skill', 'procedure', 'workflow', 'process', 'steps', 'how to'],
  command: ['command', 'slash', 'execute', 'run', '/', 'cmd'],
  mcp: ['mcp', 'server', 'integration', 'protocol', 'model context'],
  template: ['template', 'project', 'starter', 'boilerplate', 'scaffold'],
};

export function detectConfigType(prompt: string): ConfigType {
  const lower = prompt.toLowerCase();

  // Priority 1: Check for explicit type declarations (highest priority)
  // These are when user explicitly says "create a skill" or "make a hook"
  if (lower.includes('create a skill') || lower.includes('make a skill') || lower.includes('build a skill')) {
    return 'skill';
  }
  if (lower.includes('create a hook') || lower.includes('make a hook') || lower.includes('build a hook')) {
    return 'hook';
  }
  if (lower.includes('create a command') || lower.includes('make a command') || lower.includes('build a command')) {
    return 'command';
  }
  if (lower.includes('create an agent') || lower.includes('make an agent') || lower.includes('build an agent')) {
    return 'agent';
  }
  if (lower.includes('create a template') || lower.includes('make a template') || lower.includes('build a template')) {
    return 'template';
  }
  if (lower.includes('create an mcp') || lower.includes('make an mcp') || lower.includes('build an mcp')) {
    return 'mcp';
  }

  // Priority 2: Check for standalone type words at word boundaries
  if (/\bskill\b/.test(lower)) {
    return 'skill';
  }
  if (/\bhook\b/.test(lower) || lower.includes('pre-commit') || lower.includes('post-')) {
    return 'hook';
  }
  if (/\bcommand\b/.test(lower) || lower.includes('slash')) {
    return 'command';
  }
  if (/\bmcp\b/.test(lower)) {
    return 'mcp';
  }
  if (/\btemplate\b/.test(lower) || lower.includes('starter') || lower.includes('boilerplate')) {
    return 'template';
  }

  // Priority 3: Contextual keywords (lowest priority) - use scoring
  const scores: Record<ConfigType, number> = {
    agent: 0,
    hook: 0,
    skill: 0,
    command: 0,
    mcp: 0,
    template: 0,
  };

  for (const [type, keywords] of Object.entries(TYPE_DETECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[type as ConfigType]++;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore > 0) {
    const detectedType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as ConfigType;
    if (detectedType) return detectedType;
  }

  // Default to agent
  return 'agent';
}

export async function generateConfig(
  prompt: string,
  type?: ConfigType
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  try {
    const configType = type || detectConfigType(prompt);
    const systemPrompt = SYSTEM_PROMPTS[configType];
    
    const message = await getClient().messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    if (!responseText) {
      return {
        success: false,
        error: 'No response generated from AI',
      };
    }
    
    const generationTime = Date.now() - startTime;
    
    return {
      success: true,
      config: responseText.trim(),
      type: configType,
      metadata: {
        tokens: message.usage.input_tokens + message.usage.output_tokens,
        model: message.model,
        generationTime,
      },
    };
  } catch (error) {
    console.error('[AI Generator] Failed to generate config:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function parseResponse(response: string, type: ConfigType): string {
  let cleaned = response.trim();
  
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift();
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }
    cleaned = lines.join('\n').trim();
  }
  
  return cleaned;
}

export function validateGenerated(config: string, type: ConfigType): boolean {
  if (!config || config.length < 50) {
    return false;
  }

  switch (type) {
    case 'agent':
      return config.includes('<agent>') && config.includes('</agent>');
    case 'hook':
      return config.includes('#!/bin/bash');
    case 'skill':
      return config.includes('<skill>') && config.includes('</skill>');
    case 'command':
      try {
        JSON.parse(config);
        return true;
      } catch {
        return false;
      }
    case 'mcp':
      try {
        const parsed = JSON.parse(config);
        return parsed.mcpServers !== undefined;
      } catch {
        return false;
      }
    case 'template':
      try {
        const parsed = JSON.parse(config);
        return parsed.name !== undefined && parsed.structure !== undefined;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export const aiGenerator = {
  detectConfigType,
  generateConfig,
  parseResponse,
  validateGenerated,
};
