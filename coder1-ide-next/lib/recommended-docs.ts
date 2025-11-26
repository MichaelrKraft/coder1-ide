/**
 * Recommended Documentation
 * 
 * Pre-defined documentation URLs for popular frameworks and libraries.
 * Used to suggest relevant docs based on detected project stack.
 */

export interface DocRecommendation {
  name: string;
  description: string;
  urls: Array<{
    title: string;
    url: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export const RECOMMENDED_DOCS: Record<string, DocRecommendation> = {
  // Frameworks
  'nextjs': {
    name: 'Next.js',
    description: 'React framework for production',
    urls: [
      { title: 'App Router Docs', url: 'https://nextjs.org/docs/app', priority: 'high' },
      { title: 'API Routes', url: 'https://nextjs.org/docs/app/building-your-application/routing/route-handlers', priority: 'high' },
      { title: 'Data Fetching', url: 'https://nextjs.org/docs/app/building-your-application/data-fetching', priority: 'medium' },
      { title: 'Server Actions', url: 'https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations', priority: 'medium' },
    ]
  },
  'react': {
    name: 'React',
    description: 'UI library for building user interfaces',
    urls: [
      { title: 'React Docs', url: 'https://react.dev/reference/react', priority: 'high' },
      { title: 'Hooks Reference', url: 'https://react.dev/reference/react/hooks', priority: 'high' },
      { title: 'Built-in Components', url: 'https://react.dev/reference/react-dom/components', priority: 'medium' },
    ]
  },
  'vue': {
    name: 'Vue.js',
    description: 'Progressive JavaScript framework',
    urls: [
      { title: 'Vue 3 Guide', url: 'https://vuejs.org/guide/introduction.html', priority: 'high' },
      { title: 'Composition API', url: 'https://vuejs.org/api/composition-api-setup.html', priority: 'high' },
    ]
  },
  'express': {
    name: 'Express',
    description: 'Fast, unopinionated web framework for Node.js',
    urls: [
      { title: 'Express API Reference', url: 'https://expressjs.com/en/4x/api.html', priority: 'high' },
      { title: 'Routing Guide', url: 'https://expressjs.com/en/guide/routing.html', priority: 'medium' },
    ]
  },

  // Libraries - Payments & Auth
  'stripe': {
    name: 'Stripe',
    description: 'Payment processing platform',
    urls: [
      { title: 'Stripe API Reference', url: 'https://stripe.com/docs/api', priority: 'high' },
      { title: 'Webhooks', url: 'https://stripe.com/docs/webhooks', priority: 'high' },
      { title: 'Stripe.js & Elements', url: 'https://stripe.com/docs/js', priority: 'medium' },
      { title: 'Checkout Sessions', url: 'https://stripe.com/docs/api/checkout/sessions', priority: 'medium' },
    ]
  },
  'clerk': {
    name: 'Clerk',
    description: 'Authentication and user management',
    urls: [
      { title: 'Clerk Next.js Quickstart', url: 'https://clerk.com/docs/quickstarts/nextjs', priority: 'high' },
      { title: 'Clerk Components', url: 'https://clerk.com/docs/components/overview', priority: 'medium' },
    ]
  },
  'nextauth': {
    name: 'NextAuth.js',
    description: 'Authentication for Next.js',
    urls: [
      { title: 'NextAuth.js Docs', url: 'https://next-auth.js.org/getting-started/introduction', priority: 'high' },
      { title: 'Providers', url: 'https://next-auth.js.org/providers/', priority: 'medium' },
    ]
  },

  // Libraries - Database
  'supabase': {
    name: 'Supabase',
    description: 'Open source Firebase alternative',
    urls: [
      { title: 'Supabase JS Reference', url: 'https://supabase.com/docs/reference/javascript/introduction', priority: 'high' },
      { title: 'Auth', url: 'https://supabase.com/docs/guides/auth', priority: 'high' },
      { title: 'Database', url: 'https://supabase.com/docs/guides/database', priority: 'medium' },
      { title: 'Edge Functions', url: 'https://supabase.com/docs/guides/functions', priority: 'medium' },
    ]
  },
  'prisma': {
    name: 'Prisma',
    description: 'Next-generation Node.js ORM',
    urls: [
      { title: 'Prisma Client API', url: 'https://www.prisma.io/docs/reference/api-reference/prisma-client-reference', priority: 'high' },
      { title: 'Schema Reference', url: 'https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference', priority: 'high' },
      { title: 'CRUD Operations', url: 'https://www.prisma.io/docs/concepts/components/prisma-client/crud', priority: 'medium' },
    ]
  },
  'drizzle': {
    name: 'Drizzle ORM',
    description: 'TypeScript ORM with SQL-like syntax',
    urls: [
      { title: 'Drizzle Docs', url: 'https://orm.drizzle.team/docs/overview', priority: 'high' },
      { title: 'SQL Schema', url: 'https://orm.drizzle.team/docs/sql-schema-declaration', priority: 'medium' },
    ]
  },

  // Libraries - UI
  'tailwind': {
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    urls: [
      { title: 'Tailwind Docs', url: 'https://tailwindcss.com/docs', priority: 'high' },
      { title: 'Utility Classes', url: 'https://tailwindcss.com/docs/utility-first', priority: 'medium' },
    ]
  },
  'shadcn': {
    name: 'shadcn/ui',
    description: 'Re-usable components built with Radix and Tailwind',
    urls: [
      { title: 'shadcn/ui Components', url: 'https://ui.shadcn.com/docs/components/accordion', priority: 'high' },
      { title: 'Installation', url: 'https://ui.shadcn.com/docs/installation', priority: 'medium' },
    ]
  },
  'framer-motion': {
    name: 'Framer Motion',
    description: 'Animation library for React',
    urls: [
      { title: 'Framer Motion Docs', url: 'https://www.framer.com/motion/', priority: 'high' },
      { title: 'Animation', url: 'https://www.framer.com/motion/animation/', priority: 'medium' },
    ]
  },

  // Libraries - State Management
  'zustand': {
    name: 'Zustand',
    description: 'Lightweight state management',
    urls: [
      { title: 'Zustand Docs', url: 'https://docs.pmnd.rs/zustand/getting-started/introduction', priority: 'high' },
    ]
  },
  'react-query': {
    name: 'TanStack Query',
    description: 'Async state management for React',
    urls: [
      { title: 'TanStack Query Docs', url: 'https://tanstack.com/query/latest/docs/framework/react/overview', priority: 'high' },
      { title: 'useQuery', url: 'https://tanstack.com/query/latest/docs/framework/react/reference/useQuery', priority: 'medium' },
    ]
  },

  // Libraries - AI
  'openai': {
    name: 'OpenAI',
    description: 'OpenAI API client',
    urls: [
      { title: 'OpenAI API Reference', url: 'https://platform.openai.com/docs/api-reference', priority: 'high' },
      { title: 'Chat Completions', url: 'https://platform.openai.com/docs/guides/text-generation', priority: 'high' },
    ]
  },
  'anthropic': {
    name: 'Anthropic',
    description: 'Claude AI API',
    urls: [
      { title: 'Anthropic API Docs', url: 'https://docs.anthropic.com/en/api/getting-started', priority: 'high' },
      { title: 'Messages API', url: 'https://docs.anthropic.com/en/api/messages', priority: 'high' },
    ]
  },
  'vercel-ai': {
    name: 'Vercel AI SDK',
    description: 'AI SDK for building AI-powered apps',
    urls: [
      { title: 'AI SDK Docs', url: 'https://sdk.vercel.ai/docs', priority: 'high' },
      { title: 'Streaming', url: 'https://sdk.vercel.ai/docs/ai-sdk-ui/streaming', priority: 'medium' },
    ]
  },

  // Libraries - API & Data
  'trpc': {
    name: 'tRPC',
    description: 'End-to-end typesafe APIs',
    urls: [
      { title: 'tRPC Docs', url: 'https://trpc.io/docs', priority: 'high' },
      { title: 'Server Setup', url: 'https://trpc.io/docs/server/introduction', priority: 'medium' },
    ]
  },
  'zod': {
    name: 'Zod',
    description: 'TypeScript-first schema validation',
    urls: [
      { title: 'Zod Docs', url: 'https://zod.dev/', priority: 'high' },
    ]
  },

  // Libraries - Email
  'resend': {
    name: 'Resend',
    description: 'Email API for developers',
    urls: [
      { title: 'Resend Docs', url: 'https://resend.com/docs/introduction', priority: 'high' },
      { title: 'Send Email', url: 'https://resend.com/docs/send-with-nodejs', priority: 'medium' },
    ]
  },

  // Databases
  'postgresql': {
    name: 'PostgreSQL',
    description: 'Advanced open source database',
    urls: [
      { title: 'PostgreSQL Docs', url: 'https://www.postgresql.org/docs/current/', priority: 'high' },
    ]
  },
  'mongodb': {
    name: 'MongoDB',
    description: 'Document database',
    urls: [
      { title: 'MongoDB Node.js Driver', url: 'https://www.mongodb.com/docs/drivers/node/current/', priority: 'high' },
    ]
  },
  'redis': {
    name: 'Redis',
    description: 'In-memory data store',
    urls: [
      { title: 'Redis Commands', url: 'https://redis.io/commands/', priority: 'high' },
      { title: 'Node Redis', url: 'https://redis.io/docs/clients/nodejs/', priority: 'medium' },
    ]
  },

  // Tools
  'typescript': {
    name: 'TypeScript',
    description: 'Typed JavaScript',
    urls: [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', priority: 'high' },
      { title: 'Utility Types', url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html', priority: 'medium' },
    ]
  },
  'vitest': {
    name: 'Vitest',
    description: 'Fast unit testing framework',
    urls: [
      { title: 'Vitest Docs', url: 'https://vitest.dev/guide/', priority: 'high' },
    ]
  },
  'playwright': {
    name: 'Playwright',
    description: 'Browser automation',
    urls: [
      { title: 'Playwright Docs', url: 'https://playwright.dev/docs/intro', priority: 'high' },
      { title: 'Test API', url: 'https://playwright.dev/docs/api/class-test', priority: 'medium' },
    ]
  },
};

export function getRecommendedDocs(stackItems: string[]): DocRecommendation[] {
  return stackItems
    .filter(item => RECOMMENDED_DOCS[item])
    .map(item => RECOMMENDED_DOCS[item]);
}

export function getAllRecommendedUrls(stackItems: string[]): Array<{ title: string; url: string; library: string }> {
  const urls: Array<{ title: string; url: string; library: string }> = [];
  
  for (const item of stackItems) {
    const rec = RECOMMENDED_DOCS[item];
    if (rec) {
      for (const urlItem of rec.urls.filter(u => u.priority === 'high')) {
        urls.push({
          title: urlItem.title,
          url: urlItem.url,
          library: rec.name
        });
      }
    }
  }
  
  return urls;
}
