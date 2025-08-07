import fs from 'fs/promises';
import path from 'path';
import HivemindService from '../../../src/services/HivemindService.js';

class ClaudeInfiniteAPI {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-sonnet-20240229';
    this.hivemindEnabled = false;
    this.hivemindSessionId = null;
    
    if (!this.apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not found. Running in simulation mode.');
    }
  }

  // Enable Hivemind mode for coordinated agent intelligence
  enableHivemind(sessionId) {
    this.hivemindEnabled = true;
    this.hivemindSessionId = sessionId;
    console.log(`🧠 Hivemind mode enabled for session: ${sessionId}`);
  }

  // Disable Hivemind mode
  disableHivemind() {
    this.hivemindEnabled = false;
    this.hivemindSessionId = null;
    console.log('🧠 Hivemind mode disabled');
  }

  async sendMessage(prompt, maxTokens = 4000) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Claude API Error ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      throw error;
    }
  }

  async processInfinitePrompt(specPath, outputDirectory, count, iterationNumber, agentId = null) {
    try {
      // Read the infinite prompt template
      const infinitePromptPath = path.join(process.cwd(), 'coder1-ide', 'infinite.md');
      const promptTemplate = await fs.readFile(infinitePromptPath, 'utf8');
      
      // Read the spec file
      const specContent = await fs.readFile(specPath, 'utf8');
      
      // Get Hivemind context if enabled
      let hivemindContext = '';
      let agentRole = '';
      if (this.hivemindEnabled && this.hivemindSessionId && agentId !== null) {
        try {
          const context = HivemindService.getAgentContext(this.hivemindSessionId, agentId);
          
          // Build hivemind context section
          hivemindContext = `

## 🧠 HIVEMIND CONTEXT
You are ${context.agentName} (${context.agentRole}) - ${context.specialization}
${context.isQueen ? '👑 You are the QUEEN agent coordinating this session' : ''}

### Shared Discoveries from Other Agents:
${context.discoveries.slice(-5).map(d => `- [${d.agentName}] ${d.content}`).join('\n')}

### Successful Code Patterns:
${context.codePatterns.slice(-3).map(p => `- ${p.name}: ${p.description}`).join('\n')}

### Project Structure Understanding:
${JSON.stringify(context.projectStructure, null, 2)}

### Other Agent Insights:
${Object.entries(context.otherAgentInsights).map(([name, insights]) => 
  `${name}: ${insights.slice(-2).map(i => i.content).join('; ')}`
).join('\n')}

### Dependencies Detected:
${context.dependencies.join(', ')}

Remember: Share your discoveries with other agents by clearly marking important findings.`;
          
          agentRole = `You are ${context.agentName}, specializing in ${context.specialization}.`;
        } catch (error) {
          console.warn('Failed to get hivemind context:', error);
        }
      }
      
      // Create the sub-agent prompt with optional hivemind context
      const subAgentPrompt = `${promptTemplate}

## Current Task
${agentRole || `You are sub-agent working on iteration ${iterationNumber} of the infinite agentic loop.`}
${hivemindContext}

Spec Content:
${specContent}

Output Directory: ${outputDirectory}
Iteration Number: ${iterationNumber}
Count Setting: ${count}

## Instructions for this iteration:
1. Read and understand the spec requirements
2. Generate a complete, self-contained HTML file
3. Make it unique from previous iterations (theme, functionality, design)
4. Include all CSS, JavaScript, and HTML in a single file
5. Make it functionally complete and visually distinct
6. Use iteration number in the filename as specified in the spec
${this.hivemindEnabled ? '7. Share any important discoveries or patterns you identify' : ''}

Generate the complete HTML file content now. Start with <!DOCTYPE html> and end with </html>. Make it production-ready and fully functional.`;

      const agentName = agentId !== null ? `Agent ${agentId + 1}` : '';
      console.log(`🤖 ${agentName} sending iteration ${iterationNumber} to Claude API...`);
      const response = await this.sendMessage(subAgentPrompt, 4000);
      
      // Extract and share discoveries if in hivemind mode
      if (this.hivemindEnabled && this.hivemindSessionId && agentId !== null) {
        this.extractAndShareDiscoveries(response, agentId, iterationNumber);
      }
      
      return {
        iterationNumber,
        content: response,
        success: true,
        agentId
      };
      
    } catch (error) {
      console.error(`❌ Error processing iteration ${iterationNumber}:`, error);
      return {
        iterationNumber,
        content: null,
        success: false,
        error: error.message,
        agentId
      };
    }
  }

  // Extract discoveries from generated content and share with hivemind
  extractAndShareDiscoveries(content, agentId, iterationNumber) {
    try {
      // Look for patterns in the generated code
      const patterns = [];
      
      // Check for animation patterns
      if (content.includes('@keyframes')) {
        patterns.push({
          type: 'animation',
          content: 'Used CSS animations for dynamic effects'
        });
      }
      
      // Check for interactive features
      if (content.includes('addEventListener')) {
        patterns.push({
          type: 'interaction',
          content: 'Implemented interactive JavaScript features'
        });
      }
      
      // Check for advanced CSS
      if (content.includes('grid') || content.includes('flex')) {
        patterns.push({
          type: 'layout',
          content: `Used modern CSS ${content.includes('grid') ? 'Grid' : 'Flexbox'} layout`
        });
      }
      
      // Share discoveries with hivemind
      patterns.forEach(pattern => {
        HivemindService.addDiscovery(this.hivemindSessionId, agentId, {
          type: pattern.type,
          content: `Iteration ${iterationNumber}: ${pattern.content}`,
          importance: 'normal'
        });
      });
      
      // Extract theme if identifiable
      const themes = ['neural', 'cyber', 'quantum', 'bio', 'matrix', 'hologram', 'plasma', 'crystal'];
      const foundTheme = themes.find(theme => content.toLowerCase().includes(theme));
      if (foundTheme) {
        HivemindService.addDiscovery(this.hivemindSessionId, agentId, {
          type: 'theme',
          content: `Used ${foundTheme} theme in iteration ${iterationNumber}`,
          importance: 'high'
        });
      }
    } catch (error) {
      console.warn('Failed to extract discoveries:', error);
    }
  }

  async generateWave(specPath, outputDirectory, count, waveNumber) {
    const iterationStart = (waveNumber - 1) * 5 + 1;
    const iterationEnd = waveNumber * 5;
    
    // Limit to 3 agents in Hivemind mode
    const numAgents = this.hivemindEnabled ? 3 : 5;
    const actualIterationEnd = this.hivemindEnabled ? iterationStart + 2 : iterationEnd;
    
    console.log(`🌊 Starting Wave ${waveNumber} (Iterations ${iterationStart}-${actualIterationEnd})`);
    if (this.hivemindEnabled) {
      console.log(`🧠 Hivemind Mode: Using 3 coordinated agents with shared context`);
      
      // Assign tasks to agents if in hivemind mode
      if (this.hivemindSessionId) {
        for (let i = 0; i < 3; i++) {
          HivemindService.assignTask(this.hivemindSessionId, i, {
            type: 'generate',
            description: `Generate iteration ${iterationStart + i}`,
            iterationNumber: iterationStart + i
          });
        }
      }
    }
    
    // Create parallel promises for agents
    const agentPromises = [];
    for (let i = 0; i < numAgents && iterationStart + i <= actualIterationEnd; i++) {
      const iterationNum = iterationStart + i;
      const agentId = this.hivemindEnabled ? i : null;
      
      // Add slight delay between agents in hivemind mode to allow context sharing
      if (this.hivemindEnabled && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500 * i));
      }
      
      agentPromises.push(this.processInfinitePrompt(specPath, outputDirectory, count, iterationNum, agentId));
    }
    
    try {
      const results = await Promise.all(agentPromises);
      
      // Process and save the results
      const savedFiles = [];
      for (const result of results) {
        if (result.success && result.content) {
          try {
            const filename = await this.saveGeneratedFile(result.content, result.iterationNumber, outputDirectory);
            savedFiles.push({
              iteration: result.iterationNumber,
              filename,
              success: true,
              agentId: result.agentId
            });
            console.log(`✅ Saved iteration ${result.iterationNumber}: ${filename}`);
            
            // Mark task as completed in hivemind
            if (this.hivemindEnabled && this.hivemindSessionId && result.agentId !== null) {
              HivemindService.completeTask(this.hivemindSessionId, result.agentId, {
                filename,
                iterationNumber: result.iterationNumber
              });
            }
          } catch (saveError) {
            console.error(`❌ Failed to save iteration ${result.iterationNumber}:`, saveError);
            savedFiles.push({
              iteration: result.iterationNumber,
              filename: null,
              success: false,
              error: saveError.message,
              agentId: result.agentId
            });
          }
        } else {
          savedFiles.push({
            iteration: result.iterationNumber,
            filename: null,
            success: false,
            error: result.error || 'Unknown error',
            agentId: result.agentId
          });
        }
      }
      
      // Share successful patterns if in hivemind mode
      if (this.hivemindEnabled && this.hivemindSessionId) {
        const successfulFiles = savedFiles.filter(f => f.success);
        if (successfulFiles.length > 0) {
          HivemindService.addCodePattern(this.hivemindSessionId, 0, {
            name: `Wave ${waveNumber} Success Pattern`,
            description: `Generated ${successfulFiles.length} successful iterations`,
            code: `Successful files: ${successfulFiles.map(f => f.filename).join(', ')}`,
            usage: 'Reference for future waves',
            category: 'generation'
          });
        }
      }
      
      return {
        waveNumber,
        iterationRange: `${iterationStart}-${actualIterationEnd}`,
        results: savedFiles,
        successCount: savedFiles.filter(f => f.success).length,
        totalCount: savedFiles.length,
        hivemindMode: this.hivemindEnabled
      };
      
    } catch (error) {
      console.error(`❌ Wave ${waveNumber} failed:`, error);
      throw error;
    }
  }

  async saveGeneratedFile(content, iterationNumber, outputDirectory) {
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDirectory, { recursive: true });
      
      // Extract filename from content or generate one
      let filename = this.extractFilename(content, iterationNumber);
      
      if (!filename) {
        // Generate a default filename
        filename = `${iterationNumber.toString().padStart(2, '0')}_generated_ui.html`;
      }
      
      const filepath = path.join(outputDirectory, filename);
      
      // Clean the content (remove any markdown formatting if present)
      const cleanContent = this.cleanGeneratedContent(content);
      
      // Write the file
      await fs.writeFile(filepath, cleanContent, 'utf8');
      
      return filename;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  extractFilename(content, iterationNumber) {
    // Try to extract filename from HTML title or content
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1]
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
      return `${iterationNumber.toString().padStart(2, '0')}_${title}_ui.html`;
    }
    
    // Look for theme keywords in the content
    const themes = ['neural', 'cyber', 'quantum', 'bio', 'matrix', 'hologram', 'plasma', 'crystal'];
    for (const theme of themes) {
      if (content.toLowerCase().includes(theme)) {
        return `${iterationNumber.toString().padStart(2, '0')}_${theme}_ui.html`;
      }
    }
    
    return null;
  }

  cleanGeneratedContent(content) {
    // Remove markdown code blocks if present
    let cleaned = content.replace(/```html\s*/gi, '').replace(/```\s*$/g, '');
    
    // Ensure it starts with DOCTYPE
    if (!cleaned.trim().toLowerCase().startsWith('<!doctype')) {
      if (cleaned.trim().toLowerCase().startsWith('<html')) {
        cleaned = '<!DOCTYPE html>\n' + cleaned;
      }
    }
    
    return cleaned.trim();
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'No API key configured' };
    }
    
    try {
      const response = await this.sendMessage('Hello, are you working?', 100);
      return { 
        success: true, 
        message: 'Claude API connection successful',
        response: response.substring(0, 100)
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

export default ClaudeInfiniteAPI;