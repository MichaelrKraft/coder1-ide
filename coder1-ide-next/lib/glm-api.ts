import { logger } from '@/lib/logger';

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GLMResponse {
  id: string;
  model: string;
  choices: Array<{
    message: GLMMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GLMChatOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  max_tokens?: number;
}

export class GLMAPIClient {
  private apiKey: string;
  private baseURL = 'https://open.bigmodel.cn/api/paas/v4';
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GLM_API_KEY || process.env.GLM_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GLM_API_KEY not configured. Please add it to your .env.local file.');
    }
  }
  
  async chat(
    messages: GLMMessage[],
    options: GLMChatOptions = {}
  ): Promise<GLMResponse> {
    const {
      model = 'glm-4.6',
      temperature = 0.7,
      top_p = 0.9,
      stream = false,
      max_tokens
    } = options;
    
    logger.info(`🤖 GLM API Request: ${messages.length} messages to ${model}`);
    
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
        logger.error(`❌ GLM API Error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new Error('Invalid GLM API key. Please check your .env.local configuration.');
        } else if (response.status === 429) {
          throw new Error('GLM rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`GLM API Error ${response.status}: ${errorText}`);
        }
      }
      
      const data: GLMResponse = await response.json();
      
      const costPerMillionTokens = this.getCostPerMillionTokens(model);
      const cost = (data.usage.total_tokens / 1_000_000) * costPerMillionTokens;
      
      logger.info(`💰 GLM Cost: $${cost.toFixed(6)} (${data.usage.total_tokens} tokens, model: ${model})`);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`❌ GLM API Exception: ${error.message}`);
        throw error;
      } else {
        logger.error(`❌ GLM API Unknown Error: ${String(error)}`);
        throw new Error(`GLM API request failed: ${String(error)}`);
      }
    }
  }
  
  private getCostPerMillionTokens(model: string): number {
    const costMap: Record<string, number> = {
      'glm-4-flash': 0.10,
      'glm-4-air': 1.00,
      'glm-4-plus': 50.00,
      'glm-4-0520': 100.00
    };
    
    return costMap[model] || 0.10;
  }
  
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }
}

export function createGLMClient(): GLMAPIClient | null {
  try {
    return new GLMAPIClient();
  } catch (error) {
    logger.warn('⚠️ GLM API client not available (no API key configured)');
    return null;
  }
}
