type UILibrary = 'none' | 'shadcn' | 'aceternity';

const LIBRARY_BLOCKS: Record<Exclude<UILibrary, 'none'>, string> = {
  shadcn: `Use shadcn/ui components wherever applicable. Import from "@/components/ui/*".
Available: Button, Card, CardHeader, CardContent, Input, Label, Badge, Avatar,
Separator, Sheet, Dialog, Tabs, TabsList, TabsTrigger, TabsContent,
NavigationMenu, DropdownMenu, Tooltip, ScrollArea, Progress.
Do not use raw <button> or <input> tags where a shadcn equivalent exists.`,

  aceternity: `Use Aceternity UI components wherever they fit the design. Import from "@/components/ui/*".
Available: HeroHighlight, Highlight, BackgroundGradient, CardContainer,
MovingBorderButton, TextGenerateEffect, SparklesCore, LampContainer,
WavyBackground, Spotlight, TypewriterEffect, InfiniteMovingCards, BentoGrid.
Use these for hero sections, CTAs, feature highlights, and animated sections.
Prefer Aceternity effects over static divs for high-impact visual areas.`,
};

export function buildScreenshotToCodePrompt(
  framework: string,
  imageCount = 1,
  uiLibrary: UILibrary = 'none',
  brandContext?: string,
  palette?: string[],
  previousCode?: string,
  refinement?: string
): string {
  const frameworkName =
    framework === 'nextjs' ? 'Next.js' :
    framework === 'vue' ? 'Vue 3' : 'React';

  const multiImagePreamble = imageCount > 1
    ? `You are analyzing ${imageCount} screenshots that together show ONE complete landing page, captured top-to-bottom in sequence (screenshot 1 = top of page, screenshot ${imageCount} = bottom). Treat them as a single continuous layout. Do not repeat sections that appear in multiple screenshots — each section should appear only once in the scaffold.\n\n`
    : '';

  const libraryBlock = uiLibrary !== 'none'
    ? `\nUI COMPONENT LIBRARY:\n${LIBRARY_BLOCKS[uiLibrary]}\n`
    : '';

  const brandBlock = brandContext
    ? `\nIMPORTANT — BRAND CONTEXT: Use the following content to populate the scaffold with REAL text instead of placeholders. Use the actual headlines, CTAs, feature descriptions, and copy from this context. Do not write "Lorem ipsum" or "Your headline here" when real content is available.\n\nBRAND CONTEXT:\n${brandContext}\n`
    : '';

  const paletteBlock = palette && palette.length > 0
    ? `\nCOLOR PALETTE (detected from screenshots — use these Tailwind arbitrary values for backgrounds, text, and accents instead of generic gray/blue defaults):\n${palette.map((hex, i) => `  Color ${i + 1}: ${hex}`).join('\n')}\nExample usage: bg-[${palette[0]}], text-[${palette[1] ?? palette[0]}]\n`
    : '';

  return `${multiImagePreamble}You are a UI component analyzer and code scaffolder. Analyze the provided UI screenshot carefully.${libraryBlock}${brandBlock}${paletteBlock}
Your task:
1. Identify all major UI components visible in the screenshot
2. Generate ${frameworkName} TypeScript scaffolding for the full layout

Respond in EXACTLY this format with no other text before or after:

<components>
[{"type": "component-type", "description": "brief description of what you see"}]
</components>

<code>
// Full scaffold code here
</code>

Valid component types: navbar, hero, sidebar, card, card-grid, form, table, modal, footer, header, banner, tabs, button-group, search-bar, dropdown, image-gallery, stats, testimonial, pricing, alert, breadcrumb, other

Rules for the scaffold code:
- Use ${frameworkName} functional components with TypeScript
- Include TypeScript interfaces for all props
- Use Tailwind CSS for all styling${uiLibrary !== 'none' ? ` and the specified UI library components` : ''}
- Create a main Page component (default export) that composes all detected sub-components
- Each sub-component is a const above the Page component
- Use realistic placeholder content that matches the screenshot${brandContext ? ' — prefer the brand context content over generic placeholders' : ''}
- Structure only — no business logic, no API calls
- Keep each sub-component under 40 lines${previousCode && refinement ? `

REFINE THE FOLLOWING EXISTING SCAFFOLD — do not generate from scratch:
\`\`\`
${previousCode}
\`\`\`

INSTRUCTION: ${refinement}

Return the complete revised file in the same <components>...</components><code>...</code> format. Apply ONLY the requested change — preserve all other components and structure exactly.` : ''}`;
}
