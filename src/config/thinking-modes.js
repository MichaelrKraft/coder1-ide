/**
 * Thinking Mode Configuration
 * 
 * Defines different Claude AI thinking modes with varying models,
 * token limits, timeouts, and system prompts to provide different
 * levels of analysis depth and response quality.
 */

const THINKING_MODE_CONFIGS = {
    'normal': {
        model: 'claude-3-haiku-20240307',
        maxTokens: 1000,
        temperature: 0.3,
        timeout: 30000,  // 30 seconds
        systemPrompt: 'Be concise and direct. Provide clear, actionable responses.',
        displayName: 'Normal',
        icon: '⚡',
        description: 'Quick, concise responses',
        costMultiplier: 1.0
    },
  
    'think': {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 2000,
        temperature: 0.5,
        timeout: 60000,  // 60 seconds
        systemPrompt: 'Take time to think through the problem carefully. Provide thoughtful, balanced analysis with key considerations.',
        displayName: 'Think',
        icon: '🤔',
        description: 'Thoughtful, balanced analysis',
        costMultiplier: 1.5
    },
  
    'think-hard': {
        model: 'claude-3-opus-20240229',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 120000,  // 2 minutes
        systemPrompt: 'Provide deep, comprehensive analysis with multiple perspectives. Think step by step through complex problems. Consider edge cases and implications.',
        displayName: 'Think Hard',
        icon: '🧠',
        description: 'Deep, comprehensive exploration',
        costMultiplier: 2.0
    },
  
    'ultrathink': {
        model: 'claude-3-opus-20240229',
        maxTokens: 8000,
        temperature: 0.8,
        timeout: 300000,  // 5 minutes
        systemPrompt: 'Maximum depth analysis. Consider all angles, implications, edge cases, and alternative approaches. Provide exhaustive exploration of the problem space with detailed reasoning.',
        displayName: 'Ultrathink',
        icon: '💭',
        description: 'Maximum depth with all perspectives',
        costMultiplier: 3.0
    }
};

/**
 * Get configuration for a specific thinking mode
 * @param {string} mode - The thinking mode (normal, think, think-hard, ultrathink)
 * @returns {Object} Configuration object for the mode
 */
function getThinkingModeConfig(mode) {
    return THINKING_MODE_CONFIGS[mode] || THINKING_MODE_CONFIGS['normal'];
}

/**
 * Get all available thinking modes
 * @returns {string[]} Array of mode names
 */
function getAvailableModes() {
    return Object.keys(THINKING_MODE_CONFIGS);
}

/**
 * Estimate response time for a thinking mode
 * @param {string} mode - The thinking mode
 * @returns {number} Estimated time in seconds
 */
function estimateResponseTime(mode) {
    const config = getThinkingModeConfig(mode);
    // Return a conservative estimate (half of timeout)
    return Math.round(config.timeout / 2000);
}

module.exports = {
    THINKING_MODE_CONFIGS,
    getThinkingModeConfig,
    getAvailableModes,
    estimateResponseTime
};