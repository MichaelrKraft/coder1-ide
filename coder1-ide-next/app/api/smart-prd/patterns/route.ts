/* 
===============================================================================
Smart PRD Generator - Patterns API
===============================================================================
File: app/api/smart-prd/patterns/route.ts
Purpose: Repository patterns endpoint for Smart PRD Generator
Status: PRODUCTION - Created: January 20, 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Default patterns if none exist yet
const defaultPatterns = [
  {
    "id": "stripe-saas-platform",
    "name": "Stripe-style SaaS Platform",
    "category": "saas",
    "description": "Payment processing and developer-first SaaS platform",
    "successRate": 68,
    "timeToMarket": "10.5 months",
    "complexity": "high",
    "technical": {
      "architecture": "Microservices with event-driven design",
      "primaryTech": ["Node.js", "React", "PostgreSQL", "Redis"],
      "scalingStrategy": "Horizontal scaling with load balancers"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "payment-scope",
          "text": "What types of payments will your platform process?",
          "type": "multiple",
          "choices": [
            { "value": "credit-cards", "label": "Credit/Debit Cards" },
            { "value": "bank-transfers", "label": "Bank Transfers" },
            { "value": "digital-wallets", "label": "Digital Wallets" },
            { "value": "crypto", "label": "Cryptocurrency" }
          ]
        },
        {
          "id": "integration-complexity",
          "text": "How developer-friendly should your API be?",
          "type": "choice",
          "choices": [
            { "value": "simple", "label": "Simple - Basic payment processing" },
            { "value": "advanced", "label": "Advanced - Full payment ecosystem" },
            { "value": "enterprise", "label": "Enterprise - Complete financial infrastructure" }
          ]
        }
      ]
    }
  },
  {
    "id": "notion-collaboration",
    "name": "Notion-style Collaboration Platform",
    "category": "productivity",
    "description": "All-in-one workspace with blocks-based content creation",
    "successRate": 73,
    "timeToMarket": "8.2 months",
    "complexity": "medium",
    "technical": {
      "architecture": "Real-time collaborative editing with operational transforms",
      "primaryTech": ["React", "Node.js", "PostgreSQL", "WebSockets"],
      "scalingStrategy": "Real-time sync with conflict resolution"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "content-types",
          "text": "What types of content will users create?",
          "type": "multiple",
          "choices": [
            { "value": "documents", "label": "Documents & Notes" },
            { "value": "databases", "label": "Databases & Tables" },
            { "value": "tasks", "label": "Tasks & Projects" },
            { "value": "wikis", "label": "Wikis & Knowledge Base" }
          ]
        },
        {
          "id": "collaboration-level",
          "text": "What level of collaboration do you need?",
          "type": "choice",
          "choices": [
            { "value": "personal", "label": "Personal - Individual use" },
            { "value": "team", "label": "Team - Small group collaboration" },
            { "value": "organization", "label": "Organization - Company-wide platform" }
          ]
        }
      ]
    }
  },
  {
    "id": "github-devtools",
    "name": "GitHub-style Developer Platform",
    "category": "devtools",
    "description": "Version control and developer collaboration platform",
    "successRate": 75,
    "timeToMarket": "9.3 months",
    "complexity": "high",
    "technical": {
      "architecture": "Git-based version control with web interface",
      "primaryTech": ["Ruby on Rails", "React", "PostgreSQL", "Git"],
      "scalingStrategy": "Distributed version control with CDN"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "repository-features",
          "text": "What repository features are most important?",
          "type": "multiple",
          "choices": [
            { "value": "version-control", "label": "Version Control" },
            { "value": "issue-tracking", "label": "Issue Tracking" },
            { "value": "ci-cd", "label": "CI/CD Integration" },
            { "value": "code-review", "label": "Code Review Tools" }
          ]
        }
      ]
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    const patternsPath = path.join(process.cwd(), 'data', 'repository-patterns');
    let patterns = defaultPatterns;
    
    // Try to load patterns from file system if they exist
    if (fs.existsSync(patternsPath)) {
      try {
        const patternFiles = fs.readdirSync(patternsPath).filter(file => file.endsWith('.json'));
        const loadedPatterns = [];
        
        for (const file of patternFiles) {
          const filePath = path.join(patternsPath, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const pattern = JSON.parse(fileContent);
          loadedPatterns.push(pattern);
        }
        
        if (loadedPatterns.length > 0) {
          patterns = loadedPatterns;
        }
      } catch (error) {
        console.error('Error loading patterns from files:', error);
        // Fall back to default patterns
      }
    }
    
    return NextResponse.json({
      success: true,
      patterns,
      count: patterns.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Patterns API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      patterns: defaultPatterns, // Fallback to default patterns
      count: defaultPatterns.length,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}