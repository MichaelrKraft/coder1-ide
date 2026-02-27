---
id: nextjs-fullstack
name: Next.js Fullstack
description: Next.js 14 App Router with server components and API routes
category: web
tags: [nextjs, react, typescript, app-router, fullstack]
---

# Project Overview
[Describe what this app does and the core user workflows.]

## Tech Stack
- Framework: Next.js 14 (App Router)
- Language: TypeScript strict
- Styling: Tailwind CSS
- Database: PostgreSQL via Prisma
- Auth: NextAuth.js v5

## Key Directories
- `app/` - Routes, layouts, server components
- `app/api/` - API route handlers
- `components/` - Shared UI components
- `lib/` - Utilities, DB client, auth config
- `types/` - Shared TypeScript interfaces

## Development Commands
- `npm run dev` - Start dev server (port 3000)
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint
- `npx prisma studio` - Browse database

## Code Standards
- Prefer server components; use `'use client'` only when needed
- Co-locate page-specific components with their routes
- Use server actions for form mutations
- Validate all inputs with Zod
- Keep API routes thin — delegate to service functions

## Git Workflow
- Feature branches from `main`
- Squash and merge via PR
- All PRs require passing CI
