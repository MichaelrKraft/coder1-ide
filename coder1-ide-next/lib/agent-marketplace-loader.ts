/**
 * Agent Marketplace Loader
 * Server-only. Reads built-in agent templates from the filesystem.
 */

import 'server-only';
import fs from 'fs';
import path from 'path';
import type { AgentMarketplaceTemplate } from '@/types/agent-marketplace';

const TEMPLATES_DIR = path.join(process.cwd(), 'lib', 'agent-marketplace-templates');

function isValidTemplate(value: unknown): value is AgentMarketplaceTemplate {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.description === 'string' &&
    typeof t.category === 'string' &&
    typeof t.isBuiltIn === 'boolean' &&
    typeof t.agentConfig === 'object' &&
    t.agentConfig !== null
  );
}

/**
 * Load all built-in agent templates from the templates directory.
 * Returns only valid, parseable templates; skips invalid files.
 */
export function loadBuiltInAgentTemplates(): AgentMarketplaceTemplate[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'));
  const templates: AgentMarketplaceTemplate[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      if (isValidTemplate(parsed)) {
        templates.push(parsed);
      } else {
        console.warn(`[AgentMarketplace] Invalid template file skipped: ${file}`);
      }
    } catch (err) {
      console.warn(`[AgentMarketplace] Failed to parse template ${file}:`, err);
    }
  }

  return templates;
}
