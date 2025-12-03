# Claude Config Phase 1 - Week 3 Ready to Start

## Current Status (November 27, 2025)

**✅ Weeks 1 & 2 COMPLETE** - Foundation and Core UI fully implemented and tested.

## What's Been Built

### Templates & Services (Week 1)
- **15 Templates**: 6 agents, 4 hooks, 3 skills, 2 commands in `/public/claude-config-templates/`
- **Core Services** in `/lib/claude-config/`:
  - `template-loader.ts` - Singleton service with caching
  - `file-operations.ts` - CRUD for .claude/ directory
  - `config-parser.ts` - Markdown/shell script parsing
  - `permission-analyzer.ts` - Risk scoring (0-100)
  - `cost-calculator.ts` - API cost estimation
  - `validation.ts` - Config validation with errors/warnings
  - `types.ts` - 85+ TypeScript interfaces
  - `index.ts` - Central exports

### UI Components (Week 2)
All in `/components/claude-config/`:
- `ClaudeConfigModal.tsx` - Full-screen modal with templates-hub aesthetic
- `NaturalLanguageBar.tsx` - **THE KILLER FEATURE** - detects creation intent
- `CategoryPills.tsx` - Filterable category buttons
- `TemplateCard.tsx` - Animated cards with hover effects
- `ConfigCard.tsx` - User config display
- `ConfigPreviewModal.tsx` - Preview before installation
- `CapabilitiesList.tsx` - Capability display
- `PermissionsView.tsx` - Permission analysis with risk scores
- `CostEstimate.tsx` - Cost breakdown and ROI

### State Management
- **Zustand Store**: `/stores/useClaudeConfigStore.ts`
  - Modal state (open/close)
  - Templates loading
  - User configs
  - Preview state
  - Search and filters
  - Generation state

### Integration
- **DiscoverPanel.tsx** - "Claude Configs" button in AI TOOLS section
- Clicking opens full-screen modal with all functionality
- Tested and working perfectly

## Week 3 Tasks - AI Generation (THE KILLER FEATURE)

### Day 11-12: API Routes
Create 7 API routes in `/app/api/claude-config/`:

1. **`templates/route.ts`** (GET)
   - Load all templates from `/public/claude-config-templates/`
   - Use `templateLoader.getTemplates()`
   - Return template metadata array

2. **`list/route.ts`** (GET)
   - List user configs from `.claude/` directory
   - Use `fileOperations.listConfigs()`
   - Support local and global configs

3. **`save/route.ts`** (POST)
   - Save config to `.claude/` directory
   - Use `fileOperations.createConfig()`
   - Return success/error

4. **`delete/route.ts`** (DELETE)
   - Delete config from `.claude/` directory
   - Use `fileOperations.deleteConfig()`
   - Handle backups

5. **`validate/route.ts`** (POST)
   - Validate config content
   - Use `validation.validateCompleteConfig()`
   - Return errors/warnings/suggestions

6. **`preview/route.ts`** (GET)
   - Get preview data for a template or config
   - Include capabilities, permissions, cost estimate
   - Use all analyzer services

7. **`generate/route.ts`** (POST) - **THE MOST IMPORTANT**
   - Accept natural language prompt
   - Call AI generator service
   - Return generated config

### Day 13-14: AI Generator Service

Create `/lib/claude-config/ai-generator.ts`:

**Key Functions:**
1. `detectConfigType(prompt: string)` - Determine if agent/hook/skill/command
2. `generateConfig(prompt: string, type: ConfigType)` - Call Claude API
3. `parseResponse(response: string)` - Extract config content
4. `validateGenerated(config: string)` - Ensure it's valid

**AI Prompts Strategy:**
- Specialized system prompts for each config type
- Include examples from templates
- Enforce proper markdown/shell script format
- Add permission analysis requirements

**Model Choice:**
- Use `claude-3-5-sonnet-20241022` for high-quality generation
- Estimate: 750 tokens system + 100-300 tokens user = ~1000 input
- Output: ~1500 tokens average
- Cost: ~$0.005 per generation (very affordable)

### Day 15: Wire Up Natural Language Bar

Modifications to `/components/claude-config/NaturalLanguageBar.tsx`:

1. **Add State**:
   ```typescript
   const [isGenerating, setIsGenerating] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

2. **Handle Generate Click**:
   ```typescript
   const handleGenerate = async () => {
     setIsGenerating(true);
     setError(null);
     
     try {
       const response = await fetch('/api/claude-config/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ prompt: input })
       });
       
       const data = await response.json();
       
       // Open preview modal with generated config
       setPreview(data.config);
       openPreviewModal();
       
     } catch (err) {
       setError('Generation failed. Please try again.');
     } finally {
       setIsGenerating(false);
     }
   };
   ```

3. **Add Loading States**:
   - Show spinner while generating
   - Disable input during generation
   - Show progress messages

4. **Error Handling**:
   - Display user-friendly error messages
   - Suggest alternative prompts
   - Log errors for debugging

## Testing Checklist

- [ ] All 7 API endpoints respond correctly
- [ ] Template loading works
- [ ] Config validation identifies issues
- [ ] Natural language generation works
- [ ] Generated configs are valid
- [ ] Preview modal shows generated config
- [ ] Cost estimates are accurate
- [ ] Error handling works properly

## Architecture Notes

### File Structure
```
coder1-ide-next/
├── app/api/claude-config/          # Week 3: Create these
│   ├── templates/route.ts
│   ├── list/route.ts
│   ├── save/route.ts
│   ├── delete/route.ts
│   ├── validate/route.ts
│   ├── preview/route.ts
│   └── generate/route.ts           # THE KILLER FEATURE
├── lib/claude-config/              # Week 1: Already exists ✅
│   ├── ai-generator.ts             # Week 3: Create this
│   ├── template-loader.ts          # ✅ Done
│   ├── file-operations.ts          # ✅ Done
│   ├── config-parser.ts            # ✅ Done
│   ├── permission-analyzer.ts      # ✅ Done
│   ├── cost-calculator.ts          # ✅ Done
│   ├── validation.ts               # ✅ Done
│   └── types.ts                    # ✅ Done
├── components/claude-config/       # Week 2: Already exists ✅
│   └── NaturalLanguageBar.tsx      # Week 3: Wire up
└── public/claude-config-templates/ # Week 1: 15 templates ✅
```

### API Call Flow
```
User types prompt → NaturalLanguageBar
  → POST /api/claude-config/generate
    → ai-generator.detectConfigType()
    → ai-generator.generateConfig()
      → Call Claude API
      → Parse response
      → Validate generated config
    → Return config + metadata
  → Open ConfigPreviewModal
    → Show capabilities, permissions, cost
    → User clicks "Install"
      → POST /api/claude-config/save
        → fileOperations.createConfig()
        → Save to .claude/ directory
```

## Environment Variables Needed

Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-api03-... # For AI generation
```

## Key Dependencies
- `@anthropic-ai/sdk` - Already installed ✅
- `date-fns` - Already installed ✅
- All other dependencies already present ✅

## Success Metrics

Week 3 complete when:
1. User types "Create an agent that reviews React code"
2. Clicks "Generate with AI"
3. Sees loading state for 2-4 seconds
4. Preview modal opens with generated config
5. Config is valid and includes:
   - Proper markdown format
   - Capabilities list
   - Permission requirements
   - Estimated cost
6. User can install to local or global .claude/ directory

## Notes for Next Agent

- All foundation is solid - no refactoring needed
- Focus only on API routes and AI generation
- Use existing services - don't recreate functionality
- Test thoroughly with various prompts
- The Natural Language Bar already detects intent - just wire it up
- Templates are great examples for the AI to learn from

**Estimated Time**: 3-4 days of focused work

Good luck! The hardest parts are done - Week 3 is just connecting the pieces with AI magic. 🚀
