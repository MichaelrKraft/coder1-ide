/**
 * Intelligent Requirements Gathering System
 * 
 * Asks smart questions to gather context and requirements
 * for building better, more functional websites
 * 
 * Now uses Claude Code Max subscription instead of direct Anthropic API
 */

const { logger } = require('../monitoring/comprehensive-logger');
const { ClaudeCodeAPI } = require('../integrations/claude-code-api');

class IntelligentQuestioner {
    constructor(claudeCodeApiKey, options = {}) {
        // Support both CLAUDE_CODE_API_KEY and ANTHROPIC_API_KEY
        this.claudeCodeApiKey = claudeCodeApiKey || process.env.ANTHROPIC_API_KEY;
        this.logger = options.logger || logger;
        
        // Initialize Claude Code API if key is provided
        if (this.claudeCodeApiKey && this.claudeCodeApiKey !== 'demo_key_for_testing') {
            this.claudeAPI = new ClaudeCodeAPI(this.claudeCodeApiKey, {
                logger: this.logger
            });
        } else {
            this.logger.info('Running in demo mode - using template-based questions');
            this.claudeAPI = null;
        }
        
        // Question templates organized by project type
        this.questionTemplates = {
            website: {
                essential: [
                    "Tell me all the relevant things you think I need to know to make a website you would like. Include details about your business, goals, and any specific features you want.",
                    "Who is your target audience and what are the main actions you want visitors to take on your site?",
                    "Describe your preferred style, branding, and visual design. Include colors, fonts, layout preferences, or any inspiration you have.",
                    "What content do you have ready (text, images, videos) and what content do you need help creating?",
                    "Do you need any specific functionality like contact forms, payments, user accounts, integrations, or other features?"
                ],
                technical: [],
                business: []
            },
            ecommerce: {
                essential: [
                    "Tell me about your business and the products/services you're selling. Include your target market and business goals.",
                    "Describe your product catalog - how many items, categories, pricing structure, and any special product features you need.",
                    "What's your preferred design style and branding? Include colors, layout preferences, and any inspiration sites you like.",
                    "What payment methods, shipping options, and order fulfillment processes do you need?",
                    "Do you need special features like user accounts, reviews, inventory management, promotions, or integrations?"
                ],
                technical: []
            },
            portfolio: {
                essential: [
                    "Tell me about your professional background and the type of work you want to showcase. Include your goals for the portfolio.",
                    "Describe your projects and how you'd like them presented. Include any specific details about categorization or filtering.",
                    "What's your preferred design style and personal branding? Include colors, fonts, layout preferences, and inspiration.",
                    "What content do you have ready (project descriptions, images, resume) and what do you need help creating?",
                    "Do you need specific features like contact forms, blog, testimonials, social media links, or download capabilities?"
                ],
                technical: []
            },
            blog: {
                essential: [
                    "Tell me about your blog's purpose, topics, and target audience. Include your goals and posting frequency.",
                    "Describe your preferred design style and branding. Include colors, fonts, layout preferences, and any inspiration.",
                    "What content do you have ready and what type of content creation help do you need?",
                    "Do you want reader engagement features like comments, subscriptions, social sharing, or newsletter integration?",
                    "What organizational features do you need like categories, tags, search, related posts, or author profiles?"
                ],
                technical: []
            }
        };

        // Smart follow-up questions based on responses
        this.followUpLogic = {
            "ecommerce": {
                trigger: /shop|store|sell|buy|product|ecommerce|e-commerce/i,
                questions: "ecommerce"
            },
            "portfolio": {
                trigger: /portfolio|showcase|work|freelanc|designer|developer|artist/i,
                questions: "portfolio"
            },
            "blog": {
                trigger: /blog|article|post|content|news|journal/i,
                questions: "blog"
            },
            "business": {
                trigger: /business|company|corporate|service|professional/i,
                questions: "website"
            }
        };
    }

    /**
     * Analyze initial request and generate intelligent questions
     */
    async analyzeAndGenerateQuestions(userRequest, context = {}) {
        try {
            this.logger.info('🤔 Analyzing request for intelligent questions', { 
                requestLength: userRequest.length 
            });

            // Step 1: Simple project type determination (skip heavy Claude analysis)
            const projectType = this.determineProjectType(userRequest);
            
            // Step 2: Create basic analysis without Claude
            const analysis = {
                projectType: projectType,
                complexity: "moderate",
                keyFeatures: [],
                missingInfo: [],
                technicalRequirements: [],
                businessGoals: [],
                targetAudience: "General users"
            };
            
            // Step 3: Generate the 5 template questions
            const questions = this.generateRelevantQuestions(projectType, analysis, context);
            
            // Step 4: No need to prioritize - we have exactly 5 questions
            const filteredQuestions = questions;

            const result = {
                projectType,
                analysis,
                questions: filteredQuestions,
                estimatedComplexity: analysis.complexity,
                recommendedQuestionCount: filteredQuestions.length
            };

            this.logger.info('✅ Generated intelligent questions', {
                projectType,
                questionCount: filteredQuestions.length,
                complexity: result.estimatedComplexity
            });

            // Debug: Log actual questions
            console.log('🎯 FINAL QUESTIONS TO DISPLAY:', filteredQuestions.length);
            filteredQuestions.forEach((q, i) => {
                console.log(`   ${i+1}. ${q.question}`);
            });

            return result;

        } catch (error) {
            this.logger.error('❌ Failed to generate questions', { error: error.message });
            throw error;
        }
    }

    /**
     * Use Claude Code API to analyze the user request
     */
    async analyzeUserRequest(userRequest) {
        try {
            // Use Claude Code API if available, otherwise fallback to template analysis
            if (this.claudeAPI) {
                this.logger.info('Using Claude Code API for request analysis');
                return await this.claudeAPI.analyzeRequest(userRequest);
            } else {
                this.logger.info('Using template-based analysis (demo mode)');
                return this.createTemplateAnalysis(userRequest);
            }

        } catch (error) {
            this.logger.error('Request analysis failed, using template fallback', { error: error.message });
            return this.createTemplateAnalysis(userRequest);
        }
    }

    /**
     * Create template-based analysis when Claude API is not available
     */
    createTemplateAnalysis(userRequest) {
        const projectType = this.determineProjectTypeFromKeywords(userRequest);
        const keyFeatures = this.extractKeywordsFromRequest(userRequest);
        const complexity = this.estimateComplexity(userRequest, keyFeatures);
        
        return {
            projectType,
            complexity,
            keyFeatures,
            missingInfo: ["More details needed about specific requirements"],
            technicalRequirements: this.inferTechnicalRequirements(projectType, keyFeatures),
            businessGoals: this.inferBusinessGoals(projectType),
            targetAudience: "General users",
            suggestedQuestions: []
        };
    }

    /**
     * Determine project type from keywords (template method)
     */
    determineProjectTypeFromKeywords(request) {
        const text = request.toLowerCase();
        
        if (text.includes('ecommerce') || text.includes('store') || text.includes('shop') || 
            text.includes('sell') || text.includes('product') || text.includes('cart')) {
            return 'ecommerce';
        }
        if (text.includes('portfolio') || text.includes('showcase') || text.includes('work') || 
            text.includes('project') || text.includes('gallery')) {
            return 'portfolio';
        }
        if (text.includes('blog') || text.includes('article') || text.includes('post') || 
            text.includes('news') || text.includes('content')) {
            return 'blog';
        }
        if (text.includes('dashboard') || text.includes('admin') || text.includes('analytics') || 
            text.includes('management') || text.includes('control')) {
            return 'dashboard';
        }
        if (text.includes('saas') || text.includes('software') || text.includes('platform') || 
            text.includes('service') || text.includes('tool')) {
            return 'saas';
        }
        
        return 'website';
    }

    /**
     * Extract keywords from request
     */
    extractKeywordsFromRequest(request) {
        const keywords = [];
        const text = request.toLowerCase();
        
        const features = [
            'authentication', 'login', 'user accounts', 'payment', 'checkout',
            'database', 'search', 'mobile', 'responsive', 'admin panel',
            'api', 'integration', 'analytics', 'seo', 'cms', 'contact form',
            'email', 'newsletter', 'social media', 'reviews', 'comments'
        ];
        
        features.forEach(feature => {
            if (text.includes(feature)) {
                keywords.push(feature);
            }
        });
        
        return keywords;
    }

    /**
     * Estimate complexity based on request content
     */
    estimateComplexity(request, features) {
        const text = request.toLowerCase();
        let complexityScore = 0;
        
        // Base complexity indicators
        if (features.length > 5) complexityScore += 2;
        if (text.includes('integration') || text.includes('api')) complexityScore += 2;
        if (text.includes('payment') || text.includes('ecommerce')) complexityScore += 2;
        if (text.includes('database') || text.includes('user account')) complexityScore += 1;
        if (text.includes('admin') || text.includes('dashboard')) complexityScore += 1;
        if (text.includes('mobile') || text.includes('app')) complexityScore += 1;
        
        if (complexityScore >= 5) return 'complex';
        if (complexityScore >= 2) return 'moderate';
        return 'simple';
    }

    /**
     * Infer technical requirements based on project type and features
     */
    inferTechnicalRequirements(projectType, features) {
        const requirements = [];
        
        if (projectType === 'ecommerce') {
            requirements.push('Payment processing', 'Product database', 'Shopping cart');
        }
        if (projectType === 'portfolio') {
            requirements.push('Image gallery', 'Project showcase', 'Contact form');
        }
        if (projectType === 'blog') {
            requirements.push('Content management', 'Article display', 'Comment system');
        }
        
        if (features.includes('user accounts')) requirements.push('User authentication');
        if (features.includes('database')) requirements.push('Database integration');
        if (features.includes('mobile')) requirements.push('Mobile responsiveness');
        
        return requirements;
    }

    /**
     * Infer business goals based on project type
     */
    inferBusinessGoals(projectType) {
        const goals = {
            'ecommerce': ['Increase online sales', 'Improve customer experience', 'Expand market reach'],
            'portfolio': ['Showcase work', 'Attract clients', 'Build professional presence'],
            'blog': ['Share content', 'Build audience', 'Establish expertise'],
            'dashboard': ['Monitor performance', 'Make data-driven decisions', 'Improve efficiency'],
            'saas': ['Provide software service', 'Generate recurring revenue', 'Scale business'],
            'website': ['Establish online presence', 'Provide information', 'Engage visitors']
        };
        
        return goals[projectType] || goals.website;
    }

    /**
     * Determine project type from request
     */
    determineProjectType(userRequest, analysis = null) {
        if (analysis && analysis.projectType) {
            return analysis.projectType;
        }

        const lowercaseRequest = userRequest.toLowerCase();

        for (const [type, config] of Object.entries(this.followUpLogic)) {
            if (config.trigger.test(lowercaseRequest)) {
                return config.questions;
            }
        }

        return 'website'; // Default
    }

    /**
     * Generate relevant questions based on project type and analysis
     */
    generateRelevantQuestions(projectType, analysis, context) {
        const questions = [];

        // Get base questions for project type
        const typeQuestions = this.questionTemplates[projectType] || this.questionTemplates.website;
        
        // Add only the 5 essential questions - no Claude generation, no technical questions
        questions.push(...typeQuestions.essential.map(q => ({
            question: q,
            category: 'essential',
            priority: 'high',
            type: 'open'
        })));

        console.log(`📝 Generated ${questions.length} template questions for ${projectType}`);
        
        return questions;
    }

    /**
     * Prioritize questions by importance and relevance
     */
    prioritizeQuestions(questions, analysis) {
        // Remove duplicates
        const uniqueQuestions = questions.filter((q, index, self) => 
            index === self.findIndex(q2 => q2.question.toLowerCase() === q.question.toLowerCase())
        );

        // Sort by priority and category
        return uniqueQuestions.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const categoryOrder = { 
                'essential': 4, 
                'ai_suggested': 3, 
                'clarification': 2, 
                'technical': 1 
            };

            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;

            return categoryOrder[b.category] - categoryOrder[a.category];
        });
    }

    /**
     * Filter out unwanted questions
     */
    filterUnwantedQuestions(questions) {
        const unwantedPhrases = [
            'key performance indicators',
            'kpis for success',
            'what is your timeline and budget',
            'timeline and budget for this project',
            'can you provide more details about: target industry',
            'lead generation and sales processes',
            'existing website or online presence',
            'what content do you already have'
        ];

        const filtered = questions.filter(q => {
            const questionLower = q.question.toLowerCase();
            // Only filter out if it matches the exact unwanted phrases
            return !unwantedPhrases.some(phrase => questionLower.includes(phrase));
        });

        // If filtering removed everything, return the original essential questions
        if (filtered.length === 0) {
            console.warn('All questions were filtered out, returning essential questions');
            return questions.filter(q => q.category === 'essential').slice(0, 4);
        }

        return filtered;
    }

    /**
     * Estimate project complexity
     */
    estimateComplexity(analysis) {
        if (analysis.complexity) {
            return analysis.complexity;
        }

        const features = analysis.keyFeatures || [];
        const technical = analysis.technicalRequirements || [];

        const complexityScore = features.length + technical.length;

        if (complexityScore <= 3) return 'simple';
        if (complexityScore <= 6) return 'moderate';
        return 'complex';
    }

    /**
     * Process user answers and generate follow-up questions
     */
    async processAnswersAndGenerateFollowUps(questions, answers, originalRequest) {
        try {
            const followUpPrompt = `Based on the user's answers, suggest relevant follow-up questions:

Original Request: "${originalRequest}"

Questions and Answers:
${questions.map((q, i) => `Q${i+1}: ${q.question}\nA${i+1}: ${answers[i] || 'No answer'}`).join('\n\n')}

Generate 2-3 specific follow-up questions that would help create a better website. Focus on:
1. Technical details that weren't clarified
2. Design preferences that were mentioned but need more detail
3. Functionality that could be enhanced based on their answers

Return just the questions, one per line.`;

            const anthropic = new (require('@anthropic-ai/sdk'))({
                apiKey: this.anthropicApiKey,
            });

            const response = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 500,
                temperature: 0.4,
                messages: [{
                    role: "user",
                    content: followUpPrompt
                }]
            });

            const followUpText = response.content[0].text;
            const followUpQuestions = followUpText
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('Q') && !line.startsWith('A'))
                .map(q => q.replace(/^\d+\.\s*/, '').trim())
                .filter(q => q.length > 10)
                .map(q => ({
                    question: q,
                    category: 'follow_up',
                    priority: 'medium',
                    type: 'open'
                }));

            return followUpQuestions;

        } catch (error) {
            this.logger.error('Failed to generate follow-up questions', { error: error.message });
            return [];
        }
    }

    /**
     * Generate enhanced project brief with gathered requirements
     */
    generateEnhancedBrief(originalRequest, questions, answers, analysis) {
        const brief = {
            originalRequest,
            analysis,
            requirements: {},
            enhancedPrompt: '',
            confidence: 'medium'
        };

        // Process answers into structured requirements
        questions.forEach((question, index) => {
            const answerObj = answers[index];
            const answer = answerObj?.answer || answerObj;
            if (answer && typeof answer === 'string' && answer.trim()) {
                brief.requirements[question.category] = brief.requirements[question.category] || [];
                brief.requirements[question.category].push({
                    question: question.question,
                    answer: answer.trim()
                });
            }
        });

        // Generate enhanced prompt
        brief.enhancedPrompt = this.buildEnhancedPrompt(originalRequest, brief.requirements, analysis);

        // Calculate confidence based on answered questions
        const answeredCount = answers.filter(a => {
            const answer = a?.answer || a;
            return answer && typeof answer === 'string' && answer.trim();
        }).length;
        const totalCount = questions.length;
        const answerRate = answeredCount / totalCount;

        if (answerRate >= 0.8) brief.confidence = 'high';
        else if (answerRate >= 0.5) brief.confidence = 'medium';
        else brief.confidence = 'low';

        return brief;
    }

    /**
     * Generate formal Product Requirements Document (PRD) in markdown format
     */
    generatePRD(originalRequest, questions, answers, analysis, projectName = null) {
        try {
            this.logger.info('🔄 Generating formal PRD document');
            
            // Generate enhanced brief first
            const brief = this.generateEnhancedBrief(originalRequest, questions, answers, analysis);
            
            // Extract key information
            const projectTitle = projectName || this.extractProjectName(originalRequest, brief.requirements);
            const timestamp = new Date().toLocaleDateString();
            
            // Build structured PRD markdown
            let prd = this.buildPRDHeader(projectTitle, timestamp, analysis);
            prd += this.buildExecutiveSummary(originalRequest, analysis);
            prd += this.buildTargetAudience(brief.requirements);
            prd += this.buildCoreFeatures(brief.requirements, analysis);
            prd += this.buildTechnicalRequirements(brief.requirements, analysis);
            prd += this.buildDesignRequirements(brief.requirements);
            prd += this.buildSuccessMetrics(analysis);
            prd += this.buildImplementationPlan(analysis);
            prd += this.buildRisksAndMitigation(analysis);
            
            const prdDocument = {
                title: projectTitle,
                content: prd,
                metadata: {
                    projectType: analysis.projectType,
                    complexity: analysis.complexity,
                    confidence: brief.confidence,
                    generatedAt: new Date().toISOString(),
                    questionCount: questions.length,
                    answerCount: answers.filter(a => a && (a.answer || a).trim()).length
                },
                enhancedPrompt: brief.enhancedPrompt
            };
            
            this.logger.info('✅ PRD document generated successfully', {
                title: projectTitle,
                sections: 8,
                confidence: brief.confidence
            });
            
            return prdDocument;
            
        } catch (error) {
            this.logger.error('❌ Failed to generate PRD document', { error: error.message });
            throw error;
        }
    }

    /**
     * Extract project name from request and requirements
     */
    extractProjectName(originalRequest, requirements) {
        // Try to extract a meaningful project name
        const request = originalRequest.toLowerCase();
        
        // Look for explicit project names
        const nameMatches = request.match(/(?:called|named|for|build)\s+([a-zA-Z][a-zA-Z0-9\s]{2,20})/);
        if (nameMatches) {
            return nameMatches[1].trim().split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
        // Generate based on project type and key features
        const essential = requirements.essential || [];
        const businessAnswer = essential.find(req => 
            req.question.includes('business') || req.question.includes('about')
        );
        
        if (businessAnswer && businessAnswer.answer) {
            const words = businessAnswer.answer.split(' ').slice(0, 3);
            return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Platform';
        }
        
        return 'New Project Platform';
    }

    /**
     * Build PRD header section
     */
    buildPRDHeader(title, timestamp, analysis) {
        return `# Product Requirements Document (PRD)

## ${title}

**Document Version:** 1.0  
**Created:** ${timestamp}  
**Project Type:** ${analysis.projectType}  
**Complexity:** ${analysis.complexity}  
**Status:** Draft  

---

`;
    }

    /**
     * Build executive summary section
     */
    buildExecutiveSummary(originalRequest, analysis) {
        return `## Executive Summary

**Project Vision:**  
${originalRequest}

**Project Type:** ${analysis.projectType}  
**Target Audience:** ${analysis.targetAudience}  
**Estimated Complexity:** ${analysis.complexity}

**Key Success Factors:**
- User-centered design approach
- Responsive and accessible interface
- Scalable architecture
- Performance optimization
- SEO-friendly implementation

---

`;
    }

    /**
     * Build target audience section
     */
    buildTargetAudience(requirements) {
        const essential = requirements.essential || [];
        const audienceAnswer = essential.find(req => 
            req.question.includes('audience') || req.question.includes('target')
        );
        
        let content = `## Target Audience & User Personas

`;
        
        if (audienceAnswer) {
            content += `**Primary Audience:**  
${audienceAnswer.answer}

**User Goals:**
- Quick and intuitive navigation
- Easy access to key information
- Seamless user experience across devices
- Clear calls-to-action

`;
        }
        
        content += `**User Experience Priorities:**
- Mobile-first responsive design
- Fast loading times (< 3 seconds)
- Accessibility compliance (WCAG 2.1)
- Intuitive navigation structure

---

`;
        return content;
    }

    /**
     * Build core features section
     */
    buildCoreFeatures(requirements, analysis) {
        const essential = requirements.essential || [];
        let content = `## Core Features & Functionality

### Essential Features
`;
        
        essential.forEach((req, index) => {
            if (req.question.includes('features') || req.question.includes('functionality')) {
                content += `**${index + 1}. Core Functionality:**  
${req.answer}

`;
            }
        });
        
        if (analysis.keyFeatures && analysis.keyFeatures.length > 0) {
            content += `### Identified Key Features
`;
            analysis.keyFeatures.forEach((feature, index) => {
                content += `${index + 1}. ${feature}\n`;
            });
            content += `\n`;
        }
        
        content += `### Feature Prioritization
- **Must Have (P0):** Core functionality, responsive design, basic navigation
- **Should Have (P1):** Enhanced user experience, performance optimization
- **Could Have (P2):** Advanced features, integrations, analytics
- **Won't Have (This Release):** Complex admin features, advanced automation

---

`;
        return content;
    }

    /**
     * Build technical requirements section
     */
    buildTechnicalRequirements(requirements, analysis) {
        let content = `## Technical Requirements

### Frontend Requirements
- **Framework:** Modern JavaScript (React/Vue/vanilla)
- **Responsive Design:** Mobile-first approach
- **Browser Compatibility:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Performance:** Page load time < 3 seconds
- **Accessibility:** WCAG 2.1 AA compliance

### Backend Requirements (if applicable)
- **Server Technology:** Node.js/Express or static hosting
- **Database:** Based on data requirements
- **API Design:** RESTful endpoints
- **Security:** HTTPS, input validation, secure headers

### Hosting & Deployment
- **Platform:** Vercel/Netlify for static, cloud platforms for dynamic
- **CDN:** Global content delivery
- **SSL:** Automatic HTTPS
- **Monitoring:** Performance and uptime tracking

`;
        
        if (analysis.technicalRequirements && analysis.technicalRequirements.length > 0) {
            content += `### Specific Technical Needs
`;
            analysis.technicalRequirements.forEach((req, index) => {
                content += `${index + 1}. ${req}\n`;
            });
            content += `\n`;
        }
        
        content += `---

`;
        return content;
    }

    /**
     * Build design requirements section
     */
    buildDesignRequirements(requirements) {
        const essential = requirements.essential || [];
        const designAnswer = essential.find(req => 
            req.question.includes('design') || req.question.includes('style') || req.question.includes('brand')
        );
        
        let content = `## Design Requirements

### Visual Design
`;
        
        if (designAnswer) {
            content += `**Design Preferences:**  
${designAnswer.answer}

`;
        }
        
        content += `### Design Standards
- **Design System:** Consistent colors, typography, spacing
- **Mobile Responsiveness:** Optimized for all screen sizes
- **Accessibility:** High contrast ratios, keyboard navigation
- **Loading States:** Smooth transitions and feedback
- **Error Handling:** Clear error messages and recovery paths

### Brand Guidelines
- Professional and modern appearance
- Consistent visual identity
- User-friendly interface patterns
- Clean and intuitive navigation

---

`;
        return content;
    }

    /**
     * Build success metrics section
     */
    buildSuccessMetrics(analysis) {
        return `## Success Metrics & KPIs

### User Experience Metrics
- **Page Load Speed:** < 3 seconds first contentful paint
- **Mobile Usability:** 100% mobile-friendly score
- **Accessibility Score:** 95%+ accessibility rating
- **User Engagement:** Low bounce rate, good time on site

### Technical Metrics
- **Performance Score:** 90%+ Lighthouse performance
- **SEO Score:** 95%+ Lighthouse SEO
- **Uptime:** 99.9% availability
- **Cross-browser Compatibility:** Works on all major browsers

### Business Metrics
- **User Satisfaction:** Positive user feedback
- **Goal Completion:** Users successfully complete intended actions
- **Load Time:** Fast and responsive user experience
- **Search Visibility:** Good search engine ranking

---

`;
    }

    /**
     * Build implementation plan section
     */
    buildImplementationPlan(analysis) {
        const phases = this.getImplementationPhases(analysis.projectType, analysis.complexity);
        
        let content = `## Implementation Plan

### Development Phases

`;
        
        phases.forEach((phase, index) => {
            content += `**Phase ${index + 1}: ${phase.name}** (${phase.duration})
${phase.description}

**Deliverables:**
${phase.deliverables.map(d => `- ${d}`).join('\n')}

`;
        });
        
        content += `### Timeline Overview
- **Total Estimated Duration:** ${this.calculateTotalDuration(phases)}
- **Development Approach:** Agile/iterative development
- **Testing Strategy:** Continuous testing throughout development
- **Deployment Strategy:** Staged deployment with testing

---

`;
        return content;
    }

    /**
     * Build risks and mitigation section
     */
    buildRisksAndMitigation(analysis) {
        return `## Risks & Mitigation Strategies

### Technical Risks
- **Risk:** Performance issues on slower devices
  **Mitigation:** Optimize images, minimize code, use performance monitoring

- **Risk:** Browser compatibility issues
  **Mitigation:** Cross-browser testing, progressive enhancement

- **Risk:** Mobile responsiveness challenges
  **Mitigation:** Mobile-first design approach, thorough device testing

### Project Risks
- **Risk:** Scope creep during development
  **Mitigation:** Clear requirements documentation, change management process

- **Risk:** Timeline delays
  **Mitigation:** Realistic estimates, iterative development, regular check-ins

### Business Risks
- **Risk:** User adoption challenges
  **Mitigation:** User-centered design, usability testing, feedback integration

---

## Appendix

### Reference Materials
- User research and feedback
- Technical specifications
- Design mockups and wireframes
- Competitive analysis

### Approval Sign-off
- [ ] Stakeholder review complete
- [ ] Technical feasibility confirmed
- [ ] Design approval received
- [ ] Development ready to begin

---

*This PRD was generated by Coder1 AI to ensure comprehensive project planning and successful implementation.*
`;
    }

    /**
     * Get implementation phases based on project type and complexity
     */
    getImplementationPhases(projectType, complexity) {
        const basePhases = [
            {
                name: 'Planning & Setup',
                duration: '1-2 days',
                description: 'Project setup, environment configuration, and initial planning.',
                deliverables: ['Development environment setup', 'Project structure', 'Initial wireframes']
            },
            {
                name: 'Core Development',
                duration: '3-5 days',
                description: 'Implementation of core features and functionality.',
                deliverables: ['Core features implemented', 'Responsive design', 'Basic navigation']
            },
            {
                name: 'Enhancement & Polish',
                duration: '2-3 days',
                description: 'Performance optimization, design refinement, and additional features.',
                deliverables: ['Performance optimization', 'Design polish', 'Additional features']
            },
            {
                name: 'Testing & Launch',
                duration: '1-2 days',
                description: 'Final testing, bug fixes, and deployment preparation.',
                deliverables: ['Cross-browser testing', 'Performance validation', 'Deployment ready']
            }
        ];

        if (complexity === 'complex') {
            basePhases[1].duration = '5-7 days';
            basePhases[2].duration = '3-4 days';
        } else if (complexity === 'simple') {
            basePhases[1].duration = '2-3 days';
            basePhases[2].duration = '1-2 days';
        }

        return basePhases;
    }

    /**
     * Calculate total duration from phases
     */
    calculateTotalDuration(phases) {
        const totalDays = phases.reduce((total, phase) => {
            const match = phase.duration.match(/(\d+)-?(\d+)?/);
            const min = parseInt(match[1]);
            const max = parseInt(match[2] || match[1]);
            return total + Math.ceil((min + max) / 2);
        }, 0);
        
        return `${Math.max(1, Math.floor(totalDays * 0.8))}-${totalDays} days`;
    }

    /**
     * Build enhanced prompt with gathered requirements
     */
    buildEnhancedPrompt(originalRequest, requirements, analysis) {
        let enhanced = `Enhanced Website Build Request:\n\n`;
        enhanced += `Original Request: ${originalRequest}\n\n`;

        // Add requirements sections
        if (requirements.essential) {
            enhanced += `ESSENTIAL REQUIREMENTS:\n`;
            requirements.essential.forEach(req => {
                enhanced += `• ${req.question} → ${req.answer}\n`;
            });
            enhanced += `\n`;
        }

        if (requirements.technical) {
            enhanced += `TECHNICAL REQUIREMENTS:\n`;
            requirements.technical.forEach(req => {
                enhanced += `• ${req.question} → ${req.answer}\n`;
            });
            enhanced += `\n`;
        }

        if (requirements.ai_suggested) {
            enhanced += `SPECIFIC DETAILS:\n`;
            requirements.ai_suggested.forEach(req => {
                enhanced += `• ${req.question} → ${req.answer}\n`;
            });
            enhanced += `\n`;
        }

        // Add analysis insights
        if (analysis.keyFeatures && analysis.keyFeatures.length > 0) {
            enhanced += `KEY FEATURES TO IMPLEMENT:\n`;
            analysis.keyFeatures.forEach(feature => {
                enhanced += `• ${feature}\n`;
            });
            enhanced += `\n`;
        }

        enhanced += `PROJECT TYPE: ${analysis.projectType}\n`;
        enhanced += `COMPLEXITY: ${analysis.complexity}\n`;
        enhanced += `TARGET AUDIENCE: ${analysis.targetAudience}\n\n`;

        enhanced += `Please build a comprehensive, functional website that addresses all the above requirements and delivers a professional result that meets the user's specific needs.`;

        return enhanced;
    }
}

module.exports = {
    IntelligentQuestioner
};