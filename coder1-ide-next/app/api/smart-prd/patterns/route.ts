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
  },
  {
    "id": "shopify-ecommerce",
    "name": "Shopify-style E-commerce Platform",
    "category": "ecommerce",
    "description": "Full-featured e-commerce platform with storefront and admin",
    "successRate": 71,
    "timeToMarket": "11.2 months",
    "complexity": "high",
    "technical": {
      "architecture": "Multi-tenant SaaS with templating engine",
      "primaryTech": ["Ruby on Rails", "React", "MySQL", "Liquid"],
      "scalingStrategy": "Sharded database with CDN for storefronts"
    }
  },
  {
    "id": "linkedin-social",
    "name": "LinkedIn-style Professional Network",
    "category": "social",
    "description": "Professional networking and career development platform",
    "successRate": 62,
    "timeToMarket": "13.5 months",
    "complexity": "high",
    "technical": {
      "architecture": "Graph database with activity feeds",
      "primaryTech": ["Java", "React", "Kafka", "Neo4j"],
      "scalingStrategy": "Distributed graph with event streaming"
    }
  },
  {
    "id": "airbnb-marketplace",
    "name": "Airbnb-style Marketplace",
    "category": "marketplace",
    "description": "Two-sided marketplace with booking and payments",
    "successRate": 65,
    "timeToMarket": "10.8 months",
    "complexity": "medium",
    "technical": {
      "architecture": "Service-oriented with booking engine",
      "primaryTech": ["Ruby on Rails", "React", "PostgreSQL", "Redis"],
      "scalingStrategy": "Geographic distribution with regional databases"
    }
  },
  {
    "id": "slack-communication",
    "name": "Slack-style Communication Platform",
    "category": "communication",
    "description": "Real-time team messaging and collaboration",
    "successRate": 73,
    "timeToMarket": "8.7 months",
    "complexity": "medium",
    "technical": {
      "architecture": "WebSocket-based real-time messaging",
      "primaryTech": ["Node.js", "React", "Cassandra", "WebSocket"],
      "scalingStrategy": "Channel-based sharding with WebSocket clusters"
    }
  },
  {
    "id": "trello-productivity",
    "name": "Trello-style Project Management",
    "category": "productivity",
    "description": "Visual task management with boards and cards",
    "successRate": 78,
    "timeToMarket": "6.5 months",
    "complexity": "low",
    "technical": {
      "architecture": "REST API with real-time updates",
      "primaryTech": ["Node.js", "React", "MongoDB", "Socket.io"],
      "scalingStrategy": "Document database with caching layer"
    }
  },
  {
    "id": "discord-gaming",
    "name": "Discord-style Gaming Community",
    "category": "gaming",
    "description": "Gaming-focused community platform with voice/video chat",
    "successRate": 69,
    "timeToMarket": "7.8 months",
    "complexity": "medium",
    "technical": {
      "architecture": "WebRTC-based real-time communication with community management",
      "primaryTech": ["Node.js", "React", "WebRTC", "PostgreSQL"],
      "scalingStrategy": "Voice channel clustering with geographic distribution"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "community-focus",
          "text": "What type of gaming community are you building?",
          "type": "choice",
          "choices": [
            { "value": "general", "label": "General Gaming - All games and genres" },
            { "value": "specific", "label": "Specific Game - One game or franchise" },
            { "value": "competitive", "label": "Competitive Esports - Tournaments and teams" }
          ]
        },
        {
          "id": "communication-features",
          "text": "What communication features are most important?",
          "type": "multiple",
          "choices": [
            { "value": "voice-chat", "label": "Voice Chat" },
            { "value": "video-streaming", "label": "Video Streaming" },
            { "value": "text-channels", "label": "Text Channels" },
            { "value": "game-integration", "label": "Game Integration" }
          ]
        }
      ]
    }
  },
  {
    "id": "tiktok-video",
    "name": "TikTok-style Short Video Platform",
    "category": "entertainment",
    "description": "Short-form video creation and social sharing platform",
    "successRate": 74,
    "timeToMarket": "9.1 months",
    "complexity": "high",
    "technical": {
      "architecture": "CDN-based video delivery with AI recommendation engine",
      "primaryTech": ["React Native", "Node.js", "FFmpeg", "Redis"],
      "scalingStrategy": "Global CDN with recommendation algorithm scaling"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "content-focus",
          "text": "What type of content will your platform focus on?",
          "type": "choice",
          "choices": [
            { "value": "general", "label": "General Entertainment - All content types" },
            { "value": "education", "label": "Educational - Learning and tutorials" },
            { "value": "niche", "label": "Niche Community - Specific interests" }
          ]
        },
        {
          "id": "creator-tools",
          "text": "What creator tools are essential?",
          "type": "multiple",
          "choices": [
            { "value": "video-editing", "label": "In-app Video Editing" },
            { "value": "effects-filters", "label": "Effects and Filters" },
            { "value": "music-library", "label": "Music Library" },
            { "value": "analytics", "label": "Creator Analytics" }
          ]
        }
      ]
    }
  },
  {
    "id": "robinhood-fintech",
    "name": "Robinhood-style FinTech App",
    "category": "fintech",
    "description": "Commission-free trading and financial services platform",
    "successRate": 66,
    "timeToMarket": "12.3 months",
    "complexity": "high",
    "technical": {
      "architecture": "Real-time trading system with regulatory compliance",
      "primaryTech": ["React", "Django", "PostgreSQL", "WebSocket"],
      "scalingStrategy": "High-frequency trading infrastructure with compliance layers"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "trading-focus",
          "text": "What type of trading will you offer?",
          "type": "multiple",
          "choices": [
            { "value": "stocks", "label": "Stocks" },
            { "value": "crypto", "label": "Cryptocurrency" },
            { "value": "options", "label": "Options Trading" },
            { "value": "etfs", "label": "ETFs and Funds" }
          ]
        },
        {
          "id": "user-experience",
          "text": "What's your target user experience level?",
          "type": "choice",
          "choices": [
            { "value": "beginner", "label": "Beginner-friendly - Simple and educational" },
            { "value": "intermediate", "label": "Intermediate - Balanced features" },
            { "value": "advanced", "label": "Advanced - Professional tools" }
          ]
        }
      ]
    }
  },
  {
    "id": "telehealth-platform",
    "name": "Telehealth Platform",
    "category": "healthtech",
    "description": "Virtual healthcare consultations and patient management",
    "successRate": 71,
    "timeToMarket": "11.7 months",
    "complexity": "high",
    "technical": {
      "architecture": "HIPAA-compliant healthcare platform with video consultations",
      "primaryTech": ["React", "Node.js", "PostgreSQL", "WebRTC"],
      "scalingStrategy": "Compliant data handling with geographic healthcare regulations"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "medical-specialties",
          "text": "What medical specialties will you focus on?",
          "type": "multiple",
          "choices": [
            { "value": "general", "label": "General Practice" },
            { "value": "mental-health", "label": "Mental Health" },
            { "value": "specialist", "label": "Medical Specialists" },
            { "value": "urgent-care", "label": "Urgent Care" }
          ]
        },
        {
          "id": "platform-scope",
          "text": "What's the scope of your platform?",
          "type": "choice",
          "choices": [
            { "value": "patient-only", "label": "Patient-focused - Simple consultations" },
            { "value": "practice-management", "label": "Practice Management - Full EHR integration" },
            { "value": "healthcare-network", "label": "Healthcare Network - Multi-provider platform" }
          ]
        }
      ]
    }
  },
  {
    "id": "duolingo-learning",
    "name": "Duolingo-style Learning Platform",
    "category": "edtech",
    "description": "Gamified online learning with adaptive content",
    "successRate": 77,
    "timeToMarket": "8.4 months",
    "complexity": "medium",
    "technical": {
      "architecture": "Adaptive learning system with gamification engine",
      "primaryTech": ["React", "Python", "PostgreSQL", "AI/ML"],
      "scalingStrategy": "Personalized learning paths with content recommendation algorithms"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "learning-subjects",
          "text": "What subjects will your platform teach?",
          "type": "choice",
          "choices": [
            { "value": "languages", "label": "Languages - Foreign language learning" },
            { "value": "skills", "label": "Professional Skills - Career development" },
            { "value": "academic", "label": "Academic Subjects - School curriculum" }
          ]
        },
        {
          "id": "engagement-methods",
          "text": "How will you keep learners engaged?",
          "type": "multiple",
          "choices": [
            { "value": "gamification", "label": "Gamification - Points, streaks, badges" },
            { "value": "social", "label": "Social Learning - Community features" },
            { "value": "adaptive", "label": "Adaptive Content - Personalized difficulty" },
            { "value": "micro-learning", "label": "Micro-learning - Bite-sized lessons" }
          ]
        }
      ]
    }
  },
  {
    "id": "netflix-streaming",
    "name": "Netflix-style Streaming Platform",
    "category": "streaming",
    "description": "Video streaming service with recommendation engine",
    "successRate": 68,
    "timeToMarket": "13.2 months",
    "complexity": "high",
    "technical": {
      "architecture": "Global CDN with AI-powered content recommendation",
      "primaryTech": ["React", "Node.js", "CDN", "Cassandra"],
      "scalingStrategy": "Global content distribution with localized recommendation engines"
    },
    "questionnaire": {
      "questions": [
        {
          "id": "content-strategy",
          "text": "What's your content strategy?",
          "type": "choice",
          "choices": [
            { "value": "licensed", "label": "Licensed Content - Third-party shows and movies" },
            { "value": "original", "label": "Original Content - Self-produced media" },
            { "value": "user-generated", "label": "User-Generated - Creator-driven content" }
          ]
        },
        {
          "id": "streaming-features",
          "text": "What streaming features are priorities?",
          "type": "multiple",
          "choices": [
            { "value": "recommendations", "label": "AI Recommendations" },
            { "value": "offline-viewing", "label": "Offline Viewing" },
            { "value": "multi-device", "label": "Multi-device Sync" },
            { "value": "live-streaming", "label": "Live Streaming" }
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