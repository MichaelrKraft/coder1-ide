/**
 * Universal Resource Finder MCP Server
 * 
 * Provides dynamic resource discovery for any domain/task.
 * Used by parallel exploration orchestrator to assign curated resources to agents.
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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface DomainResources {
  examples: string[];
  documentation: string[];
  patterns: string[];
  tutorials: string[];
}

interface DomainMappings {
  [domain: string]: DomainResources;
}

interface ResourceDiscoveryRequest {
  task: string;
  domain?: string;
  count?: number;
}

interface ResourceDiscoveryResponse {
  domain: string;
  confidence: number;
  resources: DomainResources;
  detectedKeywords?: string[];
}

// Domain keyword mappings for heuristic detection
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "frontend-ui-design": [
    "landing page", "dashboard", "ui", "interface", "design", "component",
    "website", "webpage", "layout", "visual", "theme", "responsive"
  ],
  "frontend-animation": [
    "animation", "transition", "motion", "interactive", "scroll", "hover"
  ],
  "backend-architecture": [
    "architecture", "backend", "server", "microservices", "monolith",
    "system design", "distributed", "scalability"
  ],
  "api-design": [
    "api", "rest", "graphql", "endpoint", "grpc", "websocket", "protocol"
  ],
  "database-design": [
    "database", "schema", "sql", "nosql", "data model", "entity",
    "table", "index", "query", "orm"
  ],
  "devops-deployment": [
    "deploy", "deployment", "ci/cd", "pipeline", "docker", "kubernetes",
    "container", "infrastructure", "hosting"
  ],
  "infrastructure-cloud": [
    "cloud", "aws", "gcp", "azure", "serverless", "lambda", "ec2"
  ],
  "content-copywriting": [
    "copy", "content", "marketing", "email", "blog", "article", "writing"
  ],
  "security-architecture": [
    "security", "auth", "authentication", "authorization", "encryption",
    "oauth", "jwt", "ssl", "vulnerability"
  ],
  "mobile-development": [
    "mobile", "ios", "android", "app", "react native", "flutter", "swift"
  ],
  "testing-qa": [
    "test", "testing", "qa", "quality", "unit test", "integration test",
    "e2e", "cypress", "jest", "pytest"
  ],
  "ml-ai-integration": [
    "machine learning", "ml", "ai", "model", "neural", "training", "inference"
  ],
  "content-documentation": [
    "documentation", "docs", "technical writing", "api docs", "readme"
  ]
};

class UniversalResourceFinderServer {
  private server: Server;
  private domainMappings: DomainMappings = {};

  constructor() {
    this.server = new Server(
      {
        name: "universal-resource-finder",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async loadDomainMappings() {
    try {
      const mappingsPath = path.join(__dirname, 'domain-mappings.json');
      const data = await fs.readFile(mappingsPath, 'utf-8');
      this.domainMappings = JSON.parse(data);
      console.error('[Resource Finder] Loaded domain mappings for', Object.keys(this.domainMappings).length, 'domains');
    } catch (error) {
      console.error('[Resource Finder] Error loading domain mappings:', error);
      throw error;
    }
  }

  private detectDomain(task: string): { domain: string; confidence: number; keywords: string[] } {
    const taskLower = task.toLowerCase();
    const scores: Record<string, { score: number; keywords: string[] }> = {};

    // Score each domain based on keyword matches
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      const matched: string[] = [];

      for (const keyword of keywords) {
        if (taskLower.includes(keyword)) {
          score += 1;
          matched.push(keyword);
        }
      }

      if (score > 0) {
        scores[domain] = {
          score,
          keywords: matched
        };
      }
    }

    // If no matches, return unknown
    if (Object.keys(scores).length === 0) {
      return {
        domain: "unknown",
        confidence: 0,
        keywords: []
      };
    }

    // Find highest scoring domain
    const sortedDomains = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    const [topDomain, data] = sortedDomains[0];

    // Calculate confidence (normalize by total keywords in domain)
    const confidence = Math.min(1.0, data.score / DOMAIN_KEYWORDS[topDomain].length * 3);

    return {
      domain: topDomain,
      confidence,
      keywords: data.keywords
    };
  }

  private async discoverResources(request: ResourceDiscoveryRequest): Promise<ResourceDiscoveryResponse> {
    // Detect domain if not provided
    let domain = request.domain;
    let confidence = 1.0;
    let keywords: string[] = [];

    if (!domain) {
      const detection = this.detectDomain(request.task);
      domain = detection.domain;
      confidence = detection.confidence;
      keywords = detection.keywords;
    }

    // Get resources for domain
    const resources = this.domainMappings[domain];

    if (!resources) {
      return {
        domain: "unknown",
        confidence: 0,
        resources: {
          examples: [],
          documentation: [],
          patterns: [],
          tutorials: []
        },
        detectedKeywords: keywords
      };
    }

    // Optionally limit results
    const count = request.count || 10;
    const limitedResources: DomainResources = {
      examples: resources.examples.slice(0, count),
      documentation: resources.documentation.slice(0, count),
      patterns: resources.patterns.slice(0, count),
      tutorials: resources.tutorials.slice(0, count)
    };

    return {
      domain,
      confidence,
      resources: limitedResources,
      detectedKeywords: keywords
    };
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "discover_resources",
          description: "Discover curated resources (examples, docs, patterns, tutorials) for a task/domain",
          inputSchema: {
            type: "object",
            properties: {
              task: {
                type: "string",
                description: "The task or project description"
              },
              domain: {
                type: "string",
                description: "Optional: Specific domain to search (e.g., 'frontend-ui-design', 'backend-architecture')"
              },
              count: {
                type: "number",
                description: "Maximum number of resources per category (default: 10)"
              }
            },
            required: ["task"]
          }
        },
        {
          name: "list_domains",
          description: "List all available domains with their resource counts",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "detect_domain",
          description: "Detect the most likely domain for a given task description",
          inputSchema: {
            type: "object",
            properties: {
              task: {
                type: "string",
                description: "The task description to analyze"
              }
            },
            required: ["task"]
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
          case "discover_resources": {
            const result = await this.discoverResources(args as ResourceDiscoveryRequest);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case "list_domains": {
            const domainList = Object.keys(this.domainMappings).map(domain => ({
              domain,
              counts: {
                examples: this.domainMappings[domain].examples.length,
                documentation: this.domainMappings[domain].documentation.length,
                patterns: this.domainMappings[domain].patterns.length,
                tutorials: this.domainMappings[domain].tutorials.length
              }
            }));

            return {
              content: [{
                type: "text",
                text: JSON.stringify(domainList, null, 2)
              }]
            };
          }

          case "detect_domain": {
            const task = (args as any).task;
            const detection = this.detectDomain(task);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(detection, null, 2)
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
    // Load domain mappings before starting
    await this.loadDomainMappings();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Resource Finder] Universal Resource Finder MCP server started');
  }
}

// Start server
const server = new UniversalResourceFinderServer();
server.run().catch(console.error);
