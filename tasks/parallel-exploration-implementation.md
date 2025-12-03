# Parallel Exploration Framework - 2-Week Implementation Plan

**Goal**: Build universal parallel exploration system using Claude Skills, MCP servers, and existing sandbox infrastructure WITHOUT breaking any existing UI/UX.

**Timeline**: 2 weeks (accelerated from 4 weeks)
**Start Date**: November 25, 2025

## Critical Constraints

1. ✅ **DO NOT MODIFY**: `SandboxPanel.tsx` - Existing sandbox UI
2. ✅ **DO NOT MODIFY**: `enhanced-tmux-service.ts` core functionality  
3. ✅ **DO NOT MODIFY**: Existing sandbox API routes
4. ✅ **ADDITIVE ONLY**: All new features must be additions, not replacements

## Week 1: Core Infrastructure (Days 1-7)

### Day 1-2: Claude Skills Foundation
- [ ] Create orchestrator skill (`~/.claude/skills/parallel-exploration-orchestrator/`)
  - [ ] SKILL.md with progressive disclosure
  - [ ] references/quick-start.md (200 tokens)
  - [ ] references/task-analysis.md (500 tokens)
  - [ ] references/strategy-generation.md (600 tokens)
  - [ ] references/resource-mapping.md (400 tokens)
  - [ ] references/evaluation-rubric.md (300 tokens)
  - [ ] scripts/detect-domain.py (Claude-based classification)

- [ ] Create agent skill (`~/.claude/skills/adaptive-explorer/`)
  - [ ] SKILL.md with workflow guide
  - [ ] references/research-process.md
  - [ ] references/coordination-protocol.md
  - [ ] references/self-evaluation.md

### Day 3-4: MCP Server Implementation
- [ ] Universal Resource Finder MCP
  - [ ] `mcp-servers/universal-resource-finder/index.ts`
  - [ ] `mcp-servers/universal-resource-finder/domain-mappings.json`
  - [ ] Register tools: `discover_resources`, `search_examples`
  - [ ] Test with simple queries

- [ ] Sandbox Coordinator MCP
  - [ ] `mcp-servers/sandbox-coordinator/index.ts`
  - [ ] Register tools: `register_agent`, `check_other_agents`
  - [ ] Implement similarity detection (>60% = warning)
  - [ ] Test coordination logic

- [ ] Skill Reference Loader MCP
  - [ ] `mcp-servers/skill-reference-loader/index.ts`
  - [ ] On-demand reference loading
  - [ ] Cache management

### Day 5-6: Service Layer
- [ ] Parallel Exploration Service
  - [ ] `coder1-ide-next/services/parallel-exploration-service.ts`
  - [ ] Cache warming implementation
  - [ ] Strategy generation (Claude Opus 4 + extended thinking)
  - [ ] Parallel sandbox spawning (using existing tmux service)
  - [ ] Variation evaluation

- [ ] Integration with existing tmux service
  - [ ] Test creating multiple sandboxes simultaneously
  - [ ] Verify resource limits respected
  - [ ] Confirm no conflicts with existing sandbox workflows

### Day 7: API Layer
- [ ] New API routes (separate from existing sandbox routes)
  - [ ] `app/api/parallel-exploration/spawn/route.ts`
  - [ ] `app/api/parallel-exploration/status/route.ts`
  - [ ] `app/api/parallel-exploration/evaluate/route.ts`
  - [ ] `app/api/parallel-exploration/stop/route.ts`

- [ ] API testing
  - [ ] Test spawn endpoint with various configs
  - [ ] Verify no interference with existing `/api/sandbox` routes

## Week 2: UI & Integration (Days 8-14)

### Day 8-9: UI Components (Additive Only)
- [ ] New modal component (does NOT replace existing sandbox button)
  - [ ] `components/sandbox/ParallelExplorationModal.tsx`
  - [ ] Task description textarea
  - [ ] Variation count slider (2-5)
  - [ ] Budget selector (Haiku/Sonnet/Opus)
  - [ ] Cost indicators

- [ ] Progress monitor component
  - [ ] `components/sandbox/ParallelExplorationMonitor.tsx`
  - [ ] Real-time agent status display
  - [ ] Strategy visualization
  - [ ] Completion percentage

### Day 10: UI Integration Point
- [ ] Add NEW button to trigger parallel exploration
  - [ ] Option A: New button in SandboxPanel header area
  - [ ] Option B: New menu item in status bar
  - [ ] Option C: Dedicated toolbar button
  - [ ] **CRITICAL**: Must not interfere with existing sandbox button

### Day 11-12: Comparison & Results UI
- [ ] Extend existing SandboxComparisonView (if safe)
  - [ ] OR create new ParallelExplorationResults.tsx
  - [ ] Side-by-side variation comparison
  - [ ] AI-powered ranking display
  - [ ] Export options (Markdown, JSON)

### Day 13: Testing & Validation
- [ ] End-to-end testing
  - [ ] Test 5 different use cases (landing page, API, dashboard, etc.)
  - [ ] Verify existing sandbox workflows still work
  - [ ] Test concurrent usage (parallel exploration + manual sandbox)
  - [ ] Performance testing (resource usage, speed)

- [ ] Error handling
  - [ ] Test failure scenarios
  - [ ] Verify graceful degradation
  - [ ] Check cleanup on errors

### Day 14: Documentation & Polish
- [ ] User documentation
  - [ ] Feature guide for parallel exploration
  - [ ] Example use cases
  - [ ] Troubleshooting guide

- [ ] Developer documentation
  - [ ] Architecture overview
  - [ ] MCP server usage
  - [ ] Extension guide for new domains

- [ ] Code cleanup
  - [ ] Remove debug logging
  - [ ] Add production error handling
  - [ ] Performance optimization

## Success Criteria

### Functionality
- [ ] Works across 20+ use cases without code changes
- [ ] Generates 2-5 distinct variations in 3-6 minutes
- [ ] 60-70% token reduction vs traditional approach
- [ ] 80%+ user satisfaction with variation quality

### Safety
- [ ] Zero breaking changes to existing sandbox UI
- [ ] All existing sandbox tests still pass
- [ ] No conflicts with manual sandbox workflows
- [ ] Proper resource cleanup on errors

### Performance
- [ ] <5 seconds to spawn all agents
- [ ] <200ms overhead for coordination checks
- [ ] <10MB memory overhead per agent
- [ ] 90%+ cache hit rate for common domains

## Risk Mitigation

### Risk: Breaking existing sandbox UI
**Mitigation**: Never modify SandboxPanel.tsx directly. Add new button/trigger separately.

### Risk: Resource exhaustion
**Mitigation**: Respect existing 5-sandbox-per-user limit. Parallel exploration counts toward this limit.

### Risk: Token cost explosion
**Mitigation**: Implement cache warming, progressive disclosure, and budget limits.

### Risk: Agent duplication
**Mitigation**: Sandbox Coordinator MCP enforces >60% diversity threshold.

## Current Status

- [x] Plan approved by user
- [x] Existing infrastructure reviewed
- [x] Integration points identified
- [ ] Implementation begins

## Next Steps

1. Create orchestrator skill directory structure
2. Build SKILL.md with progressive disclosure
3. Test skill locally with Claude Code
4. Build first MCP server (Resource Finder)
5. Continue systematically through checklist

---

**Last Updated**: November 25, 2025
**Status**: Ready to Begin Implementation
**Timeline**: On track for 2-week completion
