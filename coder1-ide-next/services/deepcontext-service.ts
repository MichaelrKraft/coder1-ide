/**
 * DeepContext Service - Semantic Code Search Integration
 * Provides intelligent code understanding through the DeepContext MCP server
 */

import { EventEmitter } from 'events';

export interface DeepContextSearchResult {
  file: string;
  line: number;
  content: string;
  relevance: number;
  context?: string;
  type?: 'function' | 'class' | 'variable' | 'import' | 'comment';
}

export interface DeepContextRelationship {
  file: string;
  line: number;
  type: 'calls' | 'called-by' | 'imports' | 'imported-by' | 'similar';
  name: string;
}

export interface DeepContextStatus {
  installed: boolean;
  indexing: boolean;
  indexed: boolean;
  progress?: number;
  filesIndexed?: number;
  totalFiles?: number;
  error?: string;
}

class DeepContextService extends EventEmitter {
  private status: DeepContextStatus = {
    installed: false,
    indexing: false,
    indexed: false
  };
  
  private mcpAvailable = false;
  private indexingTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.checkInstallation();
  }

  /**
   * Check if DeepContext is installed
   */
  async checkInstallation(): Promise<boolean> {
    try {
      // Check localStorage for installation status
      const installed = localStorage.getItem('deepcontext-installed') === 'true';
      
      if (installed) {
        // Verify MCP server is actually available
        const response = await fetch('/api/deepcontext/status');
        if (response.ok) {
          const data = await response.json();
          this.status.installed = true;
          this.status.indexed = data.indexed || false;
          this.mcpAvailable = true;
          return true;
        }
      }
      
      this.status.installed = false;
      return false;
    } catch (error) {
      console.log('DeepContext not installed or unavailable');
      return false;
    }
  }

  /**
   * Install DeepContext in the background
   */
  async installDeepContext(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.emit('install:start');
      
      // Simulate installation process
      // In production, this would trigger npm install of the MCP server
      setTimeout(() => {
        localStorage.setItem('deepcontext-installed', 'true');
        this.status.installed = true;
        this.emit('install:complete');
        
        // Start indexing immediately after installation
        this.startIndexing();
        resolve();
      }, 3000); // Simulate 3 second installation
    });
  }

  /**
   * Start indexing the current project
   */
  async startIndexing(): Promise<void> {
    if (this.status.indexing) return;
    
    this.status.indexing = true;
    this.status.progress = 0;
    this.emit('indexing:start');
    
    // Simulate indexing progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        this.status.indexing = false;
        this.status.indexed = true;
        this.status.progress = 100;
        
        localStorage.setItem('deepcontext-indexed', 'true');
        this.emit('indexing:complete');
      } else {
        this.status.progress = Math.round(progress);
        this.emit('indexing:progress', this.status.progress);
      }
    }, 500);
  }

  /**
   * Search for code semantically
   */
  async search(query: string): Promise<DeepContextSearchResult[]> {
    console.log('🔍 DeepContext search called with query:', query);
    console.log('🔍 Service status:', this.status);
    console.log('🔍 MCP available:', this.mcpAvailable);
    
    // Always prioritize real file search first
    try {
      console.log('🔍 Attempting real file search via fallbackSearch...');
      const results = await this.fallbackSearch(query);
      console.log('🔍 fallbackSearch returned', results.length, 'results');
      
      // If we get results from the API (even 0 results), that's a successful API call
      // 0 results means "no matches found" which is a valid response
      console.log('✅ File search API succeeded, returning', results.length, 'results');
      return results;
      
    } catch (error) {
      console.error('❌ Real file search API failed, trying fallbacks:', error);
      // Only fall back to other methods if the API actually failed
    }
    
    // If real file search fails or returns no results, try MCP demo API
    if (this.mcpAvailable && this.status.indexed) {
      try {
        console.log('🔍 Attempting MCP demo search...');
        const response = await fetch('/api/deepcontext/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        
        console.log('🔍 MCP API response status:', response.status);
        if (response.ok) {
          const mcpResults = await response.json();
          console.log('✅ MCP API returned', mcpResults.length, 'results');
          return mcpResults;
        } else {
          console.log('❌ MCP API responded with error:', response.status);
        }
      } catch (error) {
        console.error('❌ DeepContext MCP search failed:', error);
      }
    } else {
      console.log('❌ MCP not available - installed:', this.mcpAvailable, 'indexed:', this.status.indexed);
    }
    
    // Final fallback to demo results
    console.log('⚠️ Using demo fallback results');
    return this.getDemoResults(query);
  }

  /**
   * Get relationships for a file/function
   */
  async getRelationships(file: string, line?: number): Promise<DeepContextRelationship[]> {
    // Always try to use the relationships API (it has real analysis now)
    try {
      const response = await fetch('/api/deepcontext/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, line })
      });
      
      if (response.ok) {
        const relationships = await response.json();
        console.log(`Found ${relationships.length} relationships for ${file}`);
        return relationships;
      }
    } catch (error) {
      console.error('DeepContext relationships failed:', error);
    }
    
    // Return empty array if API fails
    return [];
  }

  /**
   * Find similar code patterns
   */
  async findSimilar(code: string): Promise<DeepContextSearchResult[]> {
    if (this.mcpAvailable && this.status.indexed) {
      try {
        const response = await fetch('/api/deepcontext/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('DeepContext similar search failed:', error);
      }
    }
    
    return [];
  }

  /**
   * Fallback to real file search when DeepContext MCP is not available
   */
  private async fallbackSearch(query: string): Promise<DeepContextSearchResult[]> {
    console.log('📁 fallbackSearch called with query:', query);
    
    try {
      console.log('📁 Making fetch request to /api/deepcontext/file-search...');
      
      // Use our new file search API endpoint
      const response = await fetch('/api/deepcontext/file-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          maxResults: 20,
          fileTypes: [] // Search all file types
        })
      });
      
      console.log('📁 File search API response status:', response.status);
      console.log('📁 Response ok:', response.ok);
      
      if (response.ok) {
        const results = await response.json();
        console.log(`📁 File search API returned ${results.length} results for query:`, query);
        
        if (results.length > 0) {
          console.log('📁 First result preview:', {
            file: results[0].file,
            line: results[0].line,
            content: results[0].content.substring(0, 100),
            relevance: results[0].relevance
          });
        }
        
        return results;
      } else {
        const errorText = await response.text();
        console.error('📁 File search API error:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('📁 Failed to search files - throwing error:', error);
      throw error; // Re-throw so the calling method knows it failed
    }
  }

  /**
   * Get current status
   */
  getStatus(): DeepContextStatus {
    return { ...this.status };
  }

  /**
   * Check if DeepContext would be helpful for a query
   */
  wouldBeHelpful(query: string): boolean {
    const complexPatterns = [
      /how does .* work/i,
      /where is .* implemented/i,
      /find all .* that/i,
      /show .* relationships/i,
      /what calls/i,
      /similar to/i,
      /related to/i,
      /connected to/i,
      /that uses/i,
      /depends on/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Reset DeepContext (for debugging)
   */
  reset(): void {
    localStorage.removeItem('deepcontext-installed');
    localStorage.removeItem('deepcontext-indexed');
    this.status = {
      installed: false,
      indexing: false,
      indexed: false
    };
    this.mcpAvailable = false;
  }

  /**
   * Get demo results for a query (final fallback)
   */
  private getDemoResults(query: string): DeepContextSearchResult[] {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('auth') || lowerQuery.includes('login')) {
      return [
        {
          file: '/app/api/auth/route.ts',
          line: 45,
          content: 'export async function authenticateUser(email: string, password: string)',
          relevance: 0.95,
          context: 'Main authentication handler'
        },
        {
          file: '/middleware/auth.ts',
          line: 12,
          content: 'const verifyToken = (token: string): boolean => {',
          relevance: 0.88,
          context: 'JWT token verification'
        }
      ];
    }
    
    if (lowerQuery.includes('payment') || lowerQuery.includes('checkout')) {
      return [
        {
          file: '/services/payment-service.ts',
          line: 23,
          content: 'async function processPayment(amount: number, userId: string)',
          relevance: 0.92,
          context: 'Payment processing with Stripe'
        }
      ];
    }
    
    // Default results for any other query
    return [
      {
        file: '/app/page.tsx',
        line: 10,
        content: `Results for: "${query}"`,
        relevance: 0.7,
        context: 'Search results placeholder'
      }
    ];
  }
}

// Export singleton instance
export const deepContextService = new DeepContextService();
export default deepContextService;