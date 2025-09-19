/**
 * Smart PRD Generator - Comprehensive PRD Generation Engine
 * Generates detailed, actionable PRDs that Claude Code can use to build apps
 */

// Pattern-specific configurations
const patternConfigs = {
    'notion': {
        name: 'Notion-style Platform',
        description: 'All-in-one workspace with blocks-based content creation',
        techStack: {
            frontend: 'Next.js 14, React 18, TailwindCSS, Slate.js/Lexical',
            backend: 'Node.js, Express, GraphQL, Prisma ORM',
            database: 'PostgreSQL with JSONB for flexible block storage',
            realtime: 'Socket.io for collaboration, Redis for pub/sub',
            infrastructure: 'AWS/Vercel, CloudFront CDN, S3 for media'
        },
        coreFeatures: [
            'Block-based editor with 20+ block types',
            'Real-time collaborative editing',
            'Nested page hierarchy with breadcrumbs',
            'Database views (Table, Board, Calendar, Gallery)',
            'Templates marketplace',
            'API & Webhooks for integrations',
            'Offline mode with sync'
        ]
    },
    'stripe': {
        name: 'Stripe-style SaaS',
        description: 'Payment processing and developer-first platform',
        techStack: {
            frontend: 'React with TypeScript, Ant Design/Arco',
            backend: 'Node.js, Express, REST API with OpenAPI',
            database: 'PostgreSQL with strong ACID compliance',
            realtime: 'Webhooks with exponential backoff',
            infrastructure: 'Multi-region deployment, PCI DSS compliant'
        },
        coreFeatures: [
            'Payment processing with 135+ currencies',
            'Developer-first API with SDKs',
            'Webhook system for events',
            'Compliance & fraud detection',
            'Subscription billing engine',
            'Financial reporting dashboard',
            'Test mode with fixtures'
        ]
    },
    'github': {
        name: 'GitHub-style DevTools',
        description: 'Version control and developer collaboration platform',
        techStack: {
            frontend: 'React, Primer design system, Monaco Editor',
            backend: 'Ruby on Rails, Go microservices, GraphQL',
            database: 'MySQL with Git storage backend',
            realtime: 'WebSockets for live updates, Redis queues',
            infrastructure: 'Kubernetes, distributed Git architecture'
        },
        coreFeatures: [
            'Git repository hosting',
            'Pull requests with code review',
            'Issues & project management',
            'Actions for CI/CD',
            'Packages registry',
            'Security scanning',
            'API with GraphQL'
        ]
    }
};

// Intelligent App Analysis Functions
function analyzeAppDescription(description) {
    const lowerDesc = description.toLowerCase();
    
    // Extract key features mentioned by user
    const features = [];
    const featureKeywords = {
        'real-time': ['real-time', 'live', 'instant', 'realtime'],
        'chat': ['chat', 'messaging', 'communication', 'conversation'],
        'file-sharing': ['file', 'upload', 'document', 'sharing', 'storage'],
        'analytics': ['analytics', 'reporting', 'dashboard', 'metrics', 'insights'],
        'collaboration': ['collaborate', 'team', 'together', 'shared', 'cooperation'],
        'project-management': ['project', 'task', 'todo', 'workflow', 'management'],
        'authentication': ['login', 'auth', 'user', 'account', 'security'],
        'api': ['api', 'integration', 'webhook', 'external'],
        'mobile': ['mobile', 'app', 'ios', 'android', 'responsive'],
        'automation': ['automate', 'automatic', 'workflow', 'trigger'],
        'notification': ['notify', 'alert', 'reminder', 'notification'],
        'search': ['search', 'find', 'filter', 'query'],
        'payment': ['payment', 'billing', 'subscription', 'money', 'price'],
        'social': ['social', 'share', 'follow', 'like', 'community']
    };
    
    for (const [feature, keywords] of Object.entries(featureKeywords)) {
        if (keywords.some(keyword => lowerDesc.includes(keyword))) {
            features.push(feature);
        }
    }
    
    // Determine complexity level
    const complexityIndicators = ['advanced', 'complex', 'sophisticated', 'enterprise', 'scalable', 'robust'];
    const simplicityIndicators = ['simple', 'basic', 'minimal', 'lightweight', 'easy'];
    
    let complexity = 'medium';
    if (complexityIndicators.some(indicator => lowerDesc.includes(indicator))) {
        complexity = 'high';
    } else if (simplicityIndicators.some(indicator => lowerDesc.includes(indicator))) {
        complexity = 'low';
    }
    
    // Detect specific technologies mentioned
    const technologies = [];
    const techKeywords = {
        'react': ['react', 'reactjs'],
        'vue': ['vue', 'vuejs'],
        'angular': ['angular'],
        'node': ['node', 'nodejs', 'express'],
        'python': ['python', 'django', 'flask'],
        'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml'],
        'blockchain': ['blockchain', 'crypto', 'web3'],
        'cloud': ['aws', 'azure', 'gcp', 'cloud']
    };
    
    for (const [tech, keywords] of Object.entries(techKeywords)) {
        if (keywords.some(keyword => lowerDesc.includes(keyword))) {
            technologies.push(tech);
        }
    }
    
    return {
        features,
        complexity,
        technologies,
        description,
        hasRealTime: features.includes('real-time') || features.includes('chat'),
        isCollaborative: features.includes('collaboration'),
        needsAnalytics: features.includes('analytics'),
        requiresAuth: features.includes('authentication') || lowerDesc.includes('user'),
        isMobileFriendly: features.includes('mobile') || lowerDesc.includes('responsive')
    };
}

function customizePatternForUser(basePattern, appAnalysis, answers) {
    const customPattern = JSON.parse(JSON.stringify(basePattern)); // Deep clone
    
    // Customize tech stack based on user requirements
    if (appAnalysis.hasRealTime) {
        customPattern.techStack.realtime = 'Socket.io, WebRTC, Redis Pub/Sub';
    }
    
    if (appAnalysis.technologies.includes('react')) {
        customPattern.techStack.frontend = 'React 18, Next.js 14, TypeScript, TailwindCSS';
    }
    
    if (appAnalysis.needsAnalytics) {
        customPattern.techStack.analytics = 'Mixpanel, Google Analytics, Custom Dashboard';
    }
    
    if (appAnalysis.isMobileFriendly) {
        customPattern.techStack.mobile = 'React Native, Progressive Web App (PWA)';
    }
    
    // Add custom features based on analysis
    const customFeatures = [...customPattern.coreFeatures];
    
    if (appAnalysis.features.includes('chat')) {
        customFeatures.push('Real-time messaging system');
    }
    if (appAnalysis.features.includes('file-sharing')) {
        customFeatures.push('Secure file upload and sharing');
    }
    if (appAnalysis.features.includes('analytics')) {
        customFeatures.push('Advanced analytics dashboard');
    }
    
    customPattern.coreFeatures = customFeatures;
    customPattern.appAnalysis = appAnalysis;
    
    return customPattern;
}

// Main PRD Generation Function
function generateComprehensivePRD(patternType, answers, selectedPattern) {
    const pattern = patternConfigs[patternType] || patternConfigs['notion'];
    
    // Analyze user's app description for intelligent customization
    const appDescription = answers[0] || '';
    const appAnalysis = analyzeAppDescription(appDescription);
    
    // Create enhanced pattern with user-specific customizations
    const customizedPattern = customizePatternForUser(pattern, appAnalysis, answers);
    
    return {
        executiveSummary: generatePersonalizedExecutiveSummary(customizedPattern, answers, appAnalysis),
        marketAnalysis: generateMarketAnalysis(customizedPattern, answers, appAnalysis),
        userPersonas: generateUserPersonas(answers[2], appAnalysis),
        coreFeatures: generateIntelligentFeatures(customizedPattern, answers, appAnalysis),
        technicalArchitecture: generateCustomTechnicalArchitecture(customizedPattern, answers, appAnalysis),
        dataModels: generateSmartDataModels(customizedPattern, answers, appAnalysis),
        apiSpecifications: generateAPISpecifications(customizedPattern, answers),
        userFlows: generatePersonalizedUserFlows(customizedPattern, answers, appAnalysis),
        securityRequirements: generateSecurityRequirements(customizedPattern, answers),
        performanceRequirements: generatePerformanceRequirements(answers, appAnalysis),
        developmentRoadmap: generateIntelligentRoadmap(answers[4], answers[5], customizedPattern, appAnalysis),
        successMetrics: generateCustomSuccessMetrics(customizedPattern, answers, appAnalysis),
        riskAnalysis: generateRiskAnalysis(answers, appAnalysis),
        testingStrategy: generateTestingStrategy(customizedPattern, appAnalysis),
        postLaunchStrategy: generatePostLaunchStrategy(customizedPattern, answers, appAnalysis)
    };
}

// 1. Personalized Executive Summary Generator
function generatePersonalizedExecutiveSummary(pattern, answers, appAnalysis) {
    const appDescription = answers[0] || 'innovative platform';
    const appType = answers[1] || 'SaaS Platform';
    const audience = answers[2] || 'Developers';
    const monetization = answers[3] || 'Subscription (Monthly/Annual)';
    const timeline = answers[4] || '3-6 months';
    const teamSize = answers[5] || 'Solo Founder';
    
    // Extract key value proposition from user's description
    const valueProps = extractValueProposition(appDescription, appAnalysis);
    
    return `
        <div class="prose max-w-none">
            <h5 class="font-bold text-gray-900 mb-3">Vision Statement</h5>
            <p class="mb-4">
                ${appDescription.charAt(0).toUpperCase() + appDescription.slice(1)}. 
                This ${appType.toLowerCase()} leverages proven ${pattern.name} patterns while 
                addressing specific needs of ${audience.toLowerCase()} through 
                ${appAnalysis.features.length > 0 ? appAnalysis.features.join(', ') : 'innovative features'}.
            </p>
            
            <h5 class="font-bold text-gray-900 mb-3">Value Proposition</h5>
            <p class="mb-4">
                ${valueProps}. Our solution targets the ${getMarketSize(audience)} market of ${audience.toLowerCase()}, 
                delivering ${appAnalysis.hasRealTime ? 'real-time collaboration' : 'streamlined workflows'} 
                ${appAnalysis.isCollaborative ? 'for distributed teams' : 'for individual productivity'}. 
                With a ${monetization.toLowerCase()} model, we're positioned to capture 
                ${getRevenueProjection(monetization, audience)} in annual recurring revenue within 24 months.
            </p>
            
            <h5 class="font-bold text-gray-900 mb-3">Key Differentiators</h5>
            <ul class="list-disc pl-5 mb-4">
                ${generateCustomDifferentiators(appAnalysis, audience)}
            </ul>
            
            <h5 class="font-bold text-gray-900 mb-3">Technical Approach</h5>
            <p class="mb-4">
                Built with ${appAnalysis.complexity === 'high' ? 'enterprise-grade' : 
                           appAnalysis.complexity === 'low' ? 'lightweight' : 'scalable'} 
                architecture using ${pattern.techStack.frontend} and ${pattern.techStack.backend}.
                ${appAnalysis.hasRealTime ? 'Real-time features powered by WebSocket technology.' : ''}
                ${appAnalysis.needsAnalytics ? 'Advanced analytics for data-driven insights.' : ''}
            </p>
        </div>
    `;
}

function extractValueProposition(description, appAnalysis) {
    // Generate intelligent value proposition based on user's description
    const benefits = [];
    
    if (appAnalysis.isCollaborative) {
        benefits.push('enhances team collaboration');
    }
    if (appAnalysis.hasRealTime) {
        benefits.push('provides instant communication');
    }
    if (appAnalysis.needsAnalytics) {
        benefits.push('delivers actionable insights');
    }
    if (appAnalysis.features.includes('project-management')) {
        benefits.push('streamlines project workflows');
    }
    if (appAnalysis.features.includes('automation')) {
        benefits.push('automates repetitive tasks');
    }
    
    const baseValue = benefits.length > 0 ? 
        `Our platform ${benefits.join(', ')}, solving key pain points in ${description.toLowerCase()}` :
        `Our innovative solution addresses critical challenges by ${description.toLowerCase()}`;
        
    return baseValue;
}

function generateCustomDifferentiators(appAnalysis, audience) {
    const differentiators = [];
    
    if (appAnalysis.hasRealTime) {
        differentiators.push('<li>Real-time collaboration with sub-100ms latency</li>');
    }
    if (appAnalysis.needsAnalytics) {
        differentiators.push('<li>AI-powered analytics and predictive insights</li>');
    }
    if (appAnalysis.isMobileFriendly) {
        differentiators.push('<li>Mobile-first design with offline capabilities</li>');
    }
    if (appAnalysis.complexity === 'high') {
        differentiators.push('<li>Enterprise-grade security and compliance</li>');
    }
    if (appAnalysis.features.includes('automation')) {
        differentiators.push('<li>Intelligent workflow automation</li>');
    }
    
    // Add audience-specific differentiators
    if (audience.toLowerCase().includes('developer')) {
        differentiators.push('<li>Developer-first API design and comprehensive SDKs</li>');
    } else if (audience.toLowerCase().includes('business')) {
        differentiators.push('<li>No-code configuration and business-friendly interfaces</li>');
    }
    
    // Ensure we have at least 3 differentiators
    if (differentiators.length === 0) {
        differentiators.push(
            '<li>Intuitive user experience designed for rapid adoption</li>',
            '<li>Scalable architecture that grows with your needs</li>',
            '<li>Comprehensive integration ecosystem</li>'
        );
    }
    
    return differentiators.join('');
}

// 2. Intelligent Feature Generation
function generateIntelligentFeatures(pattern, answers, appAnalysis) {
    const audience = answers[2] || 'Users';
    
    // Start with base features and enhance based on user description
    const intelligentFeatures = [];
    
    // Add features directly mentioned by user
    appAnalysis.features.forEach(feature => {
        switch(feature) {
            case 'real-time':
                intelligentFeatures.push('Real-time Collaboration Engine');
                break;
            case 'chat':
                intelligentFeatures.push('Integrated Messaging System');
                break;
            case 'file-sharing':
                intelligentFeatures.push('Secure File Management & Sharing');
                break;
            case 'analytics':
                intelligentFeatures.push('Advanced Analytics Dashboard');
                break;
            case 'project-management':
                intelligentFeatures.push('Project Planning & Task Management');
                break;
            case 'automation':
                intelligentFeatures.push('Workflow Automation Engine');
                break;
            case 'notification':
                intelligentFeatures.push('Smart Notification System');
                break;
            case 'search':
                intelligentFeatures.push('Intelligent Search & Filtering');
                break;
            case 'api':
                intelligentFeatures.push('RESTful API & Webhooks');
                break;
        }
    });
    
    // Add complementary features based on pattern and analysis
    if (appAnalysis.isCollaborative) {
        intelligentFeatures.push('Team Management & Permissions');
        intelligentFeatures.push('Activity Feeds & Timeline');
    }
    
    if (appAnalysis.requiresAuth) {
        intelligentFeatures.push('Multi-factor Authentication');
        intelligentFeatures.push('Role-based Access Control');
    }
    
    // Ensure we have comprehensive feature set
    const coreFeatures = [
        'User Dashboard & Profile Management',
        'Data Export & Import Capabilities',
        'Mobile-responsive Design',
        'Integration Marketplace'
    ];
    
    const finalFeatures = [...new Set([...intelligentFeatures, ...coreFeatures])];
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">Core Features</h5>
            ${finalFeatures.slice(0, 8).map((feature, index) => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold text-gray-900 mb-2">
                        ${index + 1}. ${feature}
                    </h5>
                    <div class="space-y-2 text-sm text-gray-700">
                        <p><strong>User Story:</strong> ${generateIntelligentUserStory(feature, audience, appAnalysis)}</p>
                        <p><strong>Acceptance Criteria:</strong></p>
                        <ul class="list-disc pl-5">
                            ${generateIntelligentAcceptanceCriteria(feature, appAnalysis).map(c => `<li>${c}</li>`).join('')}
                        </ul>
                        <p><strong>Priority:</strong> ${getIntelligentPriority(feature, appAnalysis)}</p>
                        <p><strong>Effort:</strong> ${getIntelligentEffort(feature, appAnalysis)}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function generateIntelligentUserStory(feature, audience, appAnalysis) {
    const userType = audience.toLowerCase().includes('developer') ? 'developer' : 
                    audience.toLowerCase().includes('business') ? 'business user' : 'user';
    
    const stories = {
        'Real-time Collaboration Engine': `As a ${userType}, I want to collaborate with my team in real-time so that we can work together seamlessly regardless of location`,
        'Integrated Messaging System': `As a ${userType}, I want to communicate with team members within the platform so that I can maintain context and reduce tool switching`,
        'Secure File Management & Sharing': `As a ${userType}, I want to securely upload and share files so that I can collaborate on documents while maintaining data security`,
        'Advanced Analytics Dashboard': `As a ${userType}, I want to view detailed analytics and insights so that I can make data-driven decisions`,
        'Project Planning & Task Management': `As a ${userType}, I want to create and manage tasks and projects so that I can track progress and meet deadlines`,
        'Workflow Automation Engine': `As a ${userType}, I want to automate repetitive tasks so that I can focus on high-value work`,
        'Smart Notification System': `As a ${userType}, I want to receive relevant notifications so that I stay informed without being overwhelmed`,
        'Intelligent Search & Filtering': `As a ${userType}, I want to quickly find information using advanced search so that I can access what I need efficiently`
    };
    
    return stories[feature] || `As a ${userType}, I want to use ${feature.toLowerCase()} so that I can accomplish my goals more effectively`;
}

function generateIntelligentAcceptanceCriteria(feature, appAnalysis) {
    const baseCriteria = {
        'Real-time Collaboration Engine': [
            'Changes are synchronized across all connected users within 100ms',
            'Conflict resolution handles simultaneous edits gracefully',
            'Connection status is clearly indicated to users'
        ],
        'Integrated Messaging System': [
            'Messages are delivered in real-time with delivery confirmations',
            'Users can create channels and direct messages',
            'Message history is searchable and persistent'
        ],
        'Advanced Analytics Dashboard': [
            'Data visualizations load within 2 seconds',
            'Users can customize dashboard layouts',
            'Export functionality supports multiple formats'
        ]
    };
    
    return baseCriteria[feature] || [
        'Feature is accessible and intuitive to use',
        'Performance meets user expectations',
        'Data is accurately processed and displayed'
    ];
}

function getIntelligentPriority(feature, appAnalysis) {
    // Prioritize based on user's described needs
    if (appAnalysis.features.some(f => feature.toLowerCase().includes(f))) {
        return 'High (Core Feature)';
    }
    if (feature.includes('Authentication') || feature.includes('Security')) {
        return 'High (Security)';
    }
    if (feature.includes('Dashboard') || feature.includes('Management')) {
        return 'Medium (Essential)';
    }
    return 'Medium (Important)';
}

function getIntelligentEffort(feature, appAnalysis) {
    const complexFeatures = ['Real-time', 'Analytics', 'Automation', 'AI'];
    const simpleFeatures = ['Dashboard', 'Profile', 'Export'];
    
    if (complexFeatures.some(complex => feature.includes(complex))) {
        return appAnalysis.complexity === 'high' ? 'Large (3-4 weeks)' : 'Large (2-3 weeks)';
    }
    if (simpleFeatures.some(simple => feature.includes(simple))) {
        return 'Small (3-5 days)';
    }
    return 'Medium (1-2 weeks)';
}

// 3. Custom Technical Architecture
function generateCustomTechnicalArchitecture(pattern, answers, appAnalysis) {
    const teamSize = answers[5] || 'Solo Founder';
    const timeline = answers[4] || '3-6 months';
    
    // Customize tech stack based on requirements
    const customTechStack = { ...pattern.techStack };
    
    if (appAnalysis.hasRealTime) {
        customTechStack.realtime = 'Socket.io + Redis for WebSocket scaling, WebRTC for peer-to-peer';
    }
    if (appAnalysis.needsAnalytics) {
        customTechStack.analytics = 'ClickHouse/TimescaleDB for time-series, Apache Superset for visualization';
    }
    if (appAnalysis.isMobileFriendly) {
        customTechStack.mobile = 'React Native + Expo, PWA capabilities';
    }
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">System Architecture</h5>
            <pre class="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs">
${generateCustomArchitectureDiagram(appAnalysis)}
            </pre>
            
            <h5 class="font-bold text-gray-900">Technology Stack</h5>
            <div class="space-y-3">
                <div><strong>Frontend:</strong> ${customTechStack.frontend}</div>
                <div><strong>Backend:</strong> ${customTechStack.backend}</div>
                <div><strong>Database:</strong> ${customTechStack.database}</div>
                ${appAnalysis.hasRealTime ? `<div><strong>Real-time:</strong> ${customTechStack.realtime}</div>` : ''}
                ${appAnalysis.needsAnalytics ? `<div><strong>Analytics:</strong> ${customTechStack.analytics}</div>` : ''}
                ${appAnalysis.isMobileFriendly ? `<div><strong>Mobile:</strong> ${customTechStack.mobile}</div>` : ''}
                <div><strong>Infrastructure:</strong> ${customTechStack.infrastructure}</div>
            </div>
            
            <h5 class="font-bold text-gray-900">Architecture Decisions</h5>
            <div class="space-y-2 text-sm text-gray-700">
                ${generateArchitectureDecisions(appAnalysis, teamSize)}
            </div>
            
            <h5 class="font-bold text-gray-900">Scalability Plan</h5>
            <p class="text-gray-700">
                ${generateCustomScalabilityPlan(appAnalysis, pattern)}
            </p>
        </div>
    `;
}

function generateCustomArchitectureDiagram(appAnalysis) {
    const hasRealTime = appAnalysis.hasRealTime;
    const hasAnalytics = appAnalysis.needsAnalytics;
    
    return `
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
│  ┌─────────────┐  ┌─────────────┐  ${appAnalysis.isMobileFriendly ? '┌─────────────┐' : '               '}        │
│  │  Web App    │  │     PWA     │  ${appAnalysis.isMobileFriendly ? '│ Mobile App  │' : '               '}        │
│  │  (React)    │  │  (Next.js)  │  ${appAnalysis.isMobileFriendly ? '│ (React N.)  │' : '               '}        │
│  └──────┬──────┘  └──────┬──────┘  ${appAnalysis.isMobileFriendly ? '└──────┬──────┘' : '               '}        │
└─────────┼─────────────────┼─────────────────${appAnalysis.isMobileFriendly ? '─┼─' : '──'}──────────────┘
          │                 │                 ${appAnalysis.isMobileFriendly ? ' │' : ''}
          └────────┬────────┴─────────────────${appAnalysis.isMobileFriendly ? '─┘' : ''}
                   │ HTTPS/WSS
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer & CDN                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Nginx     │  │  CloudFlare │  │    SSL/TLS  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼─────────────────┼────────────────┼───────────────┘
          └────────┬────────┴────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ${hasRealTime ? '┌─────────────┐' : '               '}        │
│  │   REST API  │  │   GraphQL   │  ${hasRealTime ? '│  WebSocket  │' : '               '}        │
│  │  (Express)  │  │   Server    │  ${hasRealTime ? '│   Server    │' : '               '}        │
│  └──────┬──────┘  └──────┬──────┘  ${hasRealTime ? '└──────┬──────┘' : '               '}        │
└─────────┼─────────────────┼─────────────────${hasRealTime ? '─┼─' : '──'}──────────────┘
          └────────┬────────┴─────────────────${hasRealTime ? '─┘' : ''}
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ${hasAnalytics ? '┌─────────────┐' : '               '}        │
│  │ PostgreSQL  │  │    Redis    │  ${hasAnalytics ? '│ ClickHouse  │' : '               '}        │
│  │ (Primary)   │  │   (Cache)   │  ${hasAnalytics ? '│ (Analytics) │' : '               '}        │
│  └─────────────┘  └─────────────┘  ${hasAnalytics ? '└─────────────┘' : '               '}        │
└─────────────────────────────────────────────────────────────┘
    `;
}

function generateArchitectureDecisions(appAnalysis, teamSize) {
    const decisions = [];
    
    if (appAnalysis.hasRealTime) {
        decisions.push('• WebSocket connections managed by Redis for horizontal scaling');
    }
    if (appAnalysis.needsAnalytics) {
        decisions.push('• Separate analytics database for time-series data and reporting');
    }
    if (appAnalysis.complexity === 'high') {
        decisions.push('• Microservices architecture for better separation of concerns');
    } else {
        decisions.push('• Monolithic architecture for faster development and deployment');
    }
    if (teamSize.includes('Solo') || teamSize.includes('2-3')) {
        decisions.push('• Cloud-native deployment for reduced operational overhead');
    }
    
    return decisions.join('\n');
}

function generateCustomScalabilityPlan(appAnalysis, pattern) {
    const plans = [];
    
    if (appAnalysis.hasRealTime) {
        plans.push('Real-time scaling via Redis Cluster and horizontal WebSocket server scaling');
    }
    if (appAnalysis.needsAnalytics) {
        plans.push('Analytics scaling through data partitioning and read replicas');
    }
    plans.push('Database scaling via read replicas and connection pooling');
    plans.push('CDN integration for global asset delivery and reduced latency');
    
    return plans.join('. ') + '.';
}

// 4. Smart Data Models Generator
function generateSmartDataModels(pattern, answers, appAnalysis) {
    const appType = answers[1] || 'SaaS Platform';
    
    // Generate data models based on user's specific requirements
    const models = [];
    
    // Always include user model
    models.push({
        name: 'User',
        description: 'Core user entity with authentication and profile data',
        fields: [
            'id: UUID (Primary Key)',
            'email: String (Unique, Required)',
            'password: String (Hashed)',
            'profile: JSON (Name, avatar, preferences)',
            'role: Enum (Admin, User, Guest)',
            'created_at: Timestamp',
            'updated_at: Timestamp'
        ]
    });
    
    // Add models based on app analysis
    if (appAnalysis.features.includes('project-management')) {
        models.push({
            name: 'Project',
            description: 'Project management entity for organizing work',
            fields: [
                'id: UUID (Primary Key)',
                'name: String (Required)',
                'description: Text',
                'owner_id: UUID (Foreign Key → User)',
                'status: Enum (Active, Completed, Archived)',
                'deadline: Date',
                'created_at: Timestamp'
            ]
        });
        
        models.push({
            name: 'Task',
            description: 'Individual task within projects',
            fields: [
                'id: UUID (Primary Key)',
                'title: String (Required)',
                'description: Text',
                'project_id: UUID (Foreign Key → Project)',
                'assignee_id: UUID (Foreign Key → User)',
                'priority: Enum (Low, Medium, High, Critical)',
                'status: Enum (Todo, InProgress, Review, Done)',
                'due_date: Date',
                'estimated_hours: Integer'
            ]
        });
    }
    
    if (appAnalysis.features.includes('chat')) {
        models.push({
            name: 'Channel',
            description: 'Communication channels for team messaging',
            fields: [
                'id: UUID (Primary Key)',
                'name: String (Required)',
                'type: Enum (Public, Private, Direct)',
                'project_id: UUID (Foreign Key → Project, Optional)',
                'members: Array<UUID> (User IDs)',
                'created_by: UUID (Foreign Key → User)'
            ]
        });
        
        models.push({
            name: 'Message',
            description: 'Individual messages within channels',
            fields: [
                'id: UUID (Primary Key)',
                'content: Text (Required)',
                'channel_id: UUID (Foreign Key → Channel)',
                'sender_id: UUID (Foreign Key → User)',
                'message_type: Enum (Text, File, System)',
                'thread_id: UUID (Optional, for threading)',
                'created_at: Timestamp'
            ]
        });
    }
    
    if (appAnalysis.features.includes('file-sharing')) {
        models.push({
            name: 'File',
            description: 'File management and sharing system',
            fields: [
                'id: UUID (Primary Key)',
                'filename: String (Required)',
                'original_name: String',
                'file_size: Integer (Bytes)',
                'mime_type: String',
                'storage_path: String',
                'uploaded_by: UUID (Foreign Key → User)',
                'project_id: UUID (Foreign Key → Project, Optional)',
                'access_level: Enum (Public, Team, Private)',
                'download_count: Integer (Default: 0)'
            ]
        });
    }
    
    if (appAnalysis.needsAnalytics) {
        models.push({
            name: 'Event',
            description: 'Analytics events for tracking user behavior',
            fields: [
                'id: UUID (Primary Key)',
                'event_type: String (Required)',
                'user_id: UUID (Foreign Key → User, Optional)',
                'properties: JSON (Event-specific data)',
                'session_id: String',
                'ip_address: String',
                'user_agent: String',
                'timestamp: Timestamp'
            ]
        });
    }
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">Data Models</h5>
            <p class="text-gray-700 mb-4">
                Database schema designed for ${appAnalysis.complexity === 'high' ? 'enterprise scalability' : 'optimal performance'} 
                with ${appAnalysis.hasRealTime ? 'real-time synchronization capabilities' : 'efficient data access patterns'}.
            </p>
            
            ${models.map(model => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h6 class="font-bold text-gray-900 mb-2">${model.name}</h6>
                    <p class="text-sm text-gray-600 mb-3">${model.description}</p>
                    <div class="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono">
                        <div class="text-yellow-400">CREATE TABLE ${model.name.toLowerCase()}s (</div>
                        ${model.fields.map(field => `<div class="ml-4">${field},</div>`).join('')}
                        <div>);</div>
                    </div>
                </div>
            `).join('')}
            
            <div class="bg-blue-50 p-4 rounded-lg">
                <h6 class="font-bold text-blue-900 mb-2">Database Optimization</h6>
                <ul class="text-sm text-blue-800 space-y-1">
                    <li>• Indexes on frequently queried fields (user_id, project_id, created_at)</li>
                    <li>• ${appAnalysis.hasRealTime ? 'Change data capture for real-time updates' : 'Connection pooling for concurrent access'}</li>
                    <li>• ${appAnalysis.needsAnalytics ? 'Separate analytics database for time-series data' : 'Query optimization for reporting'}</li>
                    <li>• Data archiving strategy for long-term storage efficiency</li>
                </ul>
            </div>
        </div>
    `;
}

// 5. Personalized User Flows
function generatePersonalizedUserFlows(pattern, answers, appAnalysis) {
    const audience = answers[2] || 'Users';
    const userType = audience.toLowerCase().includes('developer') ? 'developer' : 
                    audience.toLowerCase().includes('business') ? 'business user' : 'user';
    
    const flows = [];
    
    // Core onboarding flow
    flows.push({
        name: 'User Onboarding',
        description: `Streamlined onboarding for ${audience.toLowerCase()}`,
        steps: [
            'Landing page with clear value proposition',
            `Sign up with ${appAnalysis.complexity === 'high' ? 'enterprise SSO or' : ''} email/password`,
            'Email verification and welcome message',
            `Profile setup with ${userType}-specific preferences`,
            'Interactive product tour highlighting key features',
            `First ${appAnalysis.features.includes('project-management') ? 'project creation' : 'action completion'} guided experience`,
            'Success confirmation and next steps'
        ]
    });
    
    // Feature-specific flows
    if (appAnalysis.features.includes('project-management')) {
        flows.push({
            name: 'Project Creation & Management',
            description: 'Complete project lifecycle management',
            steps: [
                'Access project dashboard',
                'Create new project with template options',
                'Set up project details and team members',
                'Create initial tasks and milestones',
                'Invite team members with appropriate roles',
                'Begin collaboration and track progress',
                'Review analytics and project health metrics'
            ]
        });
    }
    
    if (appAnalysis.features.includes('chat')) {
        flows.push({
            name: 'Team Communication',
            description: 'Real-time messaging and collaboration',
            steps: [
                'Access communication interface',
                'Join relevant channels or create new ones',
                'Share messages, files, and updates',
                'Use @mentions and notifications',
                'Search message history and files',
                'Integrate with project context',
                'Manage notification preferences'
            ]
        });
    }
    
    if (appAnalysis.needsAnalytics) {
        flows.push({
            name: 'Analytics & Insights',
            description: 'Data-driven decision making workflow',
            steps: [
                'Access analytics dashboard',
                'Select relevant time periods and metrics',
                'Apply filters for specific teams/projects',
                'Generate custom reports',
                'Export data for external analysis',
                'Set up alerts for key metrics',
                'Share insights with stakeholders'
            ]
        });
    }
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">User Journey Flows</h5>
            <p class="text-gray-700 mb-4">
                Optimized user experiences designed for ${audience.toLowerCase()} with 
                ${appAnalysis.complexity === 'low' ? 'simplicity' : appAnalysis.complexity === 'high' ? 'comprehensive functionality' : 'balanced usability'} 
                as the primary focus.
            </p>
            
            ${flows.map((flow, index) => `
                <div class="bg-white border border-gray-200 p-4 rounded-lg">
                    <h6 class="font-bold text-gray-900 mb-2">${index + 1}. ${flow.name}</h6>
                    <p class="text-sm text-gray-600 mb-3">${flow.description}</p>
                    <div class="space-y-2">
                        ${flow.steps.map((step, stepIndex) => `
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    ${stepIndex + 1}
                                </div>
                                <div class="text-sm text-gray-700">${step}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 6. Intelligent Development Roadmap
function generateIntelligentRoadmap(timeline, teamSize, pattern, appAnalysis) {
    const phases = [];
    const isComplexApp = appAnalysis.complexity === 'high';
    const hasRealTime = appAnalysis.hasRealTime;
    const needsAnalytics = appAnalysis.needsAnalytics;
    
    // Phase 1: Foundation (always first)
    phases.push({
        name: 'Foundation & Core Infrastructure',
        duration: isComplexApp ? '4-6 weeks' : '2-4 weeks',
        priority: 'Critical',
        deliverables: [
            'Authentication & user management system',
            'Database schema and API foundation',
            'Core UI components and design system',
            'Basic deployment pipeline',
            ...(appAnalysis.requiresAuth ? ['Multi-factor authentication', 'Role-based permissions'] : [])
        ]
    });
    
    // Phase 2: Core Features
    const coreFeatures = appAnalysis.features.includes('project-management') ? 
        ['Project creation and management', 'Task assignment and tracking', 'Team collaboration basics'] :
        ['Core application features', 'User dashboard and profiles', 'Basic data management'];
    
    phases.push({
        name: 'Core Feature Development',
        duration: isComplexApp ? '6-8 weeks' : '4-6 weeks', 
        priority: 'High',
        deliverables: [
            ...coreFeatures,
            'Mobile-responsive design implementation',
            'Core integrations and APIs',
            ...(appAnalysis.features.includes('file-sharing') ? ['File upload and management system'] : [])
        ]
    });
    
    // Phase 3: Advanced Features
    if (hasRealTime || needsAnalytics || appAnalysis.features.includes('automation')) {
        phases.push({
            name: 'Advanced Features & Intelligence',
            duration: isComplexApp ? '4-6 weeks' : '3-4 weeks',
            priority: 'Medium',
            deliverables: [
                ...(hasRealTime ? ['Real-time collaboration engine', 'WebSocket implementation'] : []),
                ...(needsAnalytics ? ['Analytics dashboard', 'Reporting system'] : []),
                ...(appAnalysis.features.includes('automation') ? ['Workflow automation', 'Smart notifications'] : []),
                'Advanced search and filtering',
                'Performance optimizations'
            ]
        });
    }
    
    // Phase 4: Polish & Launch
    phases.push({
        name: 'Polish & Production Launch',
        duration: '2-3 weeks',
        priority: 'High',
        deliverables: [
            'Comprehensive testing and QA',
            'Performance optimization and monitoring',
            'Documentation and user guides', 
            'Production deployment and monitoring',
            'User feedback collection system',
            'Marketing site and onboarding materials'
        ]
    });
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">Development Roadmap</h5>
            <p class="text-gray-700 mb-4">
                ${timeline} development plan optimized for ${teamSize.toLowerCase()} with 
                ${appAnalysis.complexity} complexity requirements.
            </p>
            
            <div class="space-y-4">
                ${phases.map((phase, index) => `
                    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                        <div class="flex justify-between items-start mb-3">
                            <h6 class="font-bold text-gray-900">Phase ${index + 1}: ${phase.name}</h6>
                            <div class="text-right">
                                <div class="text-sm font-medium text-indigo-700">${phase.duration}</div>
                                <div class="text-xs text-indigo-600">${phase.priority} Priority</div>
                            </div>
                        </div>
                        <ul class="space-y-1 text-sm text-gray-700">
                            ${phase.deliverables.map(deliverable => `
                                <li class="flex items-start space-x-2">
                                    <span class="text-green-500 mt-1">✓</span>
                                    <span>${deliverable}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
            
            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h6 class="font-bold text-yellow-900 mb-2">Success Factors</h6>
                <ul class="text-sm text-yellow-800 space-y-1">
                    <li>• ${teamSize.includes('Solo') ? 'Focus on MVP features first' : 'Parallel development streams for faster delivery'}</li>
                    <li>• ${appAnalysis.hasRealTime ? 'Early WebSocket testing to validate real-time performance' : 'Iterative user feedback integration'}</li>
                    <li>• ${appAnalysis.complexity === 'high' ? 'Comprehensive security review before launch' : 'Rapid prototyping and user validation'}</li>
                    <li>• Continuous deployment pipeline for reliable releases</li>
                </ul>
            </div>
        </div>
    `;
}

// 7. Custom Success Metrics
function generateCustomSuccessMetrics(pattern, answers, appAnalysis) {
    const audience = answers[2] || 'Users';
    const monetization = answers[3] || 'Subscription';
    
    const metrics = {
        userAcquisition: [],
        engagement: [],
        business: [],
        technical: []
    };
    
    // User acquisition metrics
    metrics.userAcquisition.push(
        'Monthly Active Users (MAU) > 1,000 within 6 months',
        'User acquisition cost (CAC) < $50 for organic channels',
        `${audience.toLowerCase()}-specific conversion rate > 15%`
    );
    
    // Engagement metrics based on app features  
    if (appAnalysis.features.includes('project-management')) {
        metrics.engagement.push(
            'Average projects per user > 3',
            'Daily active users (DAU) > 30% of MAU',
            'Project completion rate > 70%'
        );
    }
    
    if (appAnalysis.hasRealTime) {
        metrics.engagement.push(
            'Real-time session duration > 15 minutes',
            'Collaboration events per session > 5'
        );
    }
    
    if (appAnalysis.features.includes('chat')) {
        metrics.engagement.push(
            'Messages per active user per day > 10',
            'Channel participation rate > 60%'
        );
    }
    
    // Business metrics
    if (monetization.includes('Subscription')) {
        metrics.business.push(
            'Monthly Recurring Revenue (MRR) growth > 20%',
            'Customer Lifetime Value (LTV) > $500',
            'Churn rate < 5% monthly'
        );
    }
    
    metrics.business.push(
        'Net Promoter Score (NPS) > 50',
        'Customer support ticket resolution < 24 hours'
    );
    
    // Technical metrics
    metrics.technical.push(
        'Application uptime > 99.9%',
        'API response time < 200ms (95th percentile)',
        'Page load time < 2 seconds'
    );
    
    if (appAnalysis.hasRealTime) {
        metrics.technical.push('Real-time message latency < 100ms');
    }
    
    if (appAnalysis.needsAnalytics) {
        metrics.technical.push('Analytics query performance < 5 seconds');
    }
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">Success Metrics & KPIs</h5>
            <p class="text-gray-700 mb-4">
                Measurable objectives aligned with ${appAnalysis.complexity === 'high' ? 'enterprise' : 'growth'} goals 
                and ${audience.toLowerCase()} expectations.
            </p>
            
            <div class="grid md:grid-cols-2 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h6 class="font-bold text-blue-900 mb-3">User Acquisition</h6>
                    <ul class="space-y-2 text-sm text-blue-800">
                        ${metrics.userAcquisition.map(metric => `<li>• ${metric}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="bg-green-50 p-4 rounded-lg">
                    <h6 class="font-bold text-green-900 mb-3">User Engagement</h6>
                    <ul class="space-y-2 text-sm text-green-800">
                        ${metrics.engagement.map(metric => `<li>• ${metric}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h6 class="font-bold text-purple-900 mb-3">Business Metrics</h6>
                    <ul class="space-y-2 text-sm text-purple-800">
                        ${metrics.business.map(metric => `<li>• ${metric}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="bg-orange-50 p-4 rounded-lg">
                    <h6 class="font-bold text-orange-900 mb-3">Technical Performance</h6>
                    <ul class="space-y-2 text-sm text-orange-800">
                        ${metrics.technical.map(metric => `<li>• ${metric}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <h6 class="font-bold text-gray-900 mb-2">Measurement & Analytics</h6>
                <p class="text-sm text-gray-700">
                    ${appAnalysis.needsAnalytics ? 
                        'Built-in analytics dashboard provides real-time monitoring of all KPIs with automated alerts for threshold breaches.' :
                        'Integration with Google Analytics and Mixpanel for comprehensive user behavior tracking and conversion funnel analysis.'
                    }
                    Monthly metric reviews with stakeholders ensure continuous optimization and goal alignment.
                </p>
            </div>
        </div>
    `;
}

// Keep original functions as fallbacks
function generateExecutiveSummary(pattern, answers, patternType) {
    // Fallback to original implementation
    return generatePersonalizedExecutiveSummary(pattern, answers, { features: [], complexity: 'medium', description: answers[0] || '' });
}
                <li>Built on proven ${patternType.charAt(0).toUpperCase() + patternType.slice(1)} architecture patterns</li>
                <li>Designed for ${teamSize.toLowerCase()} execution with ${timeline.toLowerCase()} to market</li>
                <li>${getKeyDifferentiator(pattern, audience)}</li>
                <li>API-first approach enabling ecosystem growth</li>
            </ul>
            
            <h5 class="font-bold text-gray-900 mb-3">Success Criteria</h5>
            <p>
                Launch MVP within ${timeline} achieving 100+ early adopters, 
                ${getEngagementTarget(appType)} daily active usage, 
                and ${getRetentionTarget(monetization)} month-over-month retention.
            </p>
        </div>
    `;
}

// 2. Market Analysis Generator
function generateMarketAnalysis(pattern, answers) {
    const audience = answers[2] || 'Developers';
    const appType = answers[1] || 'SaaS Platform';
    
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Market Size</h5>
            <p class="text-gray-700">
                The ${audience.toLowerCase()} ${appType.toLowerCase()} market represents a 
                ${getMarketSize(audience)} total addressable market (TAM) growing at 
                ${getMarketGrowth(appType)} annually.
            </p>
            
            <h5 class="font-bold text-gray-900">Competitive Landscape</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${getCompetitors(pattern, appType).map(c => `<li>${c}</li>`).join('')}
            </ul>
            
            <h5 class="font-bold text-gray-900">Market Opportunity</h5>
            <p class="text-gray-700">
                ${getMarketOpportunity(pattern, audience, appType)}
            </p>
            
            <h5 class="font-bold text-gray-900">Go-to-Market Strategy</h5>
            <p class="text-gray-700">
                ${getGTMStrategy(audience, appType)}
            </p>
        </div>
    `;
}

// 3. User Personas Generator
function generateUserPersonas(audience) {
    const personas = getPersonasByAudience(audience || 'Developers');
    
    return `
        <div class="space-y-6">
            ${personas.map((persona, index) => `
                <div class="border-l-4 border-indigo-500 pl-4">
                    <h5 class="font-bold text-gray-900">${persona.name}</h5>
                    <p class="text-sm text-gray-600 mb-2">${persona.role}</p>
                    
                    <div class="space-y-2 text-gray-700">
                        <div><strong>Demographics:</strong> ${persona.demographics}</div>
                        <div><strong>Goals:</strong> ${persona.goals}</div>
                        <div><strong>Pain Points:</strong> ${persona.painPoints}</div>
                        <div><strong>Tech Savvy:</strong> ${persona.techLevel}</div>
                        <div><strong>Key Features Needed:</strong> ${persona.features}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 4. Detailed Features Generator
function generateDetailedFeatures(pattern, answers) {
    const features = pattern.coreFeatures;
    const audience = answers[2] || 'Developers';
    
    return `
        <div class="space-y-6">
            ${features.map((feature, index) => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h5 class="font-bold text-gray-900 mb-2">
                        ${index + 1}. ${feature}
                    </h5>
                    <div class="space-y-2 text-sm text-gray-700">
                        <p><strong>User Story:</strong> ${generateUserStory(feature, audience)}</p>
                        <p><strong>Acceptance Criteria:</strong></p>
                        <ul class="list-disc pl-5">
                            ${generateAcceptanceCriteria(feature).map(c => `<li>${c}</li>`).join('')}
                        </ul>
                        <p><strong>Priority:</strong> ${getPriority(index, pattern)}</p>
                        <p><strong>Effort:</strong> ${getEffortEstimate(feature)}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 5. Technical Architecture Generator
function generateTechnicalArchitecture(pattern, answers) {
    const teamSize = answers[5] || 'Solo Founder';
    const timeline = answers[4] || '3-6 months';
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">System Architecture</h5>
            <pre class="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs">
${generateArchitectureDiagram(pattern)}
            </pre>
            
            <h5 class="font-bold text-gray-900">Technology Stack</h5>
            <div class="space-y-3">
                <div><strong>Frontend:</strong> ${pattern.techStack.frontend}</div>
                <div><strong>Backend:</strong> ${pattern.techStack.backend}</div>
                <div><strong>Database:</strong> ${pattern.techStack.database}</div>
                <div><strong>Real-time:</strong> ${pattern.techStack.realtime}</div>
                <div><strong>Infrastructure:</strong> ${pattern.techStack.infrastructure}</div>
            </div>
            
            <h5 class="font-bold text-gray-900">Deployment Strategy</h5>
            <p class="text-gray-700">
                ${getDeploymentStrategy(teamSize, timeline, pattern)}
            </p>
            
            <h5 class="font-bold text-gray-900">Scalability Plan</h5>
            <p class="text-gray-700">
                ${getScalabilityPlan(pattern)}
            </p>
        </div>
    `;
}

// 6. Data Models Generator
function generateDataModels(pattern, appType) {
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Entity Relationship Diagram</h5>
            <pre class="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
${generateERDiagram(pattern, appType)}
            </pre>
            
            <h5 class="font-bold text-gray-900">Core Database Tables</h5>
            <div class="space-y-4">
                ${generateDatabaseTables(pattern, appType)}
            </div>
            
            <h5 class="font-bold text-gray-900">Indexing Strategy</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${generateIndexingStrategy(pattern).map(idx => `<li>${idx}</li>`).join('')}
            </ul>
        </div>
    `;
}

// 7. API Specifications Generator
function generateAPISpecifications(pattern, answers) {
    const monetization = answers[3] || 'Subscription';
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">RESTful API Endpoints</h5>
            <div class="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                <pre class="text-xs">${generateAPIEndpoints(pattern, monetization)}</pre>
            </div>
            
            <h5 class="font-bold text-gray-900">Authentication Strategy</h5>
            <p class="text-gray-700">
                JWT-based authentication with refresh tokens, OAuth2 social login support,
                API key authentication for programmatic access, rate limiting per tier.
            </p>
            
            <h5 class="font-bold text-gray-900">WebSocket Events</h5>
            <div class="bg-gray-100 p-4 rounded">
                <code class="text-xs">${generateWebSocketEvents(pattern)}</code>
            </div>
            
            <h5 class="font-bold text-gray-900">Rate Limiting</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Free tier: 100 requests/hour</li>
                <li>Pro tier: 1000 requests/hour</li>
                <li>Enterprise: Unlimited with fair use</li>
            </ul>
        </div>
    `;
}

// 8. User Flows Generator
function generateUserFlows(pattern, answers) {
    const audience = answers[2] || 'Developers';
    
    return `
        <div class="space-y-6">
            <h5 class="font-bold text-gray-900">Onboarding Flow</h5>
            <div class="bg-gray-50 p-4 rounded">
                <ol class="list-decimal pl-5 space-y-2 text-gray-700">
                    ${generateOnboardingSteps(pattern, audience).map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            
            <h5 class="font-bold text-gray-900">Core User Journey</h5>
            <div class="bg-gray-50 p-4 rounded">
                <ol class="list-decimal pl-5 space-y-2 text-gray-700">
                    ${generateCoreUserJourney(pattern).map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            
            <h5 class="font-bold text-gray-900">Error Handling</h5>
            <p class="text-gray-700">
                Comprehensive error handling with user-friendly messages, automatic retry mechanisms,
                fallback options, and detailed error logging for debugging.
            </p>
        </div>
    `;
}

// 9. Security Requirements Generator
function generateSecurityRequirements(pattern, answers) {
    const audience = answers[2] || 'Developers';
    const monetization = answers[3] || 'Subscription';
    
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Authentication & Authorization</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Multi-factor authentication (MFA) support</li>
                <li>Role-based access control (RBAC)</li>
                <li>Session management with secure cookies</li>
                <li>Password policy enforcement</li>
                ${monetization.includes('Enterprise') ? '<li>SSO/SAML integration</li>' : ''}
            </ul>
            
            <h5 class="font-bold text-gray-900">Data Protection</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>AES-256 encryption at rest</li>
                <li>TLS 1.3 for data in transit</li>
                <li>PII data masking and tokenization</li>
                <li>Regular security audits</li>
            </ul>
            
            <h5 class="font-bold text-gray-900">Compliance Requirements</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${generateComplianceRequirements(pattern, audience).map(req => `<li>${req}</li>`).join('')}
            </ul>
            
            <h5 class="font-bold text-gray-900">Security Monitoring</h5>
            <p class="text-gray-700">
                Real-time threat detection, automated security scanning, 
                incident response procedures, and security event logging.
            </p>
        </div>
    `;
}

// 10. Performance Requirements Generator
function generatePerformanceRequirements(answers) {
    const audience = answers[2] || 'Developers';
    const timeline = answers[4] || '3-6 months';
    
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Performance Targets</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Page load time: < 2 seconds (P90)</li>
                <li>API response time: < 200ms (P95)</li>
                <li>Real-time updates: < 100ms latency</li>
                <li>Concurrent users: ${getConcurrentUserTarget(audience)}</li>
            </ul>
            
            <h5 class="font-bold text-gray-900">Availability Requirements</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Uptime SLA: 99.9% (43.8 minutes downtime/month)</li>
                <li>Planned maintenance windows: 2 hours/month</li>
                <li>Disaster recovery: RPO 1 hour, RTO 4 hours</li>
            </ul>
            
            <h5 class="font-bold text-gray-900">Scalability Metrics</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Horizontal scaling capability</li>
                <li>Auto-scaling based on CPU/memory</li>
                <li>Database connection pooling</li>
                <li>CDN for static assets</li>
            </ul>
        </div>
    `;
}

// 11. Development Roadmap Generator
function generateRoadmap(timeline, teamSize, pattern) {
    const phases = getRoadmapPhases(timeline, teamSize, pattern);
    
    return `
        <div class="space-y-6">
            ${phases.map((phase, index) => `
                <div class="border-l-4 border-indigo-500 pl-4">
                    <h5 class="font-bold text-gray-900">Phase ${index + 1}: ${phase.name}</h5>
                    <p class="text-sm text-gray-600 mb-2">${phase.duration}</p>
                    
                    <h6 class="font-semibold text-gray-800 mt-2">Deliverables:</h6>
                    <ul class="list-disc pl-5 text-gray-700">
                        ${phase.deliverables.map(d => `<li>${d}</li>`).join('')}
                    </ul>
                    
                    <h6 class="font-semibold text-gray-800 mt-2">Success Criteria:</h6>
                    <ul class="list-disc pl-5 text-gray-700">
                        ${phase.successCriteria.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    `;
}

// 12. Success Metrics Generator
function generateSuccessMetrics(pattern, answers) {
    const appType = answers[1] || 'SaaS Platform';
    const monetization = answers[3] || 'Subscription';
    
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Key Performance Indicators (KPIs)</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${generateKPIs(appType, monetization).map(kpi => `<li>${kpi}</li>`).join('')}
            </ul>
            
            <h5 class="font-bold text-gray-900">User Engagement Metrics</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Daily Active Users (DAU) / Monthly Active Users (MAU)</li>
                <li>Average session duration: > 15 minutes</li>
                <li>Feature adoption rate: > 60% within first week</li>
                <li>User retention: ${getRetentionTarget(monetization)}</li>
            </ul>
            
            <h5 class="font-bold text-gray-900">Business Metrics</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${generateBusinessMetrics(monetization).map(metric => `<li>${metric}</li>`).join('')}
            </ul>
            
            <h5 class="font-bold text-gray-900">Technical Metrics</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>System uptime: > 99.9%</li>
                <li>API error rate: < 0.1%</li>
                <li>Average response time: < 200ms</li>
                <li>Code coverage: > 80%</li>
            </ul>
        </div>
    `;
}

// 13. Risk Analysis Generator
function generateRiskAnalysis(answers) {
    const timeline = answers[4] || '3-6 months';
    const teamSize = answers[5] || 'Solo Founder';
    
    const risks = identifyRisks(timeline, teamSize);
    
    return `
        <div class="space-y-6">
            ${risks.map(risk => `
                <div class="bg-red-50 p-4 rounded">
                    <h5 class="font-bold text-red-900">${risk.name}</h5>
                    <p class="text-red-800 text-sm mb-2">Impact: ${risk.impact} | Probability: ${risk.probability}</p>
                    
                    <div class="space-y-2">
                        <p class="text-gray-700"><strong>Description:</strong> ${risk.description}</p>
                        <p class="text-gray-700"><strong>Mitigation:</strong> ${risk.mitigation}</p>
                        <p class="text-gray-700"><strong>Contingency:</strong> ${risk.contingency}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 14. Testing Strategy Generator
function generateTestingStrategy(pattern) {
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Testing Pyramid</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li><strong>Unit Tests (70%):</strong> Jest/Vitest for frontend, Mocha/Jest for backend</li>
                <li><strong>Integration Tests (20%):</strong> API testing with Supertest, database testing</li>
                <li><strong>E2E Tests (10%):</strong> Playwright for critical user flows</li>
            </ul>
            
            <h5 class="font-bold text-gray-900">Testing Requirements</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>Minimum 80% code coverage</li>
                <li>All PRs must pass CI/CD pipeline</li>
                <li>Performance testing for critical endpoints</li>
                <li>Security testing with OWASP ZAP</li>
            </ul>
            
            <h5 class="font-bold text-gray-900">Quality Assurance Process</h5>
            <ol class="list-decimal pl-5 text-gray-700">
                <li>Developer testing on feature branch</li>
                <li>Code review by peer</li>
                <li>Automated test suite execution</li>
                <li>Manual QA for UI/UX</li>
                <li>User acceptance testing</li>
                <li>Performance & security validation</li>
            </ol>
        </div>
    `;
}

// 15. Post-Launch Strategy Generator
function generatePostLaunchStrategy(pattern, answers) {
    const monetization = answers[3] || 'Subscription';
    const audience = answers[2] || 'Developers';
    
    return `
        <div class="space-y-4">
            <h5 class="font-bold text-gray-900">Launch Strategy</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${generateLaunchStrategy(audience).map(item => `<li>${item}</li>`).join('')}
            </ul>
            
            <h5 class="font-bold text-gray-900">Growth Tactics</h5>
            <ul class="list-disc pl-5 text-gray-700">
                ${generateGrowthTactics(pattern, audience, monetization).map(tactic => `<li>${tactic}</li>`).join('')}
            </ul>
            
            <h5 class="font-bold text-gray-900">Feature Backlog</h5>
            <ol class="list-decimal pl-5 text-gray-700">
                ${generateFeatureBacklog(pattern).map(feature => `<li>${feature}</li>`).join('')}
            </ol>
            
            <h5 class="font-bold text-gray-900">Support Structure</h5>
            <ul class="list-disc pl-5 text-gray-700">
                <li>24/7 documentation and self-service</li>
                <li>Community forum and Discord</li>
                <li>Email support (Pro tier: 24h SLA)</li>
                <li>Priority support for Enterprise</li>
            </ul>
        </div>
    `;
}

// Helper Functions

function getMarketSize(audience) {
    const sizes = {
        'Developers': '$47.3B',
        'Business Users': '$123.5B',
        'Consumers': '$4.9T',
        'Enterprise': '$589B'
    };
    return sizes[audience] || '$50B+';
}

function getMarketGrowth(appType) {
    const growth = {
        'SaaS Platform': '17.5% CAGR',
        'E-commerce Platform': '14.7% CAGR',
        'Developer Tools': '22.1% CAGR',
        'Social Platform': '26.2% CAGR'
    };
    return growth[appType] || '15% CAGR';
}

function getRevenueProjection(monetization, audience) {
    if (monetization.includes('Subscription')) {
        return audience === 'Enterprise' ? '$5-10M' : '$1-3M';
    } else if (monetization.includes('Transaction')) {
        return '$2-5M';
    }
    return '$500K-2M';
}

function getKeyDifferentiator(pattern, audience) {
    if (audience === 'Developers') {
        return 'Developer-first API with comprehensive SDKs';
    } else if (audience === 'Enterprise') {
        return 'Enterprise-grade security and compliance';
    }
    return 'Intuitive user experience with zero learning curve';
}

function getEngagementTarget(appType) {
    const targets = {
        'SaaS Platform': '60%',
        'E-commerce Platform': '30%',
        'Developer Tools': '40%',
        'Social Platform': '70%'
    };
    return targets[appType] || '50%';
}

function getRetentionTarget(monetization) {
    if (monetization.includes('Subscription')) return '85%';
    if (monetization.includes('Freemium')) return '40%';
    return '30%';
}

function getCompetitors(pattern, appType) {
    const competitors = {
        'notion': ['Notion ($10B valuation)', 'Confluence (Atlassian)', 'Coda', 'Obsidian'],
        'stripe': ['Stripe ($95B)', 'Square', 'PayPal', 'Adyen'],
        'github': ['GitHub (Microsoft)', 'GitLab', 'Bitbucket', 'Gitea']
    };
    return competitors[Object.keys(competitors).find(key => pattern.name.toLowerCase().includes(key))] || 
           ['Competitor A (Market Leader)', 'Competitor B (Fast Follower)', 'Competitor C (Niche Player)'];
}

function getMarketOpportunity(pattern, audience, appType) {
    return `Despite strong competition, there's a significant opportunity in the 
            ${audience.toLowerCase()} segment for a ${appType.toLowerCase()} that 
            prioritizes user experience and modern architecture. Our ${pattern.name} 
            approach addresses unmet needs around collaboration, extensibility, and pricing.`;
}

function getGTMStrategy(audience, appType) {
    if (audience === 'Developers') {
        return 'Developer-led growth through open-source components, comprehensive documentation, free tier, and community building.';
    } else if (audience === 'Enterprise') {
        return 'Enterprise sales with pilot programs, compliance certifications, and white-glove onboarding.';
    }
    return 'Product-led growth with freemium model, viral loops, and content marketing.';
}

function getPersonasByAudience(audience) {
    const personaMap = {
        'Developers': [
            {
                name: 'Alex Chen',
                role: 'Senior Full-Stack Developer',
                demographics: '28-35 years, Urban, $120K+ income',
                goals: 'Ship features faster, reduce technical debt, automate workflows',
                painPoints: 'Context switching, documentation gaps, integration complexity',
                techLevel: 'Expert - comfortable with CLI, APIs, and complex systems',
                features: 'API access, CLI tools, GitHub integration, webhooks'
            },
            {
                name: 'Sarah Johnson',
                role: 'DevOps Engineer',
                demographics: '30-40 years, Remote, $130K+ income',
                goals: 'Streamline deployments, improve monitoring, ensure reliability',
                painPoints: 'Manual processes, alert fatigue, configuration drift',
                techLevel: 'Expert - infrastructure as code, automation',
                features: 'CI/CD integration, monitoring dashboards, audit logs'
            }
        ],
        'Business Users': [
            {
                name: 'Michael Roberts',
                role: 'Product Manager',
                demographics: '32-42 years, Urban/Suburban, $95K+ income',
                goals: 'Improve team productivity, track projects, make data-driven decisions',
                painPoints: 'Scattered information, poor visibility, manual reporting',
                techLevel: 'Intermediate - comfortable with SaaS tools',
                features: 'Dashboards, reporting, integrations, collaboration tools'
            },
            {
                name: 'Lisa Martinez',
                role: 'Operations Manager',
                demographics: '35-45 years, Suburban, $85K+ income',
                goals: 'Optimize processes, reduce costs, improve efficiency',
                painPoints: 'Manual workflows, data silos, lack of automation',
                techLevel: 'Intermediate - spreadsheet power user',
                features: 'Workflow automation, data import/export, templates'
            }
        ],
        'Consumers': [
            {
                name: 'Emma Wilson',
                role: 'Freelance Designer',
                demographics: '25-35 years, Urban, $60K+ income',
                goals: 'Organize projects, collaborate with clients, grow business',
                painPoints: 'Juggling multiple tools, client communication, invoicing',
                techLevel: 'Intermediate - mobile-first user',
                features: 'Mobile app, client portals, simple pricing'
            }
        ],
        'Enterprise': [
            {
                name: 'David Thompson',
                role: 'VP of Engineering',
                demographics: '40-55 years, Urban, $200K+ income',
                goals: 'Scale teams, ensure compliance, reduce risk',
                painPoints: 'Security concerns, vendor management, change management',
                techLevel: 'Strategic - focuses on business outcomes',
                features: 'SSO, compliance reports, SLAs, dedicated support'
            }
        ]
    };
    
    return personaMap[audience] || personaMap['Business Users'];
}

function generateUserStory(feature, audience) {
    const audienceLower = audience.toLowerCase();
    const storyTemplates = {
        'block-based editor': `As a ${audienceLower}, I want to create rich content using blocks so that I can organize information flexibly`,
        'real-time collab': `As a ${audienceLower}, I want to collaborate in real-time so that my team stays synchronized`,
        'payment processing': `As a ${audienceLower}, I want secure payment handling so that I can monetize effectively`,
        'git repository': `As a ${audienceLower}, I want version control so that I can track changes over time`
    };
    
    for (let key in storyTemplates) {
        if (feature.toLowerCase().includes(key)) {
            return storyTemplates[key];
        }
    }
    return `As a ${audienceLower}, I want ${feature.toLowerCase()} so that I can work more efficiently`;
}

function generateAcceptanceCriteria(feature) {
    const criteria = [
        `Feature is accessible and functional across all supported browsers`,
        `Performance meets or exceeds defined benchmarks`,
        `All edge cases are handled gracefully with appropriate error messages`,
        `Feature includes comprehensive logging and analytics`
    ];
    
    if (feature.toLowerCase().includes('real-time')) {
        criteria.push('Updates propagate to all clients within 100ms');
    }
    if (feature.toLowerCase().includes('api')) {
        criteria.push('API documentation is complete and accurate');
    }
    
    return criteria;
}

function getPriority(index, pattern) {
    if (index < 2) return 'P0 - Critical for MVP';
    if (index < 4) return 'P1 - Important for launch';
    return 'P2 - Nice to have';
}

function getEffortEstimate(feature) {
    if (feature.toLowerCase().includes('basic') || feature.toLowerCase().includes('simple')) {
        return 'Small (1-3 days)';
    }
    if (feature.toLowerCase().includes('complex') || feature.toLowerCase().includes('advanced')) {
        return 'Large (2-3 weeks)';
    }
    return 'Medium (1 week)';
}

function generateArchitectureDiagram(pattern) {
    return `
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Next.js   │  │    React    │  │  TailwindCSS │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼─────────────────┼────────────────┼───────────────┘
          │                 │                │
          └────────┬────────┴────────────────┘
                   │ HTTPS/WSS
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Rate Limiting│  │    Auth     │  │   Routing   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼─────────────────┼────────────────┼───────────────┘
          └────────┬────────┴────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Node.js   │  │   GraphQL   │  │  WebSocket  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼─────────────────┼────────────────┼───────────────┘
          └────────┬────────┴────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │     S3      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
    `;
}

function getDeploymentStrategy(teamSize, timeline, pattern) {
    if (teamSize === 'Solo Founder') {
        return 'Deploy to Vercel/Railway for simplicity. Use managed services (Supabase, Planetscale) to minimize DevOps overhead. Implement CI/CD with GitHub Actions.';
    }
    return 'Multi-environment deployment (dev, staging, prod) on AWS/GCP. Infrastructure as Code with Terraform. Blue-green deployments for zero downtime.';
}

function getScalabilityPlan(pattern) {
    return `Horizontal scaling with load balancers, database read replicas, 
            caching layer with Redis, CDN for static assets, 
            microservices architecture for independent scaling, 
            event-driven architecture for decoupling.`;
}

function generateERDiagram(pattern, appType) {
    return `
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    Users     │────┬────│  Workspaces  │────┬────│   Projects   │
├──────────────┤    │    ├──────────────┤    │    ├──────────────┤
│ id (PK)      │    │    │ id (PK)      │    │    │ id (PK)      │
│ email        │    │    │ name         │    │    │ name         │
│ password     │    └───<│ owner_id(FK) │    └───<│ workspace_id │
│ created_at   │         │ created_at   │         │ created_at   │
└──────────────┘         └──────────────┘         └──────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Sessions   │         │   Members    │         │   Content    │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ user_id (FK) │         │ user_id (FK) │         │ project_id   │
│ token        │         │ workspace_id │         │ type         │
│ expires_at   │         │ role         │         │ data (JSONB) │
└──────────────┘         └──────────────┘         └──────────────┘
    `;
}

function generateDatabaseTables(pattern, appType) {
    return `
        <div class="font-mono text-xs bg-gray-100 p-3 rounded">
            <div class="mb-4">
                <strong>Table: users</strong><br>
                - id: UUID PRIMARY KEY<br>
                - email: VARCHAR(255) UNIQUE NOT NULL<br>
                - password_hash: VARCHAR(255) NOT NULL<br>
                - full_name: VARCHAR(255)<br>
                - avatar_url: TEXT<br>
                - created_at: TIMESTAMP<br>
                - updated_at: TIMESTAMP
            </div>
            
            <div class="mb-4">
                <strong>Table: workspaces</strong><br>
                - id: UUID PRIMARY KEY<br>
                - name: VARCHAR(255) NOT NULL<br>
                - slug: VARCHAR(255) UNIQUE<br>
                - owner_id: UUID REFERENCES users(id)<br>
                - settings: JSONB<br>
                - created_at: TIMESTAMP
            </div>
            
            <div class="mb-4">
                <strong>Table: content</strong><br>
                - id: UUID PRIMARY KEY<br>
                - workspace_id: UUID REFERENCES workspaces(id)<br>
                - parent_id: UUID REFERENCES content(id)<br>
                - type: VARCHAR(50)<br>
                - title: TEXT<br>
                - body: JSONB<br>
                - metadata: JSONB<br>
                - created_at: TIMESTAMP<br>
                - updated_at: TIMESTAMP
            </div>
        </div>
    `;
}

function generateIndexingStrategy(pattern) {
    return [
        'Primary key indexes on all tables (automatic)',
        'Unique constraint on users.email',
        'Index on content.workspace_id for workspace queries',
        'Index on content.parent_id for hierarchical queries',
        'Composite index on (workspace_id, created_at) for sorted listings',
        'Full-text search index on content.title and content.body',
        'Index on sessions.token for auth lookups'
    ];
}

function generateAPIEndpoints(pattern, monetization) {
    return `
# Authentication
POST   /api/auth/register       # User registration
POST   /api/auth/login          # User login
POST   /api/auth/refresh        # Refresh JWT token
POST   /api/auth/logout         # User logout
POST   /api/auth/forgot         # Password reset request

# Users
GET    /api/users/me            # Get current user
PUT    /api/users/me            # Update current user
DELETE /api/users/me            # Delete account
GET    /api/users/:id           # Get user by ID

# Workspaces
GET    /api/workspaces          # List user workspaces
POST   /api/workspaces          # Create workspace
GET    /api/workspaces/:id      # Get workspace
PUT    /api/workspaces/:id      # Update workspace
DELETE /api/workspaces/:id      # Delete workspace

# Content
GET    /api/content             # List content (paginated)
POST   /api/content             # Create content
GET    /api/content/:id         # Get content by ID
PUT    /api/content/:id         # Update content
DELETE /api/content/:id         # Delete content
POST   /api/content/:id/duplicate # Duplicate content

# Collaboration
GET    /api/content/:id/collaborators  # List collaborators
POST   /api/content/:id/share          # Share content
WS     /api/content/:id/subscribe      # Real-time updates

${monetization.includes('Subscription') ? `
# Billing
GET    /api/billing/plans       # List available plans
POST   /api/billing/subscribe   # Create subscription
PUT    /api/billing/subscription # Update subscription
DELETE /api/billing/subscription # Cancel subscription
GET    /api/billing/invoices    # List invoices
` : ''}
    `;
}

function generateWebSocketEvents(pattern) {
    return `
// Client -> Server
socket.emit('join-workspace', { workspaceId })
socket.emit('leave-workspace', { workspaceId })
socket.emit('content-change', { contentId, changes })
socket.emit('cursor-position', { contentId, position })
socket.emit('user-presence', { status })

// Server -> Client
socket.on('content-updated', { contentId, changes, userId })
socket.on('user-joined', { userId, userInfo })
socket.on('user-left', { userId })
socket.on('cursor-moved', { userId, position })
socket.on('presence-updated', { userId, status })
    `;
}

function generateComplianceRequirements(pattern, audience) {
    const requirements = ['GDPR compliance for EU users', 'CCPA compliance for California users'];
    
    if (audience === 'Enterprise') {
        requirements.push('SOC 2 Type II certification');
        requirements.push('ISO 27001 certification');
    }
    
    if (pattern.name.includes('Stripe')) {
        requirements.push('PCI DSS Level 1 compliance');
    }
    
    requirements.push('Regular penetration testing');
    requirements.push('Data residency options');
    
    return requirements;
}

function getConcurrentUserTarget(audience) {
    const targets = {
        'Developers': '10,000+',
        'Business Users': '50,000+',
        'Consumers': '100,000+',
        'Enterprise': '25,000+'
    };
    return targets[audience] || '10,000+';
}

function getRoadmapPhases(timeline, teamSize, pattern) {
    const phases = [];
    
    if (timeline === '1-3 months') {
        phases.push({
            name: 'MVP Launch',
            duration: '6-8 weeks',
            deliverables: [
                'Core authentication system',
                'Basic CRUD operations',
                'Essential UI components',
                'Deployment pipeline'
            ],
            successCriteria: [
                'System handles 100 concurrent users',
                'Core features working end-to-end',
                '90% unit test coverage'
            ]
        });
        phases.push({
            name: 'Early Access',
            duration: '4-6 weeks',
            deliverables: [
                'User feedback integration',
                'Performance optimization',
                'Bug fixes and polish'
            ],
            successCriteria: [
                '50+ beta users onboarded',
                'NPS score > 7',
                'Critical bugs resolved'
            ]
        });
    } else if (timeline === '3-6 months') {
        phases.push({
            name: 'Foundation',
            duration: 'Month 1-2',
            deliverables: [
                'Authentication & authorization',
                'Core data models',
                'Basic UI framework',
                'CI/CD pipeline'
            ],
            successCriteria: [
                'Development environment stable',
                'Core architecture validated',
                'Automated testing in place'
            ]
        });
        phases.push({
            name: 'Core Features',
            duration: 'Month 3-4',
            deliverables: [
                pattern.coreFeatures.slice(0, 3),
                'API development',
                'Real-time features'
            ].flat(),
            successCriteria: [
                'Features working end-to-end',
                'API documentation complete',
                'Performance benchmarks met'
            ]
        });
        phases.push({
            name: 'Polish & Launch',
            duration: 'Month 5-6',
            deliverables: [
                'UI/UX refinement',
                'Performance optimization',
                'Security hardening',
                'Launch preparation'
            ],
            successCriteria: [
                'Load testing passed',
                'Security audit completed',
                '100+ beta users'
            ]
        });
    } else {
        // 6-12 months or longer
        phases.push({
            name: 'Research & Design',
            duration: 'Month 1-2',
            deliverables: [
                'Market research',
                'Technical architecture',
                'UI/UX designs',
                'Team formation'
            ],
            successCriteria: [
                'Architecture approved',
                'Designs validated',
                'Team hired'
            ]
        });
        phases.push({
            name: 'Alpha Development',
            duration: 'Month 3-6',
            deliverables: [
                'Core platform',
                'Essential features',
                'Internal testing'
            ],
            successCriteria: [
                'Alpha version functional',
                'Internal dogfooding',
                'Architecture proven'
            ]
        });
        phases.push({
            name: 'Beta Launch',
            duration: 'Month 7-9',
            deliverables: [
                'Public beta',
                'Feature completion',
                'Documentation'
            ],
            successCriteria: [
                '500+ beta users',
                'Product-market fit validated',
                'Revenue model tested'
            ]
        });
        phases.push({
            name: 'General Availability',
            duration: 'Month 10-12',
            deliverables: [
                'Production launch',
                'Marketing campaign',
                'Support system'
            ],
            successCriteria: [
                '1000+ users',
                'Revenue targets met',
                '99.9% uptime'
            ]
        });
    }
    
    return phases;
}

function generateKPIs(appType, monetization) {
    const kpis = ['User acquisition cost (CAC) < $50', 'Customer lifetime value (LTV) > $500'];
    
    if (monetization.includes('Subscription')) {
        kpis.push('Monthly recurring revenue (MRR) growth > 20%');
        kpis.push('Churn rate < 5% monthly');
    }
    
    if (appType === 'E-commerce Platform') {
        kpis.push('Gross merchandise value (GMV)');
        kpis.push('Average order value (AOV) > $75');
    }
    
    kpis.push('Net Promoter Score (NPS) > 40');
    kpis.push('Customer satisfaction (CSAT) > 4.5/5');
    
    return kpis;
}

function generateBusinessMetrics(monetization) {
    const metrics = [];
    
    if (monetization.includes('Subscription')) {
        metrics.push('Annual recurring revenue (ARR)');
        metrics.push('Average revenue per user (ARPU)');
        metrics.push('Expansion revenue rate > 120%');
    } else if (monetization.includes('Transaction')) {
        metrics.push('Transaction volume growth');
        metrics.push('Take rate optimization');
        metrics.push('Payment success rate > 95%');
    }
    
    metrics.push('Gross margin > 70%');
    metrics.push('Burn rate < $50K/month');
    metrics.push('Runway > 18 months');
    
    return metrics;
}

function identifyRisks(timeline, teamSize) {
    const risks = [];
    
    if (teamSize === 'Solo Founder') {
        risks.push({
            name: 'Resource Constraints',
            impact: 'High',
            probability: 'High',
            description: 'Limited bandwidth to handle all aspects of development and business',
            mitigation: 'Focus on MVP features, leverage no-code tools, consider co-founder',
            contingency: 'Hire contractors for critical skills, extend timeline if needed'
        });
    }
    
    if (timeline === '1-3 months') {
        risks.push({
            name: 'Timeline Risk',
            impact: 'High',
            probability: 'Medium',
            description: 'Aggressive timeline may compromise quality or feature completeness',
            mitigation: 'Strictly prioritize MVP features, use proven technologies',
            contingency: 'Prepare stakeholders for potential 30-day extension'
        });
    }
    
    risks.push({
        name: 'Technical Debt',
        impact: 'Medium',
        probability: 'Medium',
        description: 'Rapid development may accumulate technical debt',
        mitigation: 'Allocate 20% time for refactoring, maintain test coverage',
        contingency: 'Schedule debt paydown sprints post-launch'
    });
    
    risks.push({
        name: 'Market Competition',
        impact: 'High',
        probability: 'Low',
        description: 'Established competitor may release similar features',
        mitigation: 'Focus on unique differentiators, move fast',
        contingency: 'Pivot to underserved niche if needed'
    });
    
    return risks;
}

function generateLaunchStrategy(audience) {
    const strategies = {
        'Developers': [
            'Launch on Product Hunt and Hacker News',
            'Open source key components',
            'Developer documentation and tutorials',
            'Free tier with generous limits'
        ],
        'Business Users': [
            'LinkedIn marketing campaign',
            'Webinars and case studies',
            'Partner with consultants',
            'Free trial with onboarding'
        ],
        'Enterprise': [
            'Direct sales outreach',
            'Pilot programs with design partners',
            'Compliance certifications',
            'White-glove onboarding'
        ]
    };
    
    return strategies[audience] || strategies['Business Users'];
}

function generateGrowthTactics(pattern, audience, monetization) {
    const tactics = [
        'Content marketing with SEO-optimized blog',
        'Referral program with incentives',
        'Strategic partnerships',
        'Community building (Discord/Slack)'
    ];
    
    if (audience === 'Developers') {
        tactics.push('Technical documentation and API guides');
        tactics.push('Hackathons and bounty programs');
    }
    
    if (monetization.includes('Freemium')) {
        tactics.push('Viral loops in product');
        tactics.push('Usage-based upgrade prompts');
    }
    
    return tactics;
}

function generateFeatureBacklog(pattern) {
    return [
        'Advanced collaboration features',
        'Mobile applications (iOS/Android)',
        'Enterprise SSO and SAML',
        'Advanced analytics dashboard',
        'API v2 with GraphQL',
        'Marketplace for extensions',
        'AI-powered features',
        'Internationalization (i18n)',
        'Advanced automation workflows',
        'White-label options'
    ];
}

function generateOnboardingSteps(pattern, audience) {
    return [
        'Sign up with email or OAuth',
        'Verify email address',
        'Complete profile setup',
        'Interactive product tour',
        'Create first project/workspace',
        'Invite team members (optional)',
        'Configure initial settings',
        'Complete first core action',
        'Celebrate success with confetti'
    ];
}

function generateCoreUserJourney(pattern) {
    if (pattern.name.includes('Notion')) {
        return [
            'Land on workspace dashboard',
            'Create new page or select template',
            'Add content blocks (text, images, tables)',
            'Share with team members',
            'Collaborate in real-time',
            'Organize with nested pages',
            'Search and filter content',
            'Export or publish'
        ];
    } else if (pattern.name.includes('Stripe')) {
        return [
            'Access developer dashboard',
            'Generate API keys',
            'Integrate payment SDK',
            'Test in sandbox mode',
            'Process first payment',
            'View transaction details',
            'Configure webhooks',
            'Go live with production'
        ];
    }
    return [
        'Access main dashboard',
        'Initiate primary action',
        'Configure options',
        'Review and confirm',
        'Monitor progress',
        'View results',
        'Share or export',
        'Iterate and improve'
    ];
}

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.PRDGenerator = {
        generateComprehensivePRD,
        patternConfigs
    };
}