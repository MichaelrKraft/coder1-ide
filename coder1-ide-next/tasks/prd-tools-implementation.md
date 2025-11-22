# PRD Tool-Based Generation Implementation Plan

**Date**: November 22, 2025  
**Status**: In Progress  
**Goal**: Replace template-based PRD generation with Claude Tool Use API for 93% token reduction and genuine AI intelligence

## 🎯 Executive Summary

We're implementing a tool-based PRD generation system using Claude's Tool Use API (function calling). This approach reduces token usage from ~42,500 to ~3,000 per PRD (93% reduction) while adding genuine AI analysis instead of template substitution.

### Key Decision: Tools vs Skills

**Chosen Approach**: Claude Tool Use API (function calling)  
**Reasoning**:
- More established, well-documented API
- Works directly with Messages API
- Programmatic definitions (not file-based)
- Flexible for dynamic tool composition
- Perfect for our orchestration needs

**Not Using**: Claude Skills (SKILL.md folders)
- Newer feature (Oct 2025), less mature
- File-based approach less flexible for our use case
- Better suited for reusable agent workflows

## 🏗️ Architecture Overview

```
Current Flow:
User Answers → Template Substitution → Generic PRD (~42,500 tokens)

New Flow:
User Answers → Tool Orchestration → Intelligent PRD (~3,000 tokens)
  ├─ analyze_answers_deeply (extended thinking)
  ├─ gather_prd_evidence (web research)
  ├─ generate_prd_section (×6 sections in parallel)
  └─ score_prd_quality (validation)
```

## 🔧 Tool Definitions

### 1. analyze_answers_deeply

**Purpose**: Deep analysis of questionnaire answers with extended thinking

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "answers": {
      "type": "object",
      "description": "User's questionnaire answers"
    },
    "pattern": {
      "type": "string",
      "description": "Selected pattern (stripe-saas, notion-productivity, etc.)"
    },
    "mode": {
      "type": "string",
      "enum": ["quick", "professional"],
      "description": "Generation depth mode"
    }
  },
  "required": ["answers", "pattern", "mode"]
}
```

**Output**:
```json
{
  "insights": {
    "problemAnalysis": "Deep dive into the real problem",
    "marketPosition": "Competitive positioning analysis",
    "differentiators": ["Unique value props"],
    "risks": ["Identified risks"],
    "recommendations": ["Strategic recommendations"]
  },
  "confidence": 0.85,
  "gaps": ["Additional information needed"]
}
```

**Implementation Notes**:
- Uses extended thinking mode for deep analysis
- Thinking budget: "ultrathink" for Professional mode, "think hard" for Quick mode
- Analyzes pattern-specific best practices
- Identifies non-obvious risks and opportunities

### 2. gather_prd_evidence

**Purpose**: Web research for market data and competitive intelligence

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "insights": {
      "type": "object",
      "description": "Output from analyze_answers_deeply"
    },
    "category": {
      "type": "string",
      "description": "Product category"
    },
    "competitors": {
      "type": "array",
      "items": {"type": "string"},
      "description": "List of competitors to research"
    }
  },
  "required": ["insights", "category"]
}
```

**Output**:
```json
{
  "marketData": {
    "size": "$47B (Gartner 2025)",
    "growth": "13.7% CAGR",
    "trends": ["AI integration", "Mobile-first"]
  },
  "competitive": {
    "landscape": ["Competitor analysis"],
    "gaps": ["Market opportunities"],
    "positioning": "Recommended positioning"
  },
  "evidence": ["Supporting data points"]
}
```

**Implementation Notes**:
- Conditionally uses web_search server tool
- Caches results for 24 hours (avoid re-fetching)
- Only runs in Professional mode or when explicitly requested

### 3. generate_prd_section

**Purpose**: Generate intelligent content for specific PRD section

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "section": {
      "type": "string",
      "enum": [
        "executive_summary",
        "problem_statement",
        "solution_overview",
        "technical_architecture",
        "implementation_roadmap",
        "risk_assessment"
      ],
      "description": "PRD section to generate"
    },
    "insights": {
      "type": "object",
      "description": "Analysis insights"
    },
    "evidence": {
      "type": "object",
      "description": "Market evidence (optional)"
    },
    "pattern": {
      "type": "string",
      "description": "Pattern to follow"
    }
  },
  "required": ["section", "insights", "pattern"]
}
```

**Output**:
```json
{
  "content": "Markdown content for section",
  "quality_score": 8.5,
  "suggestions": ["Improvement suggestions"]
}
```

**Implementation Notes**:
- Can run 6 sections in parallel
- Uses "think hard" mode for quality content
- Pattern-aware (follows Stripe, Notion, etc. best practices)
- Returns quality score for validation

### 4. score_prd_quality

**Purpose**: Analyze PRD quality and suggest improvements

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "prd": {
      "type": "string",
      "description": "Complete PRD markdown"
    },
    "criteria": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Quality criteria to check"
    }
  },
  "required": ["prd"]
}
```

**Output**:
```json
{
  "overall_score": 8.5,
  "dimension_scores": {
    "completeness": 9.0,
    "evidence": 7.5,
    "excitement": 8.0,
    "clarity": 9.0,
    "actionability": 8.5
  },
  "weak_sections": ["Section names that need work"],
  "improvements": ["Specific improvement suggestions"]
}
```

**Implementation Notes**:
- Runs after initial PRD generation
- Triggers enhancement loop if score < 8.0
- Uses "think" mode (lighter weight)

## 📁 File Structure

```
coder1-ide-next/
├── services/
│   └── prd-tools/
│       ├── tool-definitions.ts          # Tool schemas
│       ├── tool-executor.ts             # Claude API integration
│       ├── analyze-answers-tool.ts      # Analysis logic
│       ├── gather-evidence-tool.ts      # Evidence gathering
│       ├── generate-section-tool.ts     # Section generation
│       ├── score-quality-tool.ts        # Quality scoring
│       └── tool-orchestrator.ts         # Workflow coordination
│
├── app/api/smart-prd/
│   ├── sessions/[sessionId]/
│   │   └── generate-prd/
│   │       └── route.ts                 # Enhanced with tools
│   └── tools/
│       ├── analyze/route.ts             # Analysis endpoint
│       ├── evidence/route.ts            # Evidence endpoint
│       └── quality/route.ts             # Quality endpoint
│
└── tasks/
    └── prd-tools-implementation.md      # This file
```

## 🔄 Implementation Phases

### Phase 1: Tool Infrastructure (Days 1-2)

**Tasks**:
- [x] Research Claude Tool Use API
- [in_progress] Create tool definition schemas
- [ ] Implement tool executor service
- [ ] Add Anthropic SDK to project
- [ ] Create tool orchestrator

**Deliverables**:
- `/services/prd-tools/tool-definitions.ts`
- `/services/prd-tools/tool-executor.ts`
- `/services/prd-tools/tool-orchestrator.ts`

**Success Criteria**:
- Tools can be defined and registered
- Tool executor can invoke Claude API with tools
- Orchestrator can chain multiple tools

### Phase 2: Core Tools (Days 3-5)

**Tasks**:
- [ ] Implement analyze_answers_deeply tool
- [ ] Implement gather_prd_evidence tool
- [ ] Implement generate_prd_section tool
- [ ] Implement score_prd_quality tool

**Deliverables**:
- All 4 tool implementations
- Unit tests for each tool
- Tool invocation examples

**Success Criteria**:
- Each tool produces expected output format
- Extended thinking modes work correctly
- Web search integration functional

### Phase 3: API Integration (Days 6-7)

**Tasks**:
- [ ] Enhance generate-prd API route with tools
- [ ] Add tool-based generation mode (opt-in)
- [ ] Implement fallback to templates (safety)
- [ ] Add API endpoints for individual tools

**Deliverables**:
- Updated `/app/api/smart-prd/sessions/[sessionId]/generate-prd/route.ts`
- New tool-specific API endpoints
- Feature flag for tool-based generation

**Success Criteria**:
- API route uses tools when enabled
- Falls back to templates if tools fail
- Individual tool endpoints work independently

### Phase 4: Testing & Validation (Days 8-9)

**Tasks**:
- [ ] Test token usage reduction
- [ ] Compare PRD quality (template vs tool)
- [ ] Test all thinking modes
- [ ] Performance testing
- [ ] Cost analysis

**Deliverables**:
- Token usage comparison report
- Quality comparison examples
- Performance benchmarks
- Cost analysis spreadsheet

**Success Criteria**:
- 93% token reduction achieved
- PRD quality improved (8+ score)
- Response time acceptable (<30s)
- Cost per PRD < $0.10

### Phase 5: Polish & Documentation (Days 10-11)

**Tasks**:
- [ ] Add admin UI for tool management
- [ ] Create user-facing documentation
- [ ] Add telemetry and monitoring
- [ ] Final testing and bug fixes

**Deliverables**:
- Admin dashboard for tools
- User documentation
- Monitoring dashboards
- Bug fix summary

**Success Criteria**:
- System production-ready
- Documentation complete
- Monitoring in place

## 💰 Token Usage Breakdown

### Current Template System:
```
Per PRD Generation:
- Prompt engineering: ~6,500 tokens
- Template context: ~10,000 tokens
- Answer processing: ~6,000 tokens
- Section generation: ~20,000 tokens
Total: ~42,500 tokens input
Output: ~5,000 tokens

Cost: $0.13 (input) + $0.08 (output) = $0.21 per PRD
```

### New Tool-Based System:
```
Per PRD Generation:
- Tool definitions: ~500 tokens (analyze_answers_deeply)
- Tool invocation: ~300 tokens (gather_prd_evidence)
- Section tools (×6): ~1,800 tokens (parallel)
- Quality check: ~400 tokens
Total: ~3,000 tokens input
Output: ~5,000 tokens (same)

Cost: $0.01 (input) + $0.08 (output) = $0.09 per PRD

Savings: 57% cost reduction, 93% token reduction
```

### At Scale:
```
1,000 PRDs/month:
- Current: $210/month
- Tool-based: $90/month
- Savings: $120/month

10,000 PRDs/month:
- Current: $2,100/month
- Tool-based: $900/month
- Savings: $1,200/month
```

## 🎯 Success Metrics

### Technical Metrics:
- [ ] Token usage: <3,500 tokens per PRD
- [ ] Response time: <30 seconds
- [ ] Success rate: >99%
- [ ] Error rate: <0.1%

### Quality Metrics:
- [ ] PRD completeness: >90%
- [ ] Evidence-based: >80% of claims backed
- [ ] Excitement score: >8/10
- [ ] User satisfaction: >4.5/5

### Business Metrics:
- [ ] Cost per PRD: <$0.10
- [ ] Conversion to Coder1 IDE: >40%
- [ ] Time to generate: <3 min (Quick), <10 min (Pro)

## 🚧 Known Challenges

### 1. Extended Thinking Costs
**Issue**: Ultrathink mode can be expensive  
**Mitigation**: 
- Use "think hard" by default
- Reserve "ultrathink" for Professional mode
- Cache analysis results (24 hours)

### 2. Web Search Rate Limits
**Issue**: Web search might hit rate limits  
**Mitigation**:
- Cache competitive research
- Only run in Professional mode
- Implement request queuing

### 3. Tool Execution Timeout
**Issue**: Multiple tools might take >30s  
**Mitigation**:
- Run sections in parallel
- Implement streaming responses
- Show progress indicators

### 4. Quality Consistency
**Issue**: AI output can vary  
**Mitigation**:
- Use temperature=0 for consistency
- Implement quality validation
- Re-generate weak sections

## 📚 References

- [Claude Tool Use Documentation](https://docs.claude.com/en/docs/build-with-claude/tool-use)
- [Anthropic API Reference](https://docs.anthropic.com/en/api/messages)
- [Extended Thinking Guide](https://docs.anthropic.com/en/docs/extended-thinking)
- [Best Practices for PRDs with Claude Code](https://www.chatprd.ai/resources/PRD-for-Claude-Code)

## 🔄 Review & Iteration

This implementation plan will be updated as we progress. Key decision points:

- After Phase 1: Validate tool architecture
- After Phase 2: Review individual tool performance
- After Phase 3: Test end-to-end generation
- After Phase 4: Make go/no-go decision for production

---

**Last Updated**: November 22, 2025  
**Next Review**: After Phase 1 completion  
**Status**: Phase 1 in progress (tool definitions)
