# Coder1 Documentation

Professional documentation site for Coder1 IDE built with [Nextra](https://nextra.site/).

## 📚 What's Included

This documentation covers:

- **What is Coder1?** - Overview and value proposition
- **Getting Started** - Quick start guide and installation
- **Core Concepts** - Multi-agent system, Eternal Memory, Claude Code integration
- **IDE Features** - Editor, terminal, file explorer, AI Team dashboard
- **Workflows** - Best practices and advanced usage patterns
- **Comparisons** - How Coder1 compares to Cursor, Copilot, and Trae.ai
- **Support** - Troubleshooting, FAQ, and community resources

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Basic familiarity with Markdown and React

### Installation

```bash
# From the coder1-ide-next directory
cd docs
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3003
```

The site will auto-reload when you edit MDX files.

### Build for Production

```bash
# Create optimized build
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
docs/
├── pages/                    # Documentation pages (MDX files)
│   ├── index.mdx            # Homepage: "What is Coder1?"
│   ├── _meta.json           # Top-level navigation
│   │
│   ├── getting-started/     # Getting Started section
│   │   ├── _meta.json       # Section navigation
│   │   ├── quick-start.mdx  # 5-minute quick start
│   │   ├── installation.mdx
│   │   ├── first-project.mdx
│   │   └── key-concepts.mdx
│   │
│   ├── core-concepts/       # Core Concepts section
│   │   ├── _meta.json
│   │   ├── architecture.mdx          # Unified server architecture
│   │   ├── multi-agent-system.mdx    # Git worktrees & parallel AI
│   │   ├── eternal-memory.mdx        # Context persistence
│   │   ├── claude-code-integration.mdx  # CLI puppeteer system
│   │   └── session-management.mdx    # Checkpoints & summaries
│   │
│   ├── ide-features/        # IDE Features section
│   │   ├── _meta.json
│   │   ├── editor.mdx
│   │   ├── terminal.mdx
│   │   ├── file-explorer.mdx
│   │   ├── ai-team-dashboard.mdx    # Real-time agent monitoring
│   │   ├── status-bar.mdx
│   │   └── preview-panel.mdx
│   │
│   ├── workflows/           # Workflows section
│   │   ├── _meta.json
│   │   ├── solo-development.mdx
│   │   ├── team-collaboration.mdx
│   │   └── ci-cd-integration.mdx
│   │
│   ├── comparisons/         # Comparisons section
│   │   ├── _meta.json
│   │   ├── vs-cursor.mdx
│   │   ├── vs-copilot.mdx
│   │   └── vs-trae.mdx
│   │
│   └── support/             # Support section
│       ├── _meta.json
│       ├── troubleshooting.mdx
│       ├── faq.mdx
│       └── community.mdx
│
├── components/              # Custom React components
│   ├── Callout.tsx          # Info/success/warning/danger boxes
│   ├── Cards.tsx            # Feature cards
│   ├── ComparisonTable.tsx  # Competitive comparison tables
│   ├── Steps.tsx            # Step-by-step guides
│   └── CTASection.tsx       # Call-to-action sections
│
├── styles/                  # Global styles
│   └── globals.css          # Coder1 theme matching
│
├── theme.config.tsx         # Nextra theme configuration
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## 📝 Writing Documentation

### Creating a New Page

1. Create a new `.mdx` file in the appropriate directory:

```bash
# Example: Create a new workflow guide
touch pages/workflows/deployment.mdx
```

2. Update the section's `_meta.json` file:

```json
{
  "solo-development": "Solo Development",
  "team-collaboration": "Team Collaboration",
  "deployment": "Deployment Workflow"  // New entry
}
```

3. Write your content using MDX:

```mdx
import { Callout } from '@/components/Callout';

# Deployment Workflow

<Callout type="info">
This guide covers deploying Coder1 IDE to production.
</Callout>

## Prerequisites

- Render.com account
- Git repository
- Environment variables configured

## Steps

...
```

### Using Custom Components

#### Callout

Info boxes with 4 variants:

```mdx
<Callout type="info" title="Optional Title">
Your message here
</Callout>

<!-- Types: info, success, warning, danger -->
```

#### Cards

Feature cards with icons and links:

```mdx
<Cards>
  <Card icon="💰" title="Zero Cost" href="/core-concepts/multi-agent-system">
    Spawn unlimited AI agents at $0/month
  </Card>
  <Card icon="🧠" title="Eternal Memory" href="/core-concepts/eternal-memory">
    Never lose context across sessions
  </Card>
</Cards>
```

#### Comparison Table

Competitive comparison tables:

```mdx
<ComparisonTable data={[
  { feature: 'Cost', cursor: '$20', copilot: '$10', trae: '$220', coder1: '$0' },
  { feature: 'Multi-Agent', cursor: false, copilot: false, trae: true, coder1: true }
]} />
```

#### Steps

Step-by-step guides:

```mdx
<Steps>
  <Step title="Install Dependencies">
  ```bash
  npm install
  ```
  </Step>
  
  <Step title="Start Server">
  ```bash
  npm run dev
  ```
  </Step>
</Steps>
```

#### CTA Section

Call-to-action sections:

```mdx
<CTASection>
  <div>
    <h2>Ready to Build?</h2>
    <p>Get started with Coder1 in 5 minutes.</p>
  </div>
  <div className="flex gap-4">
    <PrimaryButton href="/getting-started/quick-start">
      Get Started
    </PrimaryButton>
    <SecondaryButton href="/core-concepts/architecture">
      Learn More
    </SecondaryButton>
  </div>
</CTASection>
```

## 🎨 Styling

### Theme Customization

The documentation theme matches Coder1 IDE's design:

```typescript
// theme.config.tsx
primaryHue: 210,        // Blue primary color
darkMode: true,         // Forced dark mode
primarySaturation: 100  // Vibrant colors
```

### Custom CSS Variables

```css
/* styles/globals.css */
:root {
  --coder1-blue: #3B82F6;
  --coder1-purple: #8B5CF6;
  --coder1-dark: #0F172A;
  --coder1-surface: #1E293B;
}
```

### Tailwind Classes

Use Tailwind utility classes in MDX:

```mdx
<div className="grid md:grid-cols-2 gap-4">
  <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
    Content here
  </div>
</div>
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub:
```bash
git add docs/
git commit -m "docs: Add documentation site"
git push
```

2. Connect to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Set **Root Directory**: `coder1-ide-next/docs`
   - Deploy

### Render.com

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: coder1-docs
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    rootDir: coder1-ide-next/docs
```

2. Push and deploy via Render dashboard

### Self-Hosted

Build and serve with any static hosting:

```bash
# Build static site
npm run build

# Serve with any HTTP server
npx serve out
```

## 📊 Performance

The documentation site is optimized for:

- **Fast Load Times**: Static generation with Next.js 14
- **SEO Friendly**: Meta tags and structured data
- **Responsive**: Mobile-first design
- **Accessible**: WCAG 2.1 AA compliant

## 🤝 Contributing

### Adding New Sections

1. Create directory in `pages/`:
```bash
mkdir pages/new-section
```

2. Add `_meta.json`:
```json
{
  "page1": "Page 1 Title",
  "page2": "Page 2 Title"
}
```

3. Update top-level `pages/_meta.json`:
```json
{
  "index": "What is Coder1?",
  "getting-started": "Getting Started",
  "new-section": "New Section"  // Add here
}
```

### Writing Guidelines

- **Be Concise**: Keep pages focused on one topic
- **Use Examples**: Include code examples and screenshots
- **Add Callouts**: Highlight important information
- **Link Related Pages**: Use internal links for navigation
- **Test Locally**: Always preview changes with `npm run dev`

## 🐛 Troubleshooting

### Build Errors

**Error**: `Cannot find module '@/components/Callout'`

**Solution**: Ensure all component files exist in `components/` directory

---

**Error**: `Unexpected token '<'` in MDX file

**Solution**: Check for unescaped JSX syntax. Use code blocks for JSX examples.

### Styling Issues

**Issue**: Custom CSS not applying

**Solution**: Import styles in `pages/_app.tsx`:
```typescript
import '../styles/globals.css';
```

### Navigation Issues

**Issue**: Page not showing in sidebar

**Solution**: Add page to section's `_meta.json` file

## 📚 Resources

- **Nextra Docs**: https://nextra.site/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **MDX**: https://mdxjs.com/

## 📞 Support

Questions about the documentation?

- Open an issue: [GitHub Issues](https://github.com/MichaelrKraft/coder1-ide/issues)
- Join Discord: [Coder1 Community](https://discord.gg/coder1)
- Email: docs@coder1.dev

---

*Last Updated: November 2025*
*Built with ❤️ using Nextra and Next.js*
