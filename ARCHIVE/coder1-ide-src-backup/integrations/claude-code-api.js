/**
 * Claude Code API Integration
 * 
 * Provides Claude AI functionality using Claude Code Max subscription
 * instead of direct Anthropic API calls
 */

const axios = require('axios');
const { logger } = require('../monitoring/comprehensive-logger');

class ClaudeCodeAPI {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.baseURL = options.baseURL || 'https://api.claude.ai';
        this.logger = options.logger || logger;
        this.timeout = options.timeout || 30000;
        
        // Setup axios instance
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Coder1-Autonomous-Vibe-Interface/1.0'
            }
        });
    }

    /**
     * Send a message to Claude using Claude Code API
     * @param {string} content - The message content
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Claude's response
     */
    async sendMessage(content, options = {}) {
        try {
            const {
                model = 'claude-3-haiku-20240307',
                maxTokens = 1000,
                temperature = 0.3,
                systemPrompt = null
            } = options;

            this.logger.info('Sending message to Claude Code API', {
                model,
                contentLength: content.length,
                hasSystemPrompt: !!systemPrompt
            });

            // Prepare messages array
            const messages = [];
            
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }
            
            messages.push({
                role: 'user',
                content: content
            });

            const requestBody = {
                model,
                max_tokens: maxTokens,
                temperature,
                messages
            };

            const response = await this.client.post('/v1/messages', requestBody);
            
            if (response.data && response.data.content && response.data.content[0]) {
                const responseText = response.data.content[0].text;
                this.logger.info('Claude Code API response received', {
                    responseLength: responseText.length,
                    model: response.data.model
                });
                return responseText;
            }
            
            throw new Error('Invalid response format from Claude Code API');

        } catch (error) {
            this.logger.error('Claude Code API error:', {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText
            });

            // Check if it's an authentication error
            if (error.response?.status === 401) {
                throw new Error('Claude Code API authentication failed. Please check your API key.');
            }
            
            // Check if it's a rate limit error
            if (error.response?.status === 429) {
                throw new Error('Claude Code API rate limit exceeded. Please try again later.');
            }
            
            throw new Error(`Claude Code API request failed: ${error.message}`);
        }
    }

    /**
     * Analyze user request for project type and complexity
     * @param {string} userRequest - The user's request text
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeRequest(userRequest) {
        const analysisPrompt = `Analyze this web development request and categorize it. Respond with valid JSON only:

Request: "${userRequest}"

Analyze the request and return a JSON object with this exact structure:
{
    "projectType": "website|ecommerce|portfolio|blog|dashboard|saas|mobile|other",
    "complexity": "simple|moderate|complex",
    "keyFeatures": ["feature1", "feature2"],
    "missingInfo": ["missing info if any"],
    "technicalRequirements": ["technical needs identified"],
    "businessGoals": ["inferred business objectives"],
    "targetAudience": "who this is likely for"
}

Keep analysis simple and focus only on categorizing the project type and complexity.`;

        try {
            const response = await this.sendMessage(analysisPrompt, {
                model: 'claude-3-haiku-20240307',
                maxTokens: 1000,
                temperature: 0.3
            });

            // Try to parse JSON response
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                this.logger.warn('Could not parse Claude analysis as JSON, using fallback');
            }

            // Fallback analysis
            return this.createFallbackAnalysis(userRequest);

        } catch (error) {
            this.logger.error('Request analysis failed, using fallback:', error.message);
            return this.createFallbackAnalysis(userRequest);
        }
    }

    /**
     * Generate enhanced brief from Q&A session
     * @param {string} originalRequest - Original user request
     * @param {Array} questions - Questions asked
     * @param {Array} answers - User answers
     * @param {Object} analysis - Project analysis
     * @returns {Promise<Object>} Enhanced brief
     */
    async generateEnhancedBrief(originalRequest, questions, answers, analysis) {
        const briefPrompt = `Create an enhanced project brief based on this Q&A session:

Original Request: "${originalRequest}"

Q&A Session:
${questions.map((q, i) => `Q: ${q.question}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n')}

Project Analysis: ${JSON.stringify(analysis, null, 2)}

Create a comprehensive, actionable project brief that a developer could use to build exactly what the user wants. Include all specific requirements, preferences, and details gathered from the Q&A session.

Format as a clear, structured brief with sections for requirements, features, design preferences, technical specifications, and success criteria.`;

        try {
            const response = await this.sendMessage(briefPrompt, {
                model: 'claude-3-sonnet-20240229',
                maxTokens: 2000,
                temperature: 0.2
            });

            return {
                originalRequest,
                analysis,
                requirements: this.organizeRequirements(questions, answers),
                enhancedPrompt: response,
                confidence: 'high'
            };

        } catch (error) {
            this.logger.error('Enhanced brief generation failed, using fallback:', error.message);
            return this.createFallbackBrief(originalRequest, questions, answers, analysis);
        }
    }

    /**
     * Create fallback analysis when API is unavailable
     */
    createFallbackAnalysis(userRequest) {
        const projectType = this.determineProjectTypeFromKeywords(userRequest);
        
        return {
            projectType,
            complexity: "moderate",
            keyFeatures: this.extractKeywords(userRequest),
            missingInfo: ["More details needed about specific requirements"],
            technicalRequirements: [],
            businessGoals: ["Create functional web application"],
            targetAudience: "General users"
        };
    }

    /**
     * Create fallback enhanced brief
     */
    createFallbackBrief(originalRequest, questions, answers, analysis) {
        const requirements = this.organizeRequirements(questions, answers);
        
        const enhancedPrompt = `Enhanced Website Build Request:

Original Request: ${originalRequest}

ESSENTIAL REQUIREMENTS:
${requirements.essential.map(r => `• ${r.question} → ${r.answer}`).join('\n')}

PROJECT TYPE: ${analysis.projectType}
COMPLEXITY: ${analysis.complexity}
TARGET AUDIENCE: ${analysis.targetAudience}

Please build a comprehensive, functional website that addresses all the above requirements and delivers a professional result that meets the user's specific needs.`;

        return {
            originalRequest,
            analysis,
            requirements,
            enhancedPrompt,
            confidence: 'medium'
        };
    }

    /**
     * Determine project type from keywords
     */
    determineProjectTypeFromKeywords(request) {
        const text = request.toLowerCase();
        
        if (text.includes('ecommerce') || text.includes('store') || text.includes('shop') || text.includes('sell')) {
            return 'ecommerce';
        }
        if (text.includes('portfolio') || text.includes('showcase') || text.includes('work')) {
            return 'portfolio';
        }
        if (text.includes('blog') || text.includes('article') || text.includes('post')) {
            return 'blog';
        }
        if (text.includes('dashboard') || text.includes('admin') || text.includes('analytics')) {
            return 'dashboard';
        }
        if (text.includes('saas') || text.includes('software') || text.includes('platform')) {
            return 'saas';
        }
        
        return 'website';
    }

    /**
     * Extract keywords from request
     */
    extractKeywords(request) {
        const keywords = [];
        const text = request.toLowerCase();
        
        const features = [
            'authentication', 'login', 'user accounts', 'payment', 'checkout',
            'database', 'search', 'mobile', 'responsive', 'admin panel',
            'api', 'integration', 'analytics', 'seo', 'cms'
        ];
        
        features.forEach(feature => {
            if (text.includes(feature)) {
                keywords.push(feature);
            }
        });
        
        return keywords;
    }

    /**
     * Organize Q&A into requirements structure
     */
    organizeRequirements(questions, answers) {
        const requirements = {
            essential: [],
            technical: [],
            business: []
        };

        questions.forEach((question, index) => {
            const answer = answers[index] || 'No answer provided';
            const category = question.category || 'essential';
            
            requirements[category].push({
                question: question.question || question,
                answer: answer
            });
        });

        return requirements;
    }

    /**
     * Health check for Claude Code API
     */
    async healthCheck() {
        try {
            const response = await this.sendMessage('Hello Claude, please respond with "API is working"', {
                maxTokens: 50,
                temperature: 0
            });
            
            return {
                status: 'healthy',
                response: response.substring(0, 100),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = { ClaudeCodeAPI };