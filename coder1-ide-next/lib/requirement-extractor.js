/**
 * Requirement Extraction from Terminal Data Buffers
 * 
 * Extracts project requirements from structured terminal conversation history.
 * Uses terminalDataBuffers (not terminalHistoryBuffers) because it has:
 * - Type discrimination (terminal_input vs terminal_output)
 * - Timestamps for proper sequencing
 * - Clean input captured before ANSI pollution
 */

const { stripAnsiCodes } = require('./terminal-cleaner');
const { assessContextQuality } = require('./context-quality-assessor');

/**
 * Extract requirement from structured terminal data buffer
 * 
 * @param {Array<{type: string, content: string, timestamp: number}>} buffer - Array of BufferChunk objects from terminalDataBuffers
 * @returns {{
 *   requirement: string,
 *   confidence: string,
 *   userMessages: string[],
 *   conversationContext: string,
 *   extractedFrom?: string,
 *   quality: Object
 * }} ExtractionResult with requirement, confidence score, and quality assessment
 */
function extractRequirementFromDataBuffer(buffer) {
  // Validate input
  if (!buffer || buffer.length === 0) {
    return {
      requirement: '',
      confidence: 'low',
      userMessages: [],
      conversationContext: '',
    };
  }

  // Step 1: Filter and clean user inputs only
  const terminalInputChunks = buffer.filter(chunk => chunk.type === 'terminal_input');
  console.log(`[Extractor] Found ${terminalInputChunks.length} terminal_input chunks out of ${buffer.length} total`);
  
  const userInputs = terminalInputChunks
    .map(chunk => {
      const cleaned = stripAnsiCodes(chunk.content);
      return {
        content: cleaned,
        timestamp: chunk.timestamp
      };
    })
    .filter(input => input.content.length > 10) // Substantial messages only
    .filter(input => {
      // Skip basic shell commands
      const cmd = input.content.trim().toLowerCase();
      return !cmd.match(/^(ls|pwd|cd|clear|exit|claude)$/);
    });

  console.log(`[Extractor] After filtering: ${userInputs.length} user inputs`);
  
  // DEBUG: Log what was filtered out
  if (userInputs.length === 0 && terminalInputChunks.length > 0) {
    console.log(`[Extractor] DEBUG: All ${terminalInputChunks.length} inputs were filtered out:`);
    terminalInputChunks.forEach((chunk, i) => {
      const cleaned = stripAnsiCodes(chunk.content);
      console.log(`  ${i + 1}. "${cleaned.substring(0, 100)}" (${cleaned.length} chars)`);
    });
  }
  
  if (userInputs.length > 0) {
    console.log(`[Extractor] First user input:`, userInputs[0].content.substring(0, 100));
  }

  if (userInputs.length === 0) {
    return {
      requirement: '',
      confidence: 'low',
      userMessages: [],
      conversationContext: 'No substantial user input found in conversation',
      quality: {
        score: 0,
        passed: false,
        missingAspects: [],
        breakdown: {},
        suggestions: []
      }
    };
  }

  // Extract just the content strings for easier processing
  const messages = userInputs.map(input => input.content);
  
  // Build full conversation context
  const conversationContext = messages.join('\n');

  // Step 2: HIGH CONFIDENCE - Look for explicit project request patterns
  const highConfidencePatterns = [
    // "build me a todo app", "create a website", etc.
    /(?:build|create|make|develop|implement|code|write)\s+(?:me\s+)?(?:a\s+)?(.{15,200})/i,
    // "I need a landing page", "I want an API"
    /(?:i need|i want|i would like)\s+(?:a\s+)?(.{15,200})/i,
    // "can you build...", "could you create..."
    /(?:can you|could you|please)\s+(?:build|create|make|develop)\s+(.{15,200})/i,
    // "help me with building a..."
    /help\s+me\s+(?:with\s+)?(?:building|creating|making)\s+(?:a\s+)?(.{15,200})/i,
  ];

  // Search from most recent to oldest (users often refine their request)
  for (const input of [...userInputs].reverse()) {
    for (const pattern of highConfidencePatterns) {
      const match = input.content.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Ensure it's not just a fragment
        if (extracted.length >= 15) {
          const quality = assessContextQuality(conversationContext);
          console.log(`[Extractor] Quality assessment:`, {
            score: quality.score,
            passed: quality.passed,
            aspectsDetected: quality.aspectsDetected
          });
          
          return {
            requirement: extracted,
            confidence: 'high',
            userMessages: messages,
            conversationContext,
            extractedFrom: input.content,
            quality
          };
        }
      }
    }
  }

  // Step 3: MEDIUM CONFIDENCE - Last substantial user message
  const lastMessage = userInputs[userInputs.length - 1];
  if (lastMessage && lastMessage.content.length >= 20) {
    // Check if it looks like a question or request
    const isQuestion = /\?/.test(lastMessage.content);
    const hasRequestWords = /(?:build|create|make|need|want|help|website|app|system|tool|feature)/i.test(lastMessage.content);
    
    if (isQuestion || hasRequestWords) {
      const quality = assessContextQuality(conversationContext);
      
      return {
        requirement: lastMessage.content,
        confidence: 'medium',
        userMessages: messages,
        conversationContext,
        extractedFrom: lastMessage.content,
        quality
      };
    }
  }

  // Step 4: MEDIUM CONFIDENCE - Concatenate recent messages (last 3)
  const recentMessages = messages.slice(-3);
  if (recentMessages.length > 0) {
    const combined = recentMessages.join('. ');
    if (combined.length >= 30) {
      const quality = assessContextQuality(conversationContext);
      
      return {
        requirement: combined,
        confidence: 'medium',
        userMessages: messages,
        conversationContext,
        quality
      };
    }
  }

  // Step 5: LOW CONFIDENCE - Fallback to all messages
  const allCombined = messages.join('. ');
  const quality = assessContextQuality(conversationContext);
  
  return {
    requirement: allCombined,
    confidence: allCombined.length >= 20 ? 'low' : 'low',
    userMessages: messages,
    conversationContext: allCombined,
    quality
  };
}

/**
 * Validate extraction result quality
 * 
 * @param {{requirement: string, confidence: string, userMessages: string[], conversationContext: string, extractedFrom?: string}} result
 * @returns {{valid: boolean, reason?: string}}
 */
function validateExtraction(result) {
  if (!result.requirement || result.requirement.length < 10) {
    return {
      valid: false,
      reason: 'Requirement too short or empty'
    };
  }

  // Check for common false positives
  const falsePositivePatterns = [
    /^(yes|no|ok|okay|sure|thanks|thank you)$/i,
    /^(ls|pwd|cd|clear|exit)/i,
  ];

  for (const pattern of falsePositivePatterns) {
    if (pattern.test(result.requirement)) {
      return {
        valid: false,
        reason: 'Requirement appears to be a simple response, not a project description'
      };
    }
  }

  return { valid: true };
}

module.exports = {
  extractRequirementFromDataBuffer,
  validateExtraction
};
