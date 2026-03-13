/**
 * FlowTrace Embedding Service
 *
 * Wraps Gemini Embedding 2 (gemini-embedding-2-preview) for multimodal embeddings.
 * Uses the same pattern as skill-embeddings.ts (raw fetch to v1beta API).
 *
 * Key: One combined vector from image + OCR text together — this is what makes
 * FlowTrace's search cross-modal (text query finds screenshots, and vice versa).
 */

const GEMINI_MODEL = 'gemini-embedding-2-preview';
const EMBEDDING_DIMENSIONS = 1536; // Recommended: near-identical quality to 3072, half storage
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Uses the user's own GEMINI_API_KEY — never a shared key.
// Get a free key at https://aistudio.google.com/apikey
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'FlowTrace requires your Gemini API key. Set GEMINI_API_KEY in .env.local. ' +
      'Get a free key at https://aistudio.google.com/apikey'
    );
  }
  return key;
}

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * Embeds a screen frame: screenshot (JPEG bytes) + OCR text → single 1536-dim vector.
 * This is the core magic — image and text share the same vector space.
 */
export async function embedFrame(
  imageBase64: string,
  ocrText: string
): Promise<number[]> {
  const apiKey = getApiKey();

  // Truncate OCR to stay well within token limits (8192 token max)
  const truncatedOcr = ocrText.slice(0, 2000);

  const body = {
    model: `models/${GEMINI_MODEL}`,
    content: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          text: truncatedOcr,
        },
      ],
    },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };

  const response = await fetch(
    `${API_BASE}/models/${GEMINI_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini embedding API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

/**
 * Embeds a natural language query (text only, RETRIEVAL_QUERY task type).
 * Different task type from RETRIEVAL_DOCUMENT gives better retrieval precision.
 */
export async function embedQuery(queryText: string): Promise<number[]> {
  const apiKey = getApiKey();

  const body = {
    model: `models/${GEMINI_MODEL}`,
    content: {
      parts: [{ text: queryText }],
    },
    taskType: 'RETRIEVAL_QUERY',
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };

  const response = await fetch(
    `${API_BASE}/models/${GEMINI_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini embedding API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

export { EMBEDDING_DIMENSIONS };
