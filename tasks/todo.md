# Template Recommendations Integration - PRD Generator

## 🎯 Goal
Integrate AI-powered template recommendations into the Smart PRD Generator workflow, allowing users to start from production-ready SaaS templates instead of scratch.

## 📋 Implementation Plan

### Phase 1: Backend Infrastructure
- [ ] Create template data store with curated SaaS templates
  - Define Template interface (id, name, description, techStack, features, githubUrl, compatibility tags)
  - Add 10 curated templates from article (BoxyHQ, Open SaaS, Next.js Starter, etc.)
  - Store in `/coder1-ide-next/data/templates.json`

- [ ] Implement template recommendation service
  - Create `/coder1-ide-next/services/template-recommender.ts`
  - Add compatibility scoring algorithm (keyword matching + tech stack alignment)
  - Integration with existing requirements-gatherer.ts
  - Use Z.AI for intelligent matching (cost-free)

- [ ] Create template recommendation API endpoint
  - New route: `/coder1-ide-next/app/api/templates/recommend/route.ts`
  - Accept DetailedRequirements as input
  - Return top 3-5 templates with compatibility scores
  - Include template metadata for display

### Phase 2: Frontend Integration
- [ ] Add template recommendation UI to product-creation-hub.js
  - Create `displayTemplateRecommendations()` function
  - Design template card components (similar to existing template-hub cards)
  - Add "Start from Template" and "Start from Scratch" buttons
  - Handle user selection and flow continuation

- [ ] Update requirements flow in product-creation-hub.js
  - After questions complete, call `/api/templates/recommend`
  - Show template options before generating PRD
  - Store user choice (template or scratch) in session
  - Continue to PRD generation with context

- [ ] Style template recommendation screen
  - Reuse unified-design-system.css
  - Match existing Coder1 aesthetic (dark theme, cyan/purple accents)
  - Ensure responsive design
  - Add smooth transitions/animations

### Phase 3: Template Customization Flow
- [ ] Create template selection handler
  - Store selected template in session
  - Pass template context to PRD generator
  - Modify PRD to reference template features
  - Add "Next Steps" section for template customization

- [ ] Add template metadata to session summary
  - Include selected template in session export
  - Document which features come from template vs custom
  - Provide template setup instructions

### Phase 4: Testing & Refinement
- [ ] Test complete user flow
  - Enter project request → Answer questions → See templates → Select template → Generate PRD
  - Verify "Start from Scratch" option still works
  - Test with various project types
  - Validate compatibility scoring accuracy

- [ ] Performance optimization
  - Cache template data
  - Optimize recommendation API response time
  - Ensure UI remains responsive during recommendation

- [ ] Error handling
  - Handle API failures gracefully
  - Provide fallback if no templates match
  - Clear error messages for users

### Phase 5: Documentation & Polish
- [ ] Update documentation
  - Add template integration to CLAUDE.md
  - Document API endpoints
  - Create user guide for template selection
  
- [ ] Add analytics/tracking
  - Track template selection rate
  - Monitor which templates are most popular
  - Measure time savings vs from-scratch

## 🔧 Technical Details

### Template Data Structure
```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  category: 'enterprise' | 'modern-js' | 'python' | 'specialized';
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
    auth?: string;
    payments?: string;
  };
  features: string[];
  githubUrl: string;
  docsUrl?: string;
  compatibility: {
    projectTypes: string[];
    keywords: string[];
  };
  estimatedSetupTime: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
}
```

### Compatibility Scoring Algorithm (Simple v1)
```typescript
function calculateCompatibility(
  requirements: DetailedRequirements, 
  template: Template
): number {
  let score = 0;
  
  // Tech stack match (40% weight)
  if (template.techStack.frontend === requirements.techStack.frontend) score += 40;
  if (template.techStack.backend === requirements.techStack.backend) score += 20;
  if (template.techStack.database === requirements.techStack.database) score += 20;
  
  // Feature overlap (30% weight)
  const featureMatches = requirements.features.filter(f => 
    template.features.some(tf => tf.toLowerCase().includes(f.toLowerCase()))
  );
  score += (featureMatches.length / requirements.features.length) * 30;
  
  // Project type match (20% weight)
  if (template.compatibility.projectTypes.includes(requirements.projectType)) {
    score += 20;
  }
  
  // Keyword match (10% weight)
  const keywordMatches = template.compatibility.keywords.filter(k =>
    requirements.initialRequest.toLowerCase().includes(k.toLowerCase())
  );
  score += Math.min(keywordMatches.length * 5, 10);
  
  return Math.min(score, 100);
}
```

### API Endpoint Spec
```typescript
// POST /api/templates/recommend
Request: {
  requirements: DetailedRequirements
}

Response: {
  success: boolean;
  templates: Array<{
    template: Template;
    compatibilityScore: number;
    matchReasons: string[];
  }>;
  totalCount: number;
}
```

## 🎨 UI Flow

```
Current Flow:
1. User enters request
2. AI asks 5 questions
3. Generate enhanced brief/PRD
4. Show results

New Flow:
1. User enters request
2. AI asks 5 questions
3. **NEW: Show template recommendations**
4. User selects template OR "Start from Scratch"
5. Generate enhanced brief/PRD (with template context)
6. Show results
```

## 📦 Files to Create/Modify

### New Files:
- `/coder1-ide-next/data/templates.json` - Template catalog
- `/coder1-ide-next/services/template-recommender.ts` - Recommendation logic
- `/coder1-ide-next/app/api/templates/recommend/route.ts` - API endpoint
- `/coder1-ide-next/types/template.ts` - TypeScript interfaces

### Modified Files:
- `/coder1-ide-next/services/requirements-gatherer.ts` - Add template recommendation hook
- `/CANONICAL/product-creation-hub.js` - Add UI for template selection
- `/CANONICAL/product-creation-hub.css` - Add template card styles

## 🎯 Success Criteria

✅ Users see template recommendations after answering questions
✅ Templates are relevant (avg compatibility score > 70%)
✅ UI is intuitive and matches Coder1 design system
✅ "Start from Scratch" option still works perfectly
✅ Session summaries include template information
✅ Zero breaking changes to existing flows
✅ Implementation is simple and maintainable

## 📊 Estimated Timeline

- **Phase 1 (Backend)**: 4-6 hours
- **Phase 2 (Frontend)**: 4-6 hours
- **Phase 3 (Customization)**: 2-3 hours
- **Phase 4 (Testing)**: 2-3 hours
- **Phase 5 (Docs)**: 1-2 hours

**Total**: ~15-20 hours

## 🚀 Next Steps

1. ✅ Review and approve this plan
2. Begin with Phase 1: Create template data store
3. Implement incrementally, testing each phase
4. Deploy and monitor user adoption

---

**Created**: 2024-11-24
**Status**: Awaiting approval
**Complexity**: Medium
**Impact**: High

## Review Section
(To be filled after implementation)
