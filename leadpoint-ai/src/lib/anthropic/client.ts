import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// Client Initialization
// ============================================================================

let anthropicClient: Anthropic | null = null;

/**
 * Get or create the Anthropic client instance
 * Returns null if no API key is configured (enables mock mode)
 */
export function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[Anthropic] No API key found, using mock mode");
    return null;
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return anthropicClient;
}

// Legacy export for backwards compatibility
export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : (null as unknown as Anthropic);

// ============================================================================
// Model Configuration
// ============================================================================

export const MODELS = {
  CLAUDE_3_OPUS: "claude-3-opus-20240229",
  CLAUDE_3_SONNET: "claude-3-sonnet-20240229",
  CLAUDE_3_HAIKU: "claude-3-haiku-20240307",
  CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20241022",
  CLAUDE_SONNET_4: "claude-sonnet-4-20250514",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// Default model for outreach generation (balanced quality/speed)
export const DEFAULT_MODEL = MODELS.CLAUDE_SONNET_4;

// ============================================================================
// Message Types
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerationOptions {
  model?: ModelId;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface GenerationResult {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Generate a message using Claude
 * Falls back to mock response if no API key is configured
 */
export async function generateMessage(
  prompt: string,
  systemPrompt?: string,
  options?: Omit<GenerationOptions, "systemPrompt">
): Promise<string> {
  const client = getAnthropicClient();

  if (!client) {
    // Import mock function dynamically to avoid circular deps
    const { getMockResponse } = await import("./mock");
    return getMockResponse(prompt);
  }

  const {
    model = DEFAULT_MODEL,
    maxTokens = 1024,
    temperature = 0.7,
  } = options || {};

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

/**
 * Generate a completion with full result metadata
 */
export async function generateCompletion(
  prompt: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const client = getAnthropicClient();

  const {
    model = DEFAULT_MODEL,
    maxTokens = 1024,
    temperature = 0.7,
    systemPrompt,
  } = options || {};

  if (!client) {
    const { getMockResponse } = await import("./mock");
    return {
      text: getMockResponse(prompt),
      model: "mock",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");

  return {
    text: textBlock?.type === "text" ? textBlock.text : "",
    model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate a chat completion with message history
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  options?: GenerationOptions
): Promise<string> {
  const client = getAnthropicClient();

  const {
    model = DEFAULT_MODEL,
    maxTokens = 1024,
    temperature = 0.7,
    systemPrompt,
  } = options || {};

  if (!client) {
    const { getMockResponse } = await import("./mock");
    const lastMessage = messages[messages.length - 1];
    return getMockResponse(lastMessage?.content || "");
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

/**
 * Stream a completion (generator function)
 */
export async function* streamCompletion(
  prompt: string,
  options?: GenerationOptions
): AsyncGenerator<string> {
  const client = getAnthropicClient();

  const {
    model = DEFAULT_MODEL,
    maxTokens = 1024,
    temperature = 0.7,
    systemPrompt,
  } = options || {};

  if (!client) {
    const { getMockResponse } = await import("./mock");
    const mockText = getMockResponse(prompt);
    // Simulate streaming by yielding chunks
    const words = mockText.split(" ");
    for (const word of words) {
      yield word + " ";
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return;
  }

  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the Anthropic client is available (API key configured)
 */
export function isAnthropicAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Get the current mode (live or mock)
 */
export function getClientMode(): "live" | "mock" {
  return isAnthropicAvailable() ? "live" : "mock";
}
