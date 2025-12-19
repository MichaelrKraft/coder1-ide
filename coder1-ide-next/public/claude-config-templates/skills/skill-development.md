# Skill Development Guide for Claude Code Plugins

## Purpose

Skills are modular packages that extend Claude's capabilities through specialized knowledge, workflows, and tools. They function as "onboarding guides" that transform Claude into a domain-specialized agent with procedural knowledge.

## When to Use This Skill

- Creating a new skill for a Claude Code plugin
- Structuring skill content for optimal loading
- Writing YAML frontmatter for skill discovery
- Organizing skill resources (scripts, references, assets)
- Understanding progressive disclosure architecture

---

## Quick Reference

| Component | Purpose | Required |
|-----------|---------|----------|
| `SKILL.md` | Main skill file with frontmatter + instructions | Yes |
| `scripts/` | Executable code for deterministic operations | No |
| `references/` | Documentation Claude should consult | No |
| `assets/` | Output files, templates, logos | No |

---

## Skill Directory Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/          - Executable code
    ├── references/       - Documentation
    └── assets/           - Output files
```

---

## YAML Frontmatter Requirements

### Required Format

```yaml
---
name: Skill Name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2". Include exact phrases users would say.
version: 0.1.0
---
```

### Critical Rules

1. **Use third-person format**: "This skill should be used when..."
2. **Include concrete trigger phrases**: Exact phrases users would actually say
3. **Avoid vague language**: No generic descriptions
4. **List multiple specific scenarios**: Cover various use cases

### Good vs Bad Examples

**Good Description**:
```yaml
description: This skill should be used when the user asks to "set up Stripe payments", "integrate payment processing", "add subscription billing", or "handle webhooks for payments".
```

**Bad Description**:
```yaml
description: Provides guidance for working with payments.
```

---

## Writing Standards

### Imperative/Infinitive Form (Required)

Write instructions as verb-first commands. Never use second person.

**Correct**:
- "To create a hook, define the event type."
- "Configure the server with authentication."
- "Validate all inputs before processing."

**Incorrect**:
- "You should create a hook by defining..."
- "You need to configure the server..."
- "You will validate inputs..."

---

## Progressive Disclosure Architecture

### Three-Level Loading System

| Level | Content | When Loaded |
|-------|---------|-------------|
| 1. Metadata | ~100 words (frontmatter) | Always present |
| 2. SKILL.md body | <5,000 words | When skill triggers |
| 3. Bundled resources | Variable | As Claude determines necessity |

### Content Distribution Strategy

| Location | Content Type |
|----------|--------------|
| SKILL.md | Core concepts, essential procedures, quick references (1,500-2,000 words target) |
| references/ | Detailed patterns, advanced techniques, API documentation, edge cases |
| examples/ | Complete, runnable scripts and configuration files |
| scripts/ | Validation tools, testing helpers, automation utilities |

---

## 6-Step Skill Creation Process

### Step 1: Understand Use Cases
Gather concrete examples of how the skill will be used. Document specific user scenarios and queries that should trigger the skill.

### Step 2: Plan Reusable Contents
Analyze each use case to identify reusable resources:
- **Scripts**: For deterministic operations
- **References**: Documentation Claude should consult
- **Assets**: Output templates

### Step 3: Create Directory Structure
```bash
mkdir -p plugin-name/skills/skill-name/{references,examples,scripts}
touch plugin-name/skills/skill-name/SKILL.md
```

### Step 4: Write SKILL.md
Start with bundled resources, then write the main file answering:
- What is the skill's purpose?
- When should it be used?
- How should Claude leverage included resources?

### Step 5: Validate Structure
Verify:
- [ ] Frontmatter is complete and valid YAML
- [ ] Description uses third-person with specific trigger phrases
- [ ] Writing uses imperative form throughout
- [ ] SKILL.md stays lean (under 5,000 words, ideally 1,500-2,000)
- [ ] All referenced files exist

### Step 6: Iterate Based on Usage
After real-world testing:
- Strengthen trigger phrases
- Move long sections to references
- Add missing examples
- Clarify ambiguous instructions

---

## Resource Categories

### Scripts (`scripts/`)
**When to Include**: Code rewritten repeatedly or requiring deterministic reliability
**Benefit**: Token-efficient, may execute without context loading

### References (`references/`)
**When to Include**: Documentation Claude should reference during work
**Best Practice**: Include grep search patterns for large files (>10k words)

### Assets (`assets/`)
**When to Include**: Files used in output, not loaded into context
**Benefit**: Separates output resources from documentation

---

## Validation Checklist

Before deploying a skill, verify:
- [ ] SKILL.md exists with valid YAML frontmatter
- [ ] Description uses third person with specific trigger phrases
- [ ] Body uses imperative/infinitive writing throughout
- [ ] SKILL.md is lean (1,500-2,000 words, maximum 5,000)
- [ ] Detailed content resides in references/
- [ ] All referenced files actually exist
- [ ] Examples are complete and functional
- [ ] Scripts are executable and documented
- [ ] Skill triggers on expected user queries

---

## Best Practices Summary

1. Write frontmatter descriptions in third person with concrete scenarios
2. Keep SKILL.md focused and lean (1,500-2,000 words)
3. Distribute detailed content across references/ progressively
4. Use imperative form for all procedural content
5. Provide complete, functional examples users can adapt
6. Create utility scripts for repetitive operations
7. Study existing plugin-dev skills as templates
