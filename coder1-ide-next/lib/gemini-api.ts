import { logger } from '@/lib/logger';

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiResponse {
  id: string;
  model: string;
  choices: Array<{
    message: GeminiMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GeminiChatOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  max_tokens?: number;
}

export class GeminiAPIClient {
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai';
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured. Please add it to your .env.local file.');
    }
  }
  
  async chat(
    messages: GeminiMessage[],
    options: GeminiChatOptions = {}
  ): Promise<GeminiResponse> {
    const {
      model = 'gemini-2.5-flash',
      temperature = 0.7,
      top_p = 0.9,
      stream = false,
      max_tokens
    } = options;
    
    logger.info(`🤖 Gemini API Request: ${messages.length} messages to ${model}`);
    
    try {
      const requestBody: any = {
        model,
        messages,
        temperature,
        top_p,
        stream
      };
      
      if (max_tokens) {
        requestBody.max_tokens = max_tokens;
      }
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Gemini API Error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new Error('Invalid Gemini API key. Please check your .env.local configuration.');
        } else if (response.status === 429) {
          throw new Error('Gemini rate limit exceeded. Please try again later or use the free tier.');
        } else {
          throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
        }
      }
      
      const data: GeminiResponse = await response.json();
      
      const cost = this.calculateCost(data.usage, model);
      
      logger.info(`💰 Gemini Cost: $${cost.toFixed(6)} (${data.usage.total_tokens} tokens, model: ${model})`);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`❌ Gemini API Exception: ${error.message}`);
        throw error;
      } else {
        logger.error(`❌ Gemini API Unknown Error: ${String(error)}`);
        throw new Error(`Gemini API request failed: ${String(error)}`);
      }
    }
  }
  
  private calculateCost(usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }, model: string): number {
    if (model === 'gemini-2.5-flash-lite') {
      const inputCost = (usage.prompt_tokens / 1_000_000) * 0.10;
      const outputCost = (usage.completion_tokens / 1_000_000) * 0.40;
      return inputCost + outputCost;
    } else if (model === 'gemini-2.5-flash') {
      return (usage.total_tokens / 1_000_000) * 0.15;
    } else {
      return (usage.total_tokens / 1_000_000) * 0.15;
    }
  }
  
  private getCostPerMillionTokens(model: string): { input: number; output: number } {
    const costMap: Record<string, { input: number; output: number }> = {
      'gemini-2.5-flash': { input: 0.15, output: 0.15 },
      'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
      'gemini-2.0-flash': { input: 0.15, output: 0.60 }
    };
    
    return costMap[model] || { input: 0.15, output: 0.15 };
  }
  
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }
}

export function createGeminiClient(): GeminiAPIClient | null {
  try {
    return new GeminiAPIClient();
  } catch (error) {
    logger.warn('⚠️ Gemini API client not available (no API key configured)');
    return null;
  }
}
