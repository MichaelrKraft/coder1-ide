import { getAgentHubDatabase } from './db';
import { FLAGS } from './feature-flags';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string | null;
}

export interface AutoAssignResult {
  agentId: string | null;
  confidence: 'high' | 'low';
  reasoning: string;
}

// 5-minute TTL cache for the system prompt, keyed by userId+agentHash
const cache = new Map<string, { prompt: string; agentHash: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function hashAgents(agents: Agent[]): string {
  const str = agents.map((a) => `${a.id}:${a.name}:${a.role}`).join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function buildSystemPrompt(agents: Agent[]): string {
  const agentList = agents
    .map(
      (a) =>
        `- ID: ${a.id} | Name: ${a.name} | Role: ${a.role}${
          a.description ? ` | ${a.description.substring(0, 100)}` : ''
        }`
    )
    .join('\n');

  return `You are an AI task router. Given a task title and description, select the most appropriate agent from the list below.

Available agents:
${agentList}

Respond with ONLY a JSON object in this exact format:
{"agentId": "<agent-id>", "confidence": "high" or "low", "reasoning": "<one sentence>"}

If no agent is clearly appropriate, set agentId to the first agent's ID with confidence "low".`;
}

export async function autoAssignTask(
  taskTitle: string,
  taskDescription: string,
  userId: string
): Promise<AutoAssignResult> {
  if (!FLAGS.autoAssignEnabled) {
    return { agentId: null, confidence: 'low', reasoning: 'Auto-assign disabled' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { agentId: null, confidence: 'low', reasoning: 'GEMINI_API_KEY not set' };
  }

  const db = getAgentHubDatabase();
  const agents = db
    .prepare(
      `SELECT id, name, role, description FROM agent_hub_agents WHERE user_id = ? AND status != 'archived' ORDER BY created_at ASC`
    )
    .all(userId) as Agent[];

  if (agents.length === 0) {
    return { agentId: null, confidence: 'low', reasoning: 'No agents available' };
  }

  const fallback: AutoAssignResult = {
    agentId: agents[0].id,
    confidence: 'low',
    reasoning: 'Fallback to first agent',
  };

  try {
    const agentHash = hashAgents(agents);
    const cacheKey = `${userId}:${agentHash}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    const isCacheValid =
      cached && cached.agentHash === agentHash && now - cached.cachedAt < CACHE_TTL_MS;

    const systemPrompt = isCacheValid ? cached.prompt : buildSystemPrompt(agents);
    if (!isCacheValid) {
      cache.set(cacheKey, { prompt: systemPrompt, agentHash, cachedAt: now });
    }

    const userMessage = `Task: ${taskTitle}\n\nDescription: ${taskDescription || '(no description)'}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { maxOutputTokens: 100, temperature: 0 },
          }),
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return fallback;

    // Parse JSON response (may be wrapped in ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]) as {
      agentId?: string;
      confidence?: string;
      reasoning?: string;
    };

    // Validate agentId exists in our actual agent list
    const validAgent = agents.find((a) => a.id === parsed.agentId);
    if (!validAgent) {
      return { ...fallback, reasoning: `Gemini returned unknown agentId: ${parsed.agentId}` };
    }

    return {
      agentId: validAgent.id,
      confidence: parsed.confidence === 'high' ? 'high' : 'low',
      reasoning: parsed.reasoning ?? 'Auto-assigned by AI',
    };
  } catch (err) {
    console.warn('[auto-assign] error:', err instanceof Error ? err.message : err);
    return fallback;
  }
}
