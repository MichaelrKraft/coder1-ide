/**
 * Claude CLI Output Parser
 * 
 * Intelligent parsing of Claude CLI streaming output to detect completion, extract content,
 * and handle various response formats including code blocks, error messages, and structured data.
 * 
 * Key Features:
 * - Real-time streaming response detection
 * - Code block extraction and syntax highlighting
 * - Error message classification
 * - Response completion detection
 * - Content cleaning and formatting
 * - Progress indicator parsing
 */

class CLIOutputParser {
  constructor(options = {}) {
    this.options = {
      // Response completion detection
      completionTimeout: options.completionTimeout || 3000, // ms of silence = completion
      minResponseLength: options.minResponseLength || 10,
      maxBufferSize: options.maxBufferSize || 50000,
      
      // Content parsing
      preserveCodeBlocks: options.preserveCodeBlocks !== false,
      stripAnsiCodes: options.stripAnsiCodes !== false,
      extractMetadata: options.extractMetadata !== false,
      
      // Debug options
      verbose: options.verbose || false
    };
    
    // Regex patterns for various detection tasks
    this.patterns = {
      // Completion detection patterns
      completion: [
        /\n\s*$/,                    // Ends with newline and optional whitespace
        /[.!?]\s*$/,                 // Ends with sentence punctuation
        /```\s*$/,                   // Ends with code block
        /---\s*$/,                   // Ends with separator
        /\n>\s*$/,                   // Ends with prompt indicator
        /\[[✓✗]\]\s*$/               // Ends with completion indicator
      ],
      
      // Code block detection
      codeBlock: /```(\w+)?\n([\s\S]*?)```/g,
      inlineCode: /`([^`]+)`/g,
      
      // File operation patterns
      fileCreated: /(?:Created?|Wrote|Generated)\s+(?:file\s+)?["`']?([^"`'\n]+)["`']?/gi,
      fileModified: /(?:Modified|Updated|Changed)\s+(?:file\s+)?["`']?([^"`'\n]+)["`']?/gi,
      
      // Error patterns
      error: /(?:Error|Exception|Failed|ERROR)[:]\s*(.+)/gi,
      warning: /(?:Warning|WARN)[:]\s*(.+)/gi,
      
      // Progress indicators
      progress: /(?:Progress|Completed?|Done)[:]\s*(\d+(?:\.\d+)?)[%]?/gi,
      step: /(?:Step|Phase)\s+(\d+)(?:\s*of\s*(\d+))?/gi,
      
      // Claude-specific patterns
      claudeThinking: /I'm thinking about|Let me think|I need to consider/gi,
      claudeAction: /I'll|I will|Let me|I can/gi,
      
      // ANSI escape codes
      ansi: /\u001b\[[0-9;]*m/g,
      
      // Prompt indicators
      prompt: /^\s*[>$#]\s*/gm,
      
      // JSON-like structures
      jsonBlock: /\{[\s\S]*?\}/g,
      
      // URL detection
      url: /https?:\/\/[^\s]+/g
    };
    
    // Response classification
    this.responseTypes = {
      CODE: 'code',
      TEXT: 'text', 
      ERROR: 'error',
      WARNING: 'warning',
      PROGRESS: 'progress',
      THINKING: 'thinking',
      ACTION: 'action',
      FILE_OP: 'file_operation',
      MIXED: 'mixed'
    };
    
    if (this.options.verbose) {
      console.log('📊 CLI Output Parser initialized with options:', this.options);
    }
  }

  /**
   * Parse streaming output and determine if response is complete
   * 
   * @param {string} buffer - Current output buffer
   * @param {number} lastActivityTime - Timestamp of last output
   * @returns {Object} Parse result with completion status
   */
  parseStream(buffer, lastActivityTime = Date.now()) {
    const cleanBuffer = this.cleanOutput(buffer);
    
    const result = {
      isComplete: false,
      confidence: 0,
      reason: null,
      parsedContent: null,
      metadata: {
        length: cleanBuffer.length,
        lines: cleanBuffer.split('\n').length,
        timeSinceLastActivity: Date.now() - lastActivityTime
      }
    };

    // Check minimum length requirement
    if (cleanBuffer.length < this.options.minResponseLength) {
      result.reason = 'insufficient_length';
      return result;
    }

    // Check completion patterns
    const completionResult = this.checkCompletionPatterns(cleanBuffer);
    if (completionResult.isComplete) {
      result.isComplete = true;
      result.confidence = completionResult.confidence;
      result.reason = completionResult.reason;
    }

    // Check timeout-based completion
    const timeoutResult = this.checkTimeoutCompletion(cleanBuffer, lastActivityTime);
    if (timeoutResult.isComplete && timeoutResult.confidence > result.confidence) {
      result.isComplete = true;
      result.confidence = timeoutResult.confidence;
      result.reason = timeoutResult.reason;
    }

    // Parse content if complete
    if (result.isComplete) {
      result.parsedContent = this.parseContent(cleanBuffer);
    }

    return result;
  }

  /**
   * Check pattern-based completion detection
   * 
   * @param {string} buffer - Clean output buffer
   * @returns {Object} Completion result
   */
  checkCompletionPatterns(buffer) {
    const result = { isComplete: false, confidence: 0, reason: null };
    
    // Check each completion pattern
    for (let i = 0; i < this.patterns.completion.length; i++) {
      const pattern = this.patterns.completion[i];
      if (pattern.test(buffer)) {
        result.isComplete = true;
        result.confidence = Math.max(result.confidence, 0.7 + (i * 0.05)); // Higher confidence for earlier patterns
        result.reason = `pattern_match_${i}`;
        break;
      }
    }

    // Special case: Code blocks should be complete
    const codeBlocks = buffer.match(this.patterns.codeBlock);
    if (codeBlocks && codeBlocks.length > 0) {
      // Check if last code block is properly closed
      const lastCodeBlock = codeBlocks[codeBlocks.length - 1];
      if (lastCodeBlock.endsWith('```')) {
        result.isComplete = true;
        result.confidence = Math.max(result.confidence, 0.9);
        result.reason = 'code_block_complete';
      }
    }

    // Check for natural language completion
    const sentences = buffer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) {
      const lastSentence = sentences[sentences.length - 1].trim();
      if (lastSentence.length === 0 || this.isNaturalEnd(buffer)) {
        result.isComplete = true;
        result.confidence = Math.max(result.confidence, 0.6);
        result.reason = 'natural_language_end';
      }
    }

    return result;
  }

  /**
   * Check timeout-based completion
   * 
   * @param {string} buffer - Clean output buffer
   * @param {number} lastActivityTime - Last activity timestamp
   * @returns {Object} Completion result
   */
  checkTimeoutCompletion(buffer, lastActivityTime) {
    const timeSinceActivity = Date.now() - lastActivityTime;
    const result = { isComplete: false, confidence: 0, reason: null };

    if (timeSinceActivity >= this.options.completionTimeout) {
      // Higher confidence for longer silences with substantial content
      const contentScore = Math.min(buffer.length / 200, 1); // Normalize content length
      result.isComplete = true;
      result.confidence = 0.5 + (contentScore * 0.3); // 0.5-0.8 confidence
      result.reason = `timeout_${timeSinceActivity}ms`;
    }

    return result;
  }

  /**
   * Check if text ends naturally in conversation
   * 
   * @param {string} text - Text to analyze
   * @returns {boolean} True if natural end detected
   */
  isNaturalEnd(text) {
    const naturalEndings = [
      /(?:hope this helps|let me know if you need|feel free to ask)/i,
      /(?:that should (?:do it|work)|is there anything else)/i,
      /(?:does this make sense|any questions)/i,
      /(?:happy to help|glad to assist)/i
    ];

    return naturalEndings.some(pattern => pattern.test(text));
  }

  /**
   * Parse and structure the response content
   * 
   * @param {string} buffer - Clean output buffer
   * @returns {Object} Structured content
   */
  parseContent(buffer) {
    const content = {
      raw: buffer,
      type: this.classifyResponse(buffer),
      text: this.extractMainText(buffer),
      codeBlocks: this.extractCodeBlocks(buffer),
      files: this.extractFileOperations(buffer),
      errors: this.extractErrors(buffer),
      warnings: this.extractWarnings(buffer),
      progress: this.extractProgress(buffer),
      urls: this.extractUrls(buffer),
      metadata: this.extractMetadata(buffer)
    };

    // Clean up empty arrays/objects
    Object.keys(content).forEach(key => {
      if (Array.isArray(content[key]) && content[key].length === 0) {
        delete content[key];
      }
    });

    return content;
  }

  /**
   * Classify the type of response
   * 
   * @param {string} buffer - Response buffer
   * @returns {string} Response type
   */
  classifyResponse(buffer) {
    const hasCode = this.patterns.codeBlock.test(buffer);
    const hasError = this.patterns.error.test(buffer);
    const hasWarning = this.patterns.warning.test(buffer);
    const hasProgress = this.patterns.progress.test(buffer);
    const hasThinking = this.patterns.claudeThinking.test(buffer);
    const hasAction = this.patterns.claudeAction.test(buffer);
    const hasFileOps = this.patterns.fileCreated.test(buffer) || this.patterns.fileModified.test(buffer);

    // Priority-based classification
    if (hasError) return this.responseTypes.ERROR;
    if (hasWarning && !hasCode && !hasAction) return this.responseTypes.WARNING;
    if (hasProgress) return this.responseTypes.PROGRESS;
    if (hasThinking && !hasCode && !hasAction) return this.responseTypes.THINKING;
    if (hasCode && hasAction) return this.responseTypes.MIXED;
    if (hasCode) return this.responseTypes.CODE;
    if (hasFileOps) return this.responseTypes.FILE_OP;
    if (hasAction) return this.responseTypes.ACTION;

    return this.responseTypes.TEXT;
  }

  /**
   * Extract main text content (excluding code blocks)
   * 
   * @param {string} buffer - Response buffer
   * @returns {string} Main text content
   */
  extractMainText(buffer) {
    let text = buffer;
    
    // Remove code blocks if preserving them separately
    if (this.options.preserveCodeBlocks) {
      text = text.replace(this.patterns.codeBlock, '');
    }
    
    // Remove inline code
    text = text.replace(this.patterns.inlineCode, '');
    
    // Clean up extra whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    
    return text;
  }

  /**
   * Extract code blocks with syntax highlighting info
   * 
   * @param {string} buffer - Response buffer
   * @returns {Array} Array of code block objects
   */
  extractCodeBlocks(buffer) {
    const blocks = [];
    let match;

    this.patterns.codeBlock.lastIndex = 0; // Reset regex
    while ((match = this.patterns.codeBlock.exec(buffer)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        fullMatch: match[0],
        index: match.index
      });
    }

    return blocks;
  }

  /**
   * Extract file operations (created, modified files)
   * 
   * @param {string} buffer - Response buffer
   * @returns {Array} Array of file operation objects
   */
  extractFileOperations(buffer) {
    const operations = [];
    
    // Extract file creations
    let match;
    this.patterns.fileCreated.lastIndex = 0;
    while ((match = this.patterns.fileCreated.exec(buffer)) !== null) {
      operations.push({
        type: 'created',
        file: match[1].trim(),
        context: match[0]
      });
    }

    // Extract file modifications
    this.patterns.fileModified.lastIndex = 0;
    while ((match = this.patterns.fileModified.exec(buffer)) !== null) {
      operations.push({
        type: 'modified',
        file: match[1].trim(),
        context: match[0]
      });
    }

    return operations;
  }

  /**
   * Extract error messages
   * 
   * @param {string} buffer - Response buffer
   * @returns {Array} Array of error objects
   */
  extractErrors(buffer) {
    const errors = [];
    let match;

    this.patterns.error.lastIndex = 0;
    while ((match = this.patterns.error.exec(buffer)) !== null) {
      errors.push({
        message: match[1].trim(),
        fullMatch: match[0],
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Extract warning messages
   * 
   * @param {string} buffer - Response buffer
   * @returns {Array} Array of warning objects
   */
  extractWarnings(buffer) {
    const warnings = [];
    let match;

    this.patterns.warning.lastIndex = 0;
    while ((match = this.patterns.warning.exec(buffer)) !== null) {
      warnings.push({
        message: match[1].trim(),
        fullMatch: match[0],
        severity: 'warning'
      });
    }

    return warnings;
  }

  /**
   * Extract progress indicators
   * 
   * @param {string} buffer - Response buffer
   * @returns {Object} Progress information
   */
  extractProgress(buffer) {
    const progress = { percentage: null, steps: null };
    
    // Extract percentage progress
    let match = this.patterns.progress.exec(buffer);
    if (match) {
      progress.percentage = parseFloat(match[1]);
    }

    // Extract step progress
    this.patterns.step.lastIndex = 0;
    match = this.patterns.step.exec(buffer);
    if (match) {
      progress.steps = {
        current: parseInt(match[1]),
        total: match[2] ? parseInt(match[2]) : null
      };
    }

    return Object.values(progress).some(v => v !== null) ? progress : null;
  }

  /**
   * Extract URLs from response
   * 
   * @param {string} buffer - Response buffer
   * @returns {Array} Array of URLs
   */
  extractUrls(buffer) {
    const matches = buffer.match(this.patterns.url);
    return matches || [];
  }

  /**
   * Extract metadata from response
   * 
   * @param {string} buffer - Response buffer
   * @returns {Object} Metadata object
   */
  extractMetadata(buffer) {
    if (!this.options.extractMetadata) {
      return {};
    }

    return {
      wordCount: buffer.split(/\s+/).length,
      lineCount: buffer.split('\n').length,
      hasCodeBlocks: this.patterns.codeBlock.test(buffer),
      hasUrls: this.patterns.url.test(buffer),
      containsThinking: this.patterns.claudeThinking.test(buffer),
      containsActions: this.patterns.claudeAction.test(buffer),
      estimatedReadTime: Math.ceil(buffer.split(/\s+/).length / 200) // words per minute
    };
  }

  /**
   * Clean output buffer of ANSI codes and control characters
   * 
   * @param {string} buffer - Raw output buffer
   * @returns {string} Cleaned buffer
   */
  cleanOutput(buffer) {
    let cleaned = buffer;

    // Strip ANSI escape codes if requested
    if (this.options.stripAnsiCodes) {
      cleaned = cleaned.replace(this.patterns.ansi, '');
    }

    // Remove prompt indicators
    cleaned = cleaned.replace(this.patterns.prompt, '');

    // Normalize whitespace
    cleaned = cleaned.replace(/\r\n/g, '\n'); // Windows line endings
    cleaned = cleaned.replace(/\r/g, '\n');   // Mac line endings

    // Remove control characters except newlines and tabs
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limit buffer size
    if (cleaned.length > this.options.maxBufferSize) {
      cleaned = cleaned.slice(-this.options.maxBufferSize);
    }

    return cleaned;
  }

  /**
   * Format parsed content for display
   * 
   * @param {Object} parsedContent - Content from parseContent()
   * @param {string} format - Output format ('text', 'html', 'markdown')
   * @returns {string} Formatted content
   */
  formatContent(parsedContent, format = 'text') {
    const { type, text, codeBlocks, files, errors, warnings } = parsedContent;

    switch (format) {
      case 'html':
        return this.formatAsHtml(parsedContent);
      case 'markdown':
        return this.formatAsMarkdown(parsedContent);
      default:
        return this.formatAsText(parsedContent);
    }
  }

  /**
   * Format content as plain text
   * 
   * @param {Object} parsedContent - Parsed content object
   * @returns {string} Plain text representation
   */
  formatAsText(parsedContent) {
    const sections = [];

    if (parsedContent.text) {
      sections.push(parsedContent.text);
    }

    if (parsedContent.codeBlocks && parsedContent.codeBlocks.length > 0) {
      parsedContent.codeBlocks.forEach(block => {
        sections.push(`\n[Code - ${block.language}]:\n${block.code}\n`);
      });
    }

    if (parsedContent.files && parsedContent.files.length > 0) {
      const fileOps = parsedContent.files.map(f => `${f.type}: ${f.file}`).join(', ');
      sections.push(`\nFile operations: ${fileOps}`);
    }

    if (parsedContent.errors && parsedContent.errors.length > 0) {
      sections.push(`\nErrors: ${parsedContent.errors.map(e => e.message).join(', ')}`);
    }

    return sections.join('\n').trim();
  }

  /**
   * Format content as HTML
   * 
   * @param {Object} parsedContent - Parsed content object
   * @returns {string} HTML representation
   */
  formatAsHtml(parsedContent) {
    const sections = [];

    if (parsedContent.text) {
      sections.push(`<div class="response-text">${parsedContent.text.replace(/\n/g, '<br>')}</div>`);
    }

    if (parsedContent.codeBlocks && parsedContent.codeBlocks.length > 0) {
      parsedContent.codeBlocks.forEach(block => {
        sections.push(`<pre class="code-block" data-language="${block.language}"><code>${block.code}</code></pre>`);
      });
    }

    return `<div class="parsed-response">${sections.join('')}</div>`;
  }

  /**
   * Format content as Markdown
   * 
   * @param {Object} parsedContent - Parsed content object
   * @returns {string} Markdown representation
   */
  formatAsMarkdown(parsedContent) {
    const sections = [];

    if (parsedContent.text) {
      sections.push(parsedContent.text);
    }

    if (parsedContent.codeBlocks && parsedContent.codeBlocks.length > 0) {
      parsedContent.codeBlocks.forEach(block => {
        sections.push(`\n\`\`\`${block.language}\n${block.code}\n\`\`\`\n`);
      });
    }

    return sections.join('\n').trim();
  }

  /**
   * Get parser statistics
   * 
   * @returns {Object} Parser statistics
   */
  getStats() {
    return {
      options: this.options,
      patterns: Object.keys(this.patterns).length,
      responseTypes: this.responseTypes
    };
  }
}

// Export the parser class
module.exports = {
  CLIOutputParser
};