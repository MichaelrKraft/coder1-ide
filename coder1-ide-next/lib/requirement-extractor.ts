/**
 * Requirement Extraction from Terminal Data Buffers
 * 
 * Extracts project requirements from structured terminal conversation history.
 * Uses terminalDataBuffers (not terminalHistoryBuffers) because it has:
 * - Type discrimination (terminal_input vs terminal_output)
 * - Timestamps for proper sequencing
 * - Clean input captured before ANSI pollution
 */

import { stripAnsiCodes } from './terminal-cleaner';

/**
 * Terminal data buffer chunk structure
 */
export interface BufferChunk {
  type: 'terminal_input' | 'terminal_output';
  content: string;
  timestamp: number;
}

/**
 * Extraction result with confidence scoring
 */
export interface ExtractionResult {
  requirement: string;
  confidence: 'high' | 'medium' | 'low';
  userMessages: string[];
  conversationContext: string;
  extractedFrom?: string; // The actual line that matched
}

/**
 * Extract requirement from structured terminal data buffer
 * 
 * @param buffer - Array of BufferChunk objects from terminalDataBuffers
 * @returns ExtractionResult with requirement and confidence score
 */
export function extractRequirementFromDataBuffer(
  buffer: BufferChunk[]
): ExtractionResult {
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
  const userInputs = buffer
    .filter(chunk => chunk.type === 'terminal_input')
    .map(chunk => {
      const cleaned = stripAnsiCodes(chunk.content);
      return {
        content: cleaned,
        timestamp: chunk.timestamp
      };
    })
    .filter(input => input.content.length > 3) // Allow short but valid requirements like "build todo app"
    .filter(input => {
      // Skip basic shell commands
      const cmd = input.content.trim().toLowerCase();
      return !cmd.match(/^(ls|pwd|cd|clear|exit|claude)$/);
    })
    .filter(input => {
      // 🔧 FIX (Nov 21, 2025): Skip terminal UI decorations that got captured as input
      // These are box-drawing characters used for terminal panels/dividers
      const content = input.content;
      const hasBoxDrawing = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/.test(content);
      const looksLikeAgentUI = /Role:\s*\w+|Team:\s*team-|Current Task:|Agent initialized/.test(content);
      if (hasBoxDrawing || looksLikeAgentUI) {
        console.log('[Requirement Extractor] Filtering out terminal UI decoration:', content.substring(0, 50));
        return false;
      }
      return true;
    });

  if (userInputs.length === 0) {
    return {
      requirement: '',
      confidence: 'low',
      userMessages: [],
      conversationContext: 'No substantial user input found in conversation',
    };
  }

  // Extract just the content strings for easier processing
  const messages = userInputs.map(input => input.content);

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
          return {
            requirement: extracted,
            confidence: 'high',
            userMessages: messages,
            conversationContext: messages.join('\n'),
            extractedFrom: input.content
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
      return {
        requirement: lastMessage.content,
        confidence: 'medium',
        userMessages: messages,
        conversationContext: messages.join('\n'),
        extractedFrom: lastMessage.content
      };
    }
  }

  // Step 4: MEDIUM CONFIDENCE - Concatenate recent messages (last 3)
  const recentMessages = messages.slice(-3);
  if (recentMessages.length > 0) {
    const combined = recentMessages.join('. ');
    if (combined.length >= 30) {
      return {
        requirement: combined,
        confidence: 'medium',
        userMessages: messages,
        conversationContext: messages.join('\n'),
      };
    }
  }

  // Step 5: LOW CONFIDENCE - Fallback to all messages
  const allCombined = messages.join('. ');
  return {
    requirement: allCombined,
    confidence: allCombined.length >= 20 ? 'low' : 'low',
    userMessages: messages,
    conversationContext: allCombined,
  };
}

/**
 * Validate extraction result quality
 */
export function validateExtraction(result: ExtractionResult): {
  valid: boolean;
  reason?: string;
} {
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
