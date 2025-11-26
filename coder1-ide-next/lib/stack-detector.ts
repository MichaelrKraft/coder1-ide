/**
 * Stack Detector
 * 
 * Detects the technology stack of the current project by analyzing
 * package.json and other configuration files.
 */

export interface DetectedStack {
  frameworks: string[];
  libraries: string[];
  databases: string[];
  tools: string[];
  languages: string[];
}

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const FRAMEWORK_PATTERNS: Record<string, string[]> = {
  'nextjs': ['next'],
  'react': ['react', 'react-dom'],
  'vue': ['vue'],
  'angular': ['@angular/core'],
  'svelte': ['svelte'],
  'express': ['express'],
  'fastify': ['fastify'],
  'nestjs': ['@nestjs/core'],
  'remix': ['@remix-run/react'],
  'gatsby': ['gatsby'],
  'nuxt': ['nuxt'],
  'astro': ['astro'],
};

const LIBRARY_PATTERNS: Record<string, string[]> = {
  'stripe': ['stripe', '@stripe/stripe-js'],
  'supabase': ['@supabase/supabase-js'],
  'firebase': ['firebase', 'firebase-admin'],
  'prisma': ['@prisma/client', 'prisma'],
  'drizzle': ['drizzle-orm'],
  'tailwind': ['tailwindcss'],
  'shadcn': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  'trpc': ['@trpc/server', '@trpc/client'],
  'react-query': ['@tanstack/react-query', 'react-query'],
  'zustand': ['zustand'],
  'redux': ['redux', '@reduxjs/toolkit'],
  'framer-motion': ['framer-motion'],
  'three': ['three', '@react-three/fiber'],
  'openai': ['openai'],
  'anthropic': ['@anthropic-ai/sdk'],
  'langchain': ['langchain'],
  'zod': ['zod'],
  'axios': ['axios'],
  'swr': ['swr'],
  'socket.io': ['socket.io', 'socket.io-client'],
  'mongoose': ['mongoose'],
  'typeorm': ['typeorm'],
  'sequelize': ['sequelize'],
  'clerk': ['@clerk/nextjs', '@clerk/clerk-react'],
  'auth0': ['@auth0/nextjs-auth0', 'auth0'],
  'nextauth': ['next-auth'],
  'resend': ['resend'],
  'sendgrid': ['@sendgrid/mail'],
  'aws-sdk': ['@aws-sdk/client-s3', 'aws-sdk'],
  'vercel-ai': ['ai'],
};

const DATABASE_PATTERNS: Record<string, string[]> = {
  'postgresql': ['pg', 'postgres'],
  'mysql': ['mysql', 'mysql2'],
  'mongodb': ['mongodb', 'mongoose'],
  'redis': ['redis', 'ioredis'],
  'sqlite': ['better-sqlite3', 'sqlite3'],
};

const TOOL_PATTERNS: Record<string, string[]> = {
  'typescript': ['typescript'],
  'eslint': ['eslint'],
  'prettier': ['prettier'],
  'jest': ['jest'],
  'vitest': ['vitest'],
  'playwright': ['@playwright/test', 'playwright'],
  'cypress': ['cypress'],
  'docker': [], // detected via Dockerfile
  'turbo': ['turbo'],
};

function detectFromDependencies(
  deps: Record<string, string>,
  patterns: Record<string, string[]>
): string[] {
  const detected: string[] = [];
  
  for (const [name, packageNames] of Object.entries(patterns)) {
    if (packageNames.some(pkg => deps[pkg])) {
      detected.push(name);
    }
  }
  
  return detected;
}

export async function detectProjectStack(projectPath?: string): Promise<DetectedStack> {
  const stack: DetectedStack = {
    frameworks: [],
    libraries: [],
    databases: [],
    tools: [],
    languages: [],
  };

  try {
    // Try to read package.json from the API
    const response = await fetch('/api/files/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath ? `${projectPath}/package.json` : 'package.json' })
    });

    if (!response.ok) {
      console.warn('[STACK-DETECTOR] Could not read package.json');
      return stack;
    }

    const data = await response.json();
    const pkg: PackageJson = typeof data.content === 'string' 
      ? JSON.parse(data.content) 
      : data.content;

    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };

    // Detect frameworks
    stack.frameworks = detectFromDependencies(allDeps, FRAMEWORK_PATTERNS);

    // Detect libraries
    stack.libraries = detectFromDependencies(allDeps, LIBRARY_PATTERNS);

    // Detect databases
    stack.databases = detectFromDependencies(allDeps, DATABASE_PATTERNS);

    // Detect tools
    stack.tools = detectFromDependencies(allDeps, TOOL_PATTERNS);

    // Detect languages
    if (allDeps['typescript']) {
      stack.languages.push('typescript');
    } else {
      stack.languages.push('javascript');
    }

    console.log('[STACK-DETECTOR] Detected stack:', stack);
    return stack;

  } catch (error) {
    console.error('[STACK-DETECTOR] Error detecting stack:', error);
    return stack;
  }
}

export function getStackSummary(stack: DetectedStack): string {
  const parts: string[] = [];
  
  if (stack.frameworks.length > 0) {
    parts.push(`Frameworks: ${stack.frameworks.join(', ')}`);
  }
  if (stack.libraries.length > 0) {
    parts.push(`Libraries: ${stack.libraries.slice(0, 5).join(', ')}${stack.libraries.length > 5 ? '...' : ''}`);
  }
  if (stack.databases.length > 0) {
    parts.push(`Databases: ${stack.databases.join(', ')}`);
  }
  
  return parts.join(' | ') || 'No stack detected';
}
