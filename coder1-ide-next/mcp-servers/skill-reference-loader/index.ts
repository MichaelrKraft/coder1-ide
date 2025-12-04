/**
 * Skill Reference Loader MCP Server
 * 
 * Provides on-demand loading of Claude skill references for progressive disclosure.
 * Minimizes token usage by loading only required documentation.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';

// Types
interface SkillReference {
  skill: string;
  reference: string;
  content: string;
  tokenCount: number; // Approximate
}

interface SkillMetadata {
  name: string;
  description: string;
  tokenBudget: number;
  references: string[];
}

class SkillReferenceLoaderServer {
  private server: Server;
  private skillsPath: string;
  private cache: Map<string, string> = new Map(); // Cache loaded references

  constructor() {
    this.server = new Server(
      {
        name: "skill-reference-loader",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.skillsPath = path.join(homedir(), '.claude', 'skills');
    this.setupHandlers();
  }

  /**
   * Approximate token count (rough estimate: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Load skill metadata from SKILL.md
   */
  private async loadSkillMetadata(skillName: string): Promise<SkillMetadata | null> {
    try {
      const skillPath = path.join(this.skillsPath, skillName, 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      // Parse YAML frontmatter
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!yamlMatch) {
        return null;
      }

      const yaml = yamlMatch[1];
      const nameMatch = yaml.match(/name:\s*(.+)/);
      const descMatch = yaml.match(/description:\s*(.+)/);
      const tokenMatch = yaml.match(/token_budget:\s*(\d+)/);

      // Find references in content
      const referencePattern = /references\/([a-z-]+\.md)/g;
      const references: string[] = [];
      let match;
      while ((match = referencePattern.exec(content)) !== null) {
        if (!references.includes(match[1])) {
          references.push(match[1]);
        }
      }

      return {
        name: nameMatch ? nameMatch[1].trim() : skillName,
        description: descMatch ? descMatch[1].trim() : '',
        tokenBudget: tokenMatch ? parseInt(tokenMatch[1]) : 50,
        references
      };
    } catch (error) {
      console.error(`[Reference Loader] Error loading metadata for ${skillName}:`, error);
      return null;
    }
  }

  /**
   * Load a specific reference file
   */
  private async loadReference(skillName: string, referenceName: string): Promise<SkillReference | null> {
    const cacheKey = `${skillName}/${referenceName}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const content = this.cache.get(cacheKey)!;
      return {
        skill: skillName,
        reference: referenceName,
        content,
        tokenCount: this.estimateTokens(content)
      };
    }

    try {
      const refPath = path.join(this.skillsPath, skillName, 'references', referenceName);
      const content = await fs.readFile(refPath, 'utf-8');

      // Cache the content
      this.cache.set(cacheKey, content);

      return {
        skill: skillName,
        reference: referenceName,
        content,
        tokenCount: this.estimateTokens(content)
      };
    } catch (error) {
      console.error(`[Reference Loader] Error loading ${skillName}/${referenceName}:`, error);
      return null;
    }
  }

  /**
   * List all available skills
   */
  private async listSkills(): Promise<SkillMetadata[]> {
    try {
      const entries = await fs.readdir(this.skillsPath, { withFileTypes: true });
      const skillDirs = entries.filter(e => e.isDirectory());

      const skills: SkillMetadata[] = [];
      for (const dir of skillDirs) {
        const metadata = await this.loadSkillMetadata(dir.name);
        if (metadata) {
          skills.push(metadata);
        }
      }

      return skills;
    } catch (error) {
      console.error('[Reference Loader] Error listing skills:', error);
      return [];
    }
  }

  /**
   * Load multiple references at once
   */
  private async loadMultipleReferences(requests: Array<{ skill: string; reference: string }>): Promise<SkillReference[]> {
    const results = await Promise.all(
      requests.map(req => this.loadReference(req.skill, req.reference))
    );
    return results.filter((r): r is SkillReference => r !== null);
  }

  /**
   * Get skill's quick-start reference (80% use case)
   */
  private async getQuickStart(skillName: string): Promise<SkillReference | null> {
    return this.loadReference(skillName, 'quick-start.md');
  }

  /**
   * Clear cache (for development/testing)
   */
  private clearCache(): void {
    this.cache.clear();
    console.error('[Reference Loader] Cache cleared');
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "load_reference",
          description: "Load a specific skill reference file for progressive disclosure",
          inputSchema: {
            type: "object",
            properties: {
              skill: { 
                type: "string", 
                description: "Skill name (e.g., 'parallel-exploration-orchestrator')" 
              },
              reference: { 
                type: "string", 
                description: "Reference file name (e.g., 'quick-start.md')" 
              }
            },
            required: ["skill", "reference"]
          }
        },
        {
          name: "load_multiple_references",
          description: "Load multiple references at once (batch operation)",
          inputSchema: {
            type: "object",
            properties: {
              references: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skill: { type: "string" },
                    reference: { type: "string" }
                  },
                  required: ["skill", "reference"]
                }
              }
            },
            required: ["references"]
          }
        },
        {
          name: "get_quick_start",
          description: "Get the quick-start guide for a skill (80% use case)",
          inputSchema: {
            type: "object",
            properties: {
              skill: { type: "string", description: "Skill name" }
            },
            required: ["skill"]
          }
        },
        {
          name: "list_skills",
          description: "List all available skills with their references",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_skill_metadata",
          description: "Get metadata about a specific skill",
          inputSchema: {
            type: "object",
            properties: {
              skill: { type: "string", description: "Skill name" }
            },
            required: ["skill"]
          }
        },
        {
          name: "clear_cache",
          description: "Clear the reference cache (for development)",
          inputSchema: {
            type: "object",
            properties: {}
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "load_reference": {
            const { skill, reference } = args as { skill: string; reference: string };
            const result = await this.loadReference(skill, reference);
            
            if (!result) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ error: "Reference not found" })
                }],
                isError: true
              };
            }

            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case "load_multiple_references": {
            const { references } = args as { references: Array<{ skill: string; reference: string }> };
            const results = await this.loadMultipleReferences(references);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  references: results,
                  totalTokens: results.reduce((sum, r) => sum + r.tokenCount, 0)
                }, null, 2)
              }]
            };
          }

          case "get_quick_start": {
            const { skill } = args as { skill: string };
            const result = await this.getQuickStart(skill);
            
            if (!result) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ error: "Quick-start not found" })
                }],
                isError: true
              };
            }

            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case "list_skills": {
            const skills = await this.listSkills();
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ skills }, null, 2)
              }]
            };
          }

          case "get_skill_metadata": {
            const { skill } = args as { skill: string };
            const metadata = await this.loadSkillMetadata(skill);
            
            if (!metadata) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ error: "Skill not found" })
                }],
                isError: true
              };
            }

            return {
              content: [{
                type: "text",
                text: JSON.stringify(metadata, null, 2)
              }]
            };
          }

          case "clear_cache": {
            this.clearCache();
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, message: "Cache cleared" })
              }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: errorMessage })
          }],
          isError: true
        };
      }
    });
  }

  async run() {
    // Verify skills directory exists
    try {
      await fs.access(this.skillsPath);
      console.error(`[Reference Loader] Skills path: ${this.skillsPath}`);
    } catch {
      console.error(`[Reference Loader] Warning: Skills directory not found at ${this.skillsPath}`);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Reference Loader] Skill Reference Loader MCP server started');
  }
}

// Start server
const server = new SkillReferenceLoaderServer();
server.run().catch(console.error);
