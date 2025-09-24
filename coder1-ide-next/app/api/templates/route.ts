/**
 * API endpoint for templates data
 * Returns the template configurations for the Templates Hub
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load MCP templates from JSON files
function loadMCPTemplates() {
  try {
    const templatesPath = path.join(process.cwd(), '../src/data/coderone-templates');
    const mcpIntegrationsPath = path.join(templatesPath, 'mcp-integrations.json');
    
    if (fs.existsSync(mcpIntegrationsPath)) {
      const mcpData = JSON.parse(fs.readFileSync(mcpIntegrationsPath, 'utf8'));
      return mcpData.templates.map((template: any) => ({
        ...template,
        category: mcpData.category,
        categorySlug: mcpData.categorySlug
      }));
    }
  } catch (error) {
    console.error('Error loading MCP templates:', error);
  }
  return [];
}

const baseTemplates = [
  {
    id: 'frontend-agent',
    name: 'Frontend Developer',
    category: 'AI AGENTS',
    categorySlug: 'ai-agents',
    description: 'React specialist with TypeScript, modern CSS, accessibility testing, and component optimization.',
    tags: ['React', 'TypeScript', 'Testing', 'CSS'],
    stats: { rating: 4.9, downloads: 2300, comments: 89 },
    command: 'coderone install frontend-agent',
    features: [
      'Specialized React and TypeScript knowledge',
      'Component generation with best practices',
      'Automatic accessibility compliance',
      'Performance optimization recommendations'
    ]
  },
  {
    id: 'backend-agent',
    name: 'Backend Engineer',
    category: 'AI AGENTS',
    categorySlug: 'ai-agents',
    description: 'Node.js expert with database design, API security, scaling architecture, and monitoring.',
    tags: ['Node.js', 'Database', 'API', 'Security'],
    stats: { rating: 4.8, downloads: 1890, comments: 67 },
    command: 'coderone install backend-agent',
    features: [
      'Advanced Node.js and Express expertise',
      'Database schema design and optimization',
      'API security best practices',
      'Microservices architecture guidance'
    ]
  },
  {
    id: 'fullstack-agent',
    name: 'Full-Stack Developer',
    category: 'AI AGENTS',
    categorySlug: 'ai-agents',
    description: 'Complete development expertise from frontend to backend with deployment knowledge.',
    tags: ['Full-Stack', 'DevOps', 'Cloud', 'CI/CD'],
    stats: { rating: 4.9, downloads: 3200, comments: 124 },
    command: 'coderone install fullstack-agent',
    features: [
      'End-to-end application development',
      'Cloud deployment strategies',
      'CI/CD pipeline configuration',
      'Performance optimization across stack'
    ]
  },
  {
    id: 'nextjs-dashboard',
    name: 'Next.js Admin Dashboard',
    category: 'WEB APPS',
    categorySlug: 'web-apps',
    description: 'Production-ready admin dashboard with authentication, data tables, and charts.',
    tags: ['Next.js', 'Dashboard', 'Admin', 'Charts'],
    stats: { rating: 4.7, downloads: 4500, comments: 156 },
    command: 'coderone create nextjs-dashboard',
    features: [
      'Authentication system included',
      'Responsive data tables',
      'Real-time charts and analytics',
      'Dark mode support'
    ]
  },
  {
    id: 'ecommerce-store',
    name: 'E-Commerce Platform',
    category: 'WEB APPS',
    categorySlug: 'web-apps',
    description: 'Full e-commerce solution with cart, checkout, payment integration, and admin panel.',
    tags: ['E-Commerce', 'Payments', 'Cart', 'Store'],
    stats: { rating: 4.8, downloads: 3200, comments: 98 },
    command: 'coderone create ecommerce-store',
    features: [
      'Shopping cart functionality',
      'Stripe payment integration',
      'Product management system',
      'Order tracking and fulfillment'
    ]
  },
  {
    id: 'saas-starter',
    name: 'SaaS Boilerplate',
    category: 'WEB APPS',
    categorySlug: 'web-apps',
    description: 'Complete SaaS starter with subscriptions, teams, billing, and multi-tenancy.',
    tags: ['SaaS', 'Subscriptions', 'Teams', 'Billing'],
    stats: { rating: 4.9, downloads: 2800, comments: 112 },
    command: 'coderone create saas-starter',
    features: [
      'Subscription management',
      'Team collaboration features',
      'Multi-tenancy architecture',
      'Billing and invoicing system'
    ]
  },
  {
    id: 'vscode-extension',
    name: 'VS Code Extension',
    category: 'DEVELOPER TOOLS',
    categorySlug: 'dev-tools',
    description: 'Starter template for building VS Code extensions with TypeScript.',
    tags: ['VSCode', 'Extension', 'TypeScript', 'IDE'],
    stats: { rating: 4.6, downloads: 1200, comments: 45 },
    command: 'coderone create vscode-extension',
    features: [
      'Extension manifest configuration',
      'Command palette integration',
      'Language server protocol support',
      'Marketplace publishing ready'
    ]
  },
  {
    id: 'cli-tool',
    name: 'CLI Tool Framework',
    category: 'DEVELOPER TOOLS',
    categorySlug: 'dev-tools',
    description: 'Build command-line tools with argument parsing, help text, and configuration.',
    tags: ['CLI', 'Terminal', 'Node.js', 'Tool'],
    stats: { rating: 4.5, downloads: 890, comments: 34 },
    command: 'coderone create cli-tool',
    features: [
      'Argument parsing setup',
      'Interactive prompts',
      'Configuration management',
      'Cross-platform compatibility'
    ]
  },
  {
    id: 'rest-api',
    name: 'REST API Server',
    category: 'BACKEND',
    categorySlug: 'backend',
    description: 'Express.js REST API with JWT auth, validation, error handling, and Swagger docs.',
    tags: ['API', 'REST', 'Express', 'JWT'],
    stats: { rating: 4.7, downloads: 5600, comments: 189 },
    command: 'coderone create rest-api',
    features: [
      'JWT authentication',
      'Request validation middleware',
      'Error handling patterns',
      'Swagger documentation'
    ]
  },
  {
    id: 'graphql-server',
    name: 'GraphQL Server',
    category: 'BACKEND',
    categorySlug: 'backend',
    description: 'Apollo GraphQL server with subscriptions, dataloaders, and authentication.',
    tags: ['GraphQL', 'Apollo', 'API', 'Subscriptions'],
    stats: { rating: 4.8, downloads: 2100, comments: 76 },
    command: 'coderone create graphql-server',
    features: [
      'Apollo Server setup',
      'Real-time subscriptions',
      'DataLoader for N+1 prevention',
      'Authentication and authorization'
    ]
  },
  {
    id: 'landing-page',
    name: 'Marketing Landing Page',
    category: 'MARKETING',
    categorySlug: 'marketing',
    description: 'High-converting landing page with animations, forms, and analytics integration.',
    tags: ['Landing', 'Marketing', 'Conversion', 'SEO'],
    stats: { rating: 4.6, downloads: 3400, comments: 92 },
    command: 'coderone create landing-page',
    features: [
      'Conversion-optimized design',
      'Contact form integration',
      'Analytics tracking setup',
      'SEO optimization'
    ]
  },
  {
    id: 'blog-platform',
    name: 'Blog Platform',
    category: 'MARKETING',
    categorySlug: 'marketing',
    description: 'Modern blog with MDX support, SEO optimization, and content management.',
    tags: ['Blog', 'MDX', 'Content', 'SEO'],
    stats: { rating: 4.7, downloads: 2600, comments: 88 },
    command: 'coderone create blog-platform',
    features: [
      'MDX content support',
      'SEO meta tags',
      'RSS feed generation',
      'Comment system integration'
    ]
  }
];

export async function GET() {
  // Combine base templates with MCP templates
  const mcpTemplates = loadMCPTemplates();
  const allTemplates = [...baseTemplates, ...mcpTemplates];
  
  return NextResponse.json({
    success: true,
    templates: allTemplates,
    timestamp: new Date().toISOString()
  });
}