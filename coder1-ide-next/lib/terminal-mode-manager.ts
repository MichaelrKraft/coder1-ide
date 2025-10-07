import { GLMAPIClient, GLMMessage, createGLMClient } from './glm-api';
import { GeminiAPIClient, GeminiMessage, createGeminiClient } from './gemini-api';
import { TerminalContextExtractor } from './terminal-context-extractor';
import { useModelStore } from '@/stores/useModelStore';
import { useGLMCostStore } from '@/stores/useGLMCostStore';
import { logger } from './logger';

export type TerminalMode = 'CLAUDE_CLI' | 'GLM_API' | 'GEMINI_API';

export interface ModeSwitch {
  from: TerminalMode;
  to: TerminalMode;
  timestamp: Date;
  contextPreserved: boolean;
  messageCount: number;
}

export class TerminalModeManager {
  private currentMode: TerminalMode = 'CLAUDE_CLI';
  private glmClient: GLMAPIClient | null = null;
  private geminiClient: GeminiAPIClient | null = null;
  private preservedContext: GLMMessage[] | GeminiMessage[] = [];
  private switchHistory: ModeSwitch[] = [];
  private rateLimitCooldownTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.glmClient = createGLMClient();
    this.geminiClient = createGeminiClient();
    
    if (this.glmClient) {
      logger.info('✅ GLM API client initialized successfully');
    } else {
      logger.warn('⚠️ GLM API client not available (no API key configured)');
    }
    
    if (this.geminiClient) {
      logger.info('✅ Gemini API client initialized successfully');
    } else {
      logger.warn('⚠️ Gemini API client not available (no API key configured)');
    }
  }
  
  /**
   * Check if GLM is available
   */
  isGLMAvailable(): boolean {
    return this.glmClient !== null && this.glmClient.isConfigured();
  }
  
  /**
   * Check if Gemini is available
   */
  isGeminiAvailable(): boolean {
    return this.geminiClient !== null && this.geminiClient.isConfigured();
  }
  
  /**
   * Get current terminal mode
   */
  getCurrentMode(): TerminalMode {
    return this.currentMode;
  }
  
  /**
   * Switch to GLM mode with context preservation
   */
  async switchToGLM(xtermInstance: any, options?: {
    notifyUser?: (message: string) => void;
    maxContextLines?: number;
  }): Promise<boolean> {
    const { notifyUser, maxContextLines = 200 } = options || {};
    
    if (!this.isGLMAvailable()) {
      logger.error('❌ Cannot switch to GLM: API key not configured');
      notifyUser?.('GLM API key not configured. Please add GLM_API_KEY to .env.local');
      return false;
    }
    
    if (this.currentMode === 'GLM_API') {
      logger.warn('⚠️ Already in GLM mode');
      return true;
    }
    
    logger.info('🔄 Switching from Claude CLI → GLM API');
    notifyUser?.('Switching to GLM API...');
    
    try {
      // Extract conversation context from terminal buffer
      const context = TerminalContextExtractor.extractContext(xtermInstance, maxContextLines);
      
      // Convert to GLM message format
      const currentModel = useModelStore.getState().selectedModel;
      const modelName = currentModel === 'glm-4.6' ? 'GLM-4.6' : 'GLM';
      
      this.preservedContext = [
        {
          role: 'system',
          content: `You are ${modelName}, a helpful AI assistant integrated into Coder1 IDE terminal. You are assisting with development tasks. Previous conversation context is provided below. Continue naturally from where the conversation left off.`
        },
        ...context.messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];
      
      logger.info(`📋 Preserved ${context.messages.length} messages (${context.extractedLines} lines from buffer)`);
      logger.debug(`Context summary: ${TerminalContextExtractor.getContextSummary(context)}`);
      
      // Record mode switch
      this.switchHistory.push({
        from: this.currentMode,
        to: 'GLM_API',
        timestamp: new Date(),
        contextPreserved: true,
        messageCount: context.messages.length
      });
      
      // Update mode
      this.currentMode = 'GLM_API';
      // Don't change the model - respect user's selection (glm-4.5, glm-4.5-air, or glm-4.6)
      const selectedModel = useModelStore.getState().selectedModel;
      const displayName = selectedModel === 'glm-4.6' ? 'GLM 4.6' : 
                          selectedModel === 'glm-4.5' ? 'GLM 4.5' : 
                          selectedModel === 'glm-4.5-air' ? 'GLM 4.5 Air' : selectedModel;
      
      notifyUser?.(`✅ Switched to ${displayName}. Context preserved (${context.messages.length} messages).`);
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to switch to GLM:', error);
      notifyUser?.('Failed to switch to GLM. Check console for details.');
      return false;
    }
  }
  
  /**
   * Switch to Gemini mode with context preservation
   */
  async switchToGemini(xtermInstance: any, options?: {
    notifyUser?: (message: string) => void;
    maxContextLines?: number;
  }): Promise<boolean> {
    const { notifyUser, maxContextLines = 200 } = options || {};
    
    if (!this.isGeminiAvailable()) {
      logger.error('❌ Cannot switch to Gemini: API key not configured');
      notifyUser?.('Gemini API key not configured. Please add GEMINI_API_KEY to .env.local');
      return false;
    }
    
    if (this.currentMode === 'GEMINI_API') {
      logger.warn('⚠️ Already in Gemini mode');
      return true;
    }
    
    logger.info('🔄 Switching from Claude CLI → Gemini API');
    notifyUser?.('Switching to Gemini API...');
    
    try {
      // Extract conversation context from terminal buffer
      const context = TerminalContextExtractor.extractContext(xtermInstance, maxContextLines);
      
      // Convert to Gemini message format
      const currentModel = useModelStore.getState().selectedModel;
      const modelName = currentModel === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : 
                        currentModel === 'gemini-2.5-flash-lite' ? 'Gemini 2.5 Flash-Lite' : 'Gemini';
      
      this.preservedContext = [
        {
          role: 'system',
          content: `You are ${modelName}, a helpful AI assistant integrated into Coder1 IDE terminal. You are assisting with development tasks. Previous conversation context is provided below. Continue naturally from where the conversation left off.`
        },
        ...context.messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];
      
      logger.info(`📋 Preserved ${context.messages.length} messages (${context.extractedLines} lines from buffer)`);
      logger.debug(`Context summary: ${TerminalContextExtractor.getContextSummary(context)}`);
      
      // Record mode switch
      this.switchHistory.push({
        from: this.currentMode,
        to: 'GEMINI_API',
        timestamp: new Date(),
        contextPreserved: true,
        messageCount: context.messages.length
      });
      
      // Update mode
      this.currentMode = 'GEMINI_API';
      const selectedModel = useModelStore.getState().selectedModel;
      if (!selectedModel.startsWith('gemini-')) {
        useModelStore.getState().setSelectedModel('gemini-2.5-flash-lite');
      }
      
      notifyUser?.(`✅ Switched to Gemini. Context preserved (${context.messages.length} messages).`);
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to switch to Gemini:', error);
      notifyUser?.('Failed to switch to Gemini. Check console for details.');
      return false;
    }
  }
  
  /**
   * Switch back to Claude CLI
   */
  async switchToClaude(options?: {
    notifyUser?: (message: string) => void;
  }): Promise<boolean> {
    const { notifyUser } = options || {};
    
    if (this.currentMode === 'CLAUDE_CLI') {
      logger.warn('⚠️ Already in Claude CLI mode');
      return true;
    }
    
    logger.info('🔄 Switching from GLM API → Claude CLI');
    notifyUser?.('Switching back to Claude CLI...');
    
    try {
      // Record mode switch
      this.switchHistory.push({
        from: this.currentMode,
        to: 'CLAUDE_CLI',
        timestamp: new Date(),
        contextPreserved: false,
        messageCount: 0
      });
      
      // Clear preserved context
      this.preservedContext = [];
      
      // Update mode
      this.currentMode = 'CLAUDE_CLI';
      // Don't change the user's model - they may have selected a specific Claude model
      
      notifyUser?.('✅ Switched back to Claude CLI');
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to switch to Claude:', error);
      notifyUser?.('Failed to switch to Claude. Check console for details.');
      return false;
    }
  }
  
  /**
   * Schedule auto-switch back to Claude after cooldown
   */
  scheduleAutoSwitchBack(
    cooldownMinutes: number = 15,
    onCooldownComplete: () => void
  ): void {
    // Clear any existing timer
    if (this.rateLimitCooldownTimer) {
      clearTimeout(this.rateLimitCooldownTimer);
    }
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    logger.info(`⏰ Scheduled auto-switch back to Claude in ${cooldownMinutes} minutes`);
    
    this.rateLimitCooldownTimer = setTimeout(() => {
      logger.info('⏰ Rate limit cooldown complete - ready to switch back to Claude');
      onCooldownComplete();
    }, cooldownMs);
  }
  
  /**
   * Cancel auto-switch timer
   */
  cancelAutoSwitch(): void {
    if (this.rateLimitCooldownTimer) {
      clearTimeout(this.rateLimitCooldownTimer);
      this.rateLimitCooldownTimer = null;
      logger.info('🚫 Cancelled auto-switch timer');
    }
  }
  
  /**
   * Send message based on current mode
   * Returns response for GLM mode, null for Claude CLI (handled by socket)
   */
  async sendMessage(
    message: string,
    socketEmit: (event: string, data: any) => void
  ): Promise<string | null> {
    if (this.currentMode === 'CLAUDE_CLI') {
      // Use existing Socket.IO path for Claude CLI
      logger.debug('📤 Sending message via Claude CLI');
      socketEmit('terminal:input', {
        data: message + '\n',
        selectedClaudeModel: useModelStore.getState().selectedModel
      });
      return null;
    } else if (this.currentMode === 'GLM_API' && this.glmClient) {
      // Use GLM API
      logger.debug('📤 Sending message via GLM API');
      
      const messages: GLMMessage[] = [
        ...this.preservedContext,
        { role: 'user', content: message }
      ];
      
      try {
        const response = await this.glmClient.chat(messages, {
          model: useModelStore.getState().selectedModel
        });
        
        const rawReply = response.choices[0].message.content;
        
        // Clean up response: remove <think> tags and internal reasoning
        const reply = this.cleanGLMResponse(rawReply);
        
        const tokens = response.usage.total_tokens;
        const costPerToken = 0.10 / 1_000_000; // Default to Flash pricing
        const cost = tokens * costPerToken;
        
        logger.info(`✅ GLM response received: ${tokens} tokens, $${cost.toFixed(6)}`);
        
        // Track cost in GLM cost store
        useGLMCostStore.getState().addUsage(tokens, useModelStore.getState().selectedModel, cost);
        
        // Update preserved context (keep original for context continuity)
        this.preservedContext.push(
          { role: 'user', content: message },
          { role: 'assistant', content: rawReply }
        );
        
        // Emit GLM response event (send cleaned version)
        socketEmit('terminal:glm-response', {
          response: reply,
          tokens,
          cost
        });
        
        return reply;
      } catch (error) {
        logger.error('❌ GLM API error:', error);
        throw error;
      }
    } else if (this.currentMode === 'GEMINI_API' && this.geminiClient) {
      // Use Gemini API
      logger.debug('📤 Sending message via Gemini API');
      
      const messages: GeminiMessage[] = [
        ...this.preservedContext,
        { role: 'user', content: message }
      ];
      
      try {
        const currentModel = useModelStore.getState().selectedModel;
        const response = await this.geminiClient.chat(messages, {
          model: currentModel
        });
        
        const rawReply = response.choices[0].message.content;
        
        // Clean up response: remove internal reasoning tags
        const reply = this.cleanGLMResponse(rawReply);
        
        const tokens = response.usage.total_tokens;
        
        // Calculate cost based on model (Flash vs Flash-Lite)
        let cost = 0;
        if (currentModel === 'gemini-2.5-flash-lite') {
          const inputCost = (response.usage.prompt_tokens / 1_000_000) * 0.10;
          const outputCost = (response.usage.completion_tokens / 1_000_000) * 0.40;
          cost = inputCost + outputCost;
        } else {
          // gemini-2.5-flash uses uniform pricing
          cost = (tokens / 1_000_000) * 0.15;
        }
        
        logger.info(`✅ Gemini response received: ${tokens} tokens, $${cost.toFixed(6)}`);
        
        // Track cost in cost store (reuse GLM store for now)
        useGLMCostStore.getState().addUsage(tokens, currentModel, cost);
        
        // Update preserved context (keep original for continuity)
        this.preservedContext.push(
          { role: 'user', content: message },
          { role: 'assistant', content: rawReply }
        );
        
        // Emit Gemini response event (send cleaned version)
        socketEmit('terminal:gemini-response', {
          response: reply,
          tokens,
          cost
        });
        
        return reply;
      } catch (error) {
        logger.error('❌ Gemini API error:', error);
        throw error;
      }
    }
    
    return null;
  }
  
  /**
   * Get mode switch history
   */
  getSwitchHistory(): ModeSwitch[] {
    return this.switchHistory;
  }
  
  /**
   * Get preserved context summary
   */
  getContextSummary(): string {
    if (this.preservedContext.length === 0) {
      return 'No context preserved';
    }
    
    const userMessages = this.preservedContext.filter(m => m.role === 'user').length;
    const assistantMessages = this.preservedContext.filter(m => m.role === 'assistant').length;
    const totalChars = this.preservedContext.reduce((sum, m) => sum + m.content.length, 0);
    
    return `${this.preservedContext.length} messages (${userMessages} user, ${assistantMessages} assistant), ${totalChars} chars`;
  }
  
  /**
   * Clean GLM response by removing internal reasoning tags and formatting
   */
  private cleanGLMResponse(response: string): string {
    let cleaned = response;
    
    // Remove <think> tags and their content
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Remove any remaining XML-like tags
    cleaned = cleaned.replace(/<\/?[^>]+>/g, '');
    
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();
    
    return cleaned;
  }
}
