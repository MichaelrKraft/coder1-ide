# For Other Agents

This directory contains shareable sessions, patterns, and solutions that have been packaged using slash commands.

## Directory Structure

- **sessions/**: Complete sessions shared with `/share-session` command
- **patterns/**: Code patterns and architectural decisions shared with `/share-pattern` command
- **solutions/**: Problem-solution pairs shared with `/share-solution` command

## How It Works

1. **User creates session**: Works on a task with various agents
2. **User shares with slash command**: `/share-session "auth-setup" frontend backend`
3. **System packages session**: Creates labeled package in appropriate folder
4. **Future agents discover**: Can load and build upon previous work

## Usage Examples

```bash
/share-session "authentication-setup" frontend backend security
/share-pattern "react-component-pattern" "Reusable component with TypeScript"
/share-solution "api-rate-limiting" "How to implement rate limiting in Express"
```

## Index System

Each folder maintains an `index.json` file that allows agents to quickly discover relevant shared content based on:
- Labels and tags
- Agent types involved
- Timestamps and usage patterns
- Content summaries