# Navigation Structure Guide for Coder1 IDE

## Critical Information for All AI Agents

This guide explains the navigation structure to prevent recurring navigation link breakage issues.

## Architecture Overview

The Coder1 IDE uses a **hybrid navigation system**:

1. **Next.js Routes** (`/app/[page]/page.tsx`) - React-based pages
2. **CANONICAL HTML Files** (`/CANONICAL/*.html`) - Static HTML pages
3. **Public Symlinks** (`/public/*.html`) - Symlinks to CANONICAL files

## Navigation Rules

### 1. Always Use Relative Paths
❌ **WRONG**: `href="http://localhost:3001/templates-hub"`
✅ **CORRECT**: `href="/templates-hub.html"`

### 2. File Locations

#### Next.js Pages (React Components)
Located in `/app/[name]/page.tsx`:
- `/` → Homepage (PRD Generator)
- `/ide` → Main IDE interface
- `/templates` → Templates listing (React)
- `/vibe-dashboard` → Redirects to vibe-dashboard.html
- `/agent-dashboard` → Agent Dashboard (React)
- `/docs-manager` → Documentation Manager (React)

#### CANONICAL HTML Pages
Located in `/CANONICAL/` and symlinked to `/public/`:
- `templates-hub.html` → Advanced templates interface
- `component-studio.html` → Component creation studio
- `hooks-v3.html` → Hooks manager (served as `hooks.html`)
- `workflow-dashboard.html` → Workflow management
- `vibe-dashboard.html` → Vibe analytics dashboard

## Common Navigation Links

### In DiscoverPanel (`/components/status-bar/DiscoverPanel.tsx`)
```tsx
// AI Tools Section - All use .html extensions
<a href="/component-studio.html">Component Studio</a>
<a href="/templates-hub.html">Templates Hub</a>
<a href="/hooks.html">Hooks Manager</a>
<a href="/workflow-dashboard.html">Workflows</a>
<a href="/">PRD Generator</a>
```

### In MenuBar (`/components/MenuBar.tsx`)
```tsx
// Menu items - Mix of React routes and HTML files
{ href: '/', label: 'Home page' }
{ href: '/vibe-dashboard', label: 'AI dashboard' }  // Redirects to .html
{ href: '/agent-dashboard', label: 'Agent dashboard' }
{ href: '/docs-manager', label: 'Documentation' }
```

## Why Navigation Breaks

1. **Inconsistent Paths**: Mixing absolute URLs (`http://localhost:3001/`) with relative paths
2. **Missing Symlinks**: CANONICAL files not linked to public directory
3. **Wrong Extensions**: Forgetting `.html` for static pages
4. **Port Confusion**: Hardcoding port numbers that may change

## How to Fix Navigation Issues

### Step 1: Check if page exists
```bash
# Check Next.js pages
ls /app/[page-name]/

# Check CANONICAL HTML
ls /CANONICAL/ | grep [page-name]
```

### Step 2: Create symlink if needed
```bash
cd /public
ln -sf ../../CANONICAL/[file].html [file].html
```

### Step 3: Update navigation link
- For CANONICAL HTML: Use `/[file].html`
- For Next.js pages: Use `/[route]` (no .html)
- Never use absolute URLs with localhost

## Permanent Fix Implementation

To prevent future breakage:

1. **Symlink Script**: Created symlinks for all CANONICAL HTML files
2. **Consistent Paths**: All navigation uses relative paths
3. **Documentation**: This guide for future agents
4. **Type Safety**: Consider adding TypeScript types for navigation routes

## Quick Reference

| Feature | Route | Type | File Location |
|---------|-------|------|---------------|
| Templates Hub | `/templates-hub.html` | HTML | `/CANONICAL/templates-hub.html` |
| Component Studio | `/component-studio.html` | HTML | `/CANONICAL/component-studio.html` |
| Hooks Manager | `/hooks.html` | HTML | `/CANONICAL/hooks-v3.html` |
| Workflows | `/workflow-dashboard.html` | HTML | `/CANONICAL/workflow-dashboard.html` |
| Vibe Dashboard | `/vibe-dashboard` or `/vibe-dashboard.html` | HTML | `/CANONICAL/vibe-dashboard.html` |
| Agent Dashboard | `/agent-dashboard` | React | `/app/agent-dashboard/page.tsx` |
| Documentation | `/docs-manager` | React | `/app/docs-manager/page.tsx` |
| IDE | `/ide` | React | `/app/ide/page.tsx` |
| Home/PRD | `/` | React | `/app/page.tsx` |

## Testing Navigation

After making changes:
```bash
# Start the server
npm run dev

# Test each link
curl -I http://localhost:3001/templates-hub.html
curl -I http://localhost:3001/component-studio.html
# etc...
```

---

**Last Updated**: January 2025
**Maintained By**: Coder1 Development Team