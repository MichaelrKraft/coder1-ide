---
id: react-saas
name: React SaaS App
description: Full-stack React SaaS with TypeScript, auth, and billing
category: web
tags: [react, saas, typescript, auth, stripe]
---

# Project Overview
[2-3 sentences describing what this SaaS does and who it serves.]

## Tech Stack
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Node.js / Express or Next.js API routes
- Database: PostgreSQL with Prisma ORM
- Auth: Auth0 / Clerk / NextAuth
- Payments: Stripe

## Key Directories
- `src/components/` - Reusable UI components
- `src/pages/` or `app/` - Routes and pages
- `src/lib/` - Utilities and service clients
- `src/hooks/` - Custom React hooks

## Development Commands
- `npm run dev` - Start dev server
- `npm test` - Run test suite
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint

## Code Standards
- Use TypeScript strict mode
- Prefer functional components with hooks
- Write tests for all business logic
- Use named exports (avoid default exports)
- Handle errors at API boundaries

## Git Workflow
- Feature branches from `main`
- Squash commits before merge
- Run `npm test` before pushing
