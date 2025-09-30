// davila7 Claude Code Templates Data
// Source: https://aitmpl.com - Top 20 most popular templates
// Research completed: September 30, 2025

const davila7Templates = [
    // Top AI Agents from davila7
    {
        id: 'davila7-frontend-developer',
        name: 'Frontend Developer',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Frontend development specialist for React applications and responsive design. Use PROACTIVELY for UI components, state management, and performance optimization.',
        tags: ['React', 'TypeScript', 'CSS', 'Responsive'],
        stats: { rating: 4.9, downloads: 2300, comments: 45 },
        command: 'npx claude-code-templates@latest --agent=development-team/frontend-developer --yes',
        features: [
            'React component architecture specialist',
            'Responsive CSS and mobile-first design',
            'TypeScript integration and type safety',
            'Performance optimization techniques',
            'Accessibility implementation guidance'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'trending'
    },
    {
        id: 'davila7-code-reviewer',
        name: 'Code Reviewer',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Expert code review specialist for quality, security, and maintainability. Use PROACTIVELY after writing or modifying code.',
        tags: ['Code Quality', 'Security', 'Review', 'Best Practices'],
        stats: { rating: 4.8, downloads: 2000, comments: 38 },
        command: 'npx claude-code-templates@latest --agent=development-tools/code-reviewer --yes',
        features: [
            'Automated code quality analysis',
            'Security vulnerability detection',
            'Performance bottleneck identification',
            'Best practices enforcement',
            'Technical debt assessment'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'trending'
    },
    {
        id: 'davila7-backend-architect',
        name: 'Backend Architect',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Backend system architecture and API design specialist. Use PROACTIVELY for RESTful APIs, microservice boundaries, and database design.',
        tags: ['API Design', 'Architecture', 'Microservices', 'Database'],
        stats: { rating: 4.9, downloads: 1900, comments: 42 },
        command: 'npx claude-code-templates@latest --agent=development-team/backend-architect --yes',
        features: [
            'RESTful API design patterns',
            'Microservices architecture guidance',
            'Database schema optimization',
            'Scalability planning',
            'Security architecture implementation'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'hot'
    },
    {
        id: 'davila7-ui-ux-designer',
        name: 'UI/UX Designer',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'UI/UX design specialist for user-centered design and interface systems. Use PROACTIVELY for user research, wireframes, and design systems.',
        tags: ['UI Design', 'UX Research', 'Wireframes', 'Design Systems'],
        stats: { rating: 4.7, downloads: 1800, comments: 35 },
        command: 'npx claude-code-templates@latest --agent=development-team/ui-ux-designer --yes',
        features: [
            'User-centered design methodology',
            'Wireframe and prototype creation',
            'Design system development',
            'Accessibility compliance',
            'User research and testing'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'hot'
    },
    {
        id: 'davila7-prompt-engineer',
        name: 'Prompt Engineer',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Expert prompt optimization for LLMs and AI systems. Use PROACTIVELY when building AI features, improving agent performance, and optimizing AI workflows.',
        tags: ['AI', 'LLM', 'Prompt Optimization', 'Machine Learning'],
        stats: { rating: 4.8, downloads: 1600, comments: 29 },
        command: 'npx claude-code-templates@latest --agent=ai-specialists/prompt-engineer --yes',
        features: [
            'Advanced prompt engineering techniques',
            'LLM optimization strategies',
            'AI workflow design',
            'Performance measurement and tuning',
            'Multi-model prompt adaptation'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'new'
    },
    {
        id: 'davila7-fullstack-developer',
        name: 'Fullstack Developer',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Full-stack development specialist covering frontend, backend, and database technologies. Use PROACTIVELY for end-to-end application development.',
        tags: ['Full Stack', 'React', 'Node.js', 'Database'],
        stats: { rating: 4.6, downloads: 1300, comments: 31 },
        command: 'npx claude-code-templates@latest --agent=development-team/fullstack-developer --yes',
        features: [
            'End-to-end application development',
            'Frontend and backend integration',
            'Database design and optimization',
            'DevOps and deployment strategies',
            'Modern stack expertise'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-debugger',
        name: 'Debugger',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Debugging specialist for errors, test failures, and unexpected behavior. Use PROACTIVELY when encountering issues, analyzing logs, and troubleshooting problems.',
        tags: ['Debugging', 'Testing', 'Error Analysis', 'Troubleshooting'],
        stats: { rating: 4.7, downloads: 1100, comments: 28 },
        command: 'npx claude-code-templates@latest --agent=development-tools/debugger --yes',
        features: [
            'Systematic debugging methodology',
            'Log analysis and pattern recognition',
            'Test failure investigation',
            'Performance issue identification',
            'Root cause analysis'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-python-pro',
        name: 'Python Pro',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Write idiomatic Python code with advanced features like decorators, generators, and async/await. Optimizes performance and follows best practices.',
        tags: ['Python', 'Advanced', 'Performance', 'Best Practices'],
        stats: { rating: 4.8, downloads: 990, comments: 24 },
        command: 'npx claude-code-templates@latest --agent=programming-languages/python-pro --yes',
        features: [
            'Advanced Python patterns and idioms',
            'Async/await and concurrency',
            'Performance optimization techniques',
            'Modern Python features (3.9+)',
            'Testing and debugging strategies'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-github-integration',
        name: 'GitHub Integration',
        category: 'MCP INTEGRATIONS',
        categorySlug: 'mcp',
        description: 'Complete GitHub API integration for repository management, issue tracking, and automation workflows.',
        tags: ['GitHub', 'API', 'Automation', 'CI/CD'],
        stats: { rating: 4.6, downloads: 850, comments: 22 },
        command: 'npx claude-code-templates@latest --mcp=github-integration --yes',
        features: [
            'Repository management automation',
            'Issue and PR tracking',
            'GitHub Actions integration',
            'Webhook handling',
            'Team collaboration tools'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-test-generator',
        name: 'Test Generator',
        category: 'QUICK COMMANDS',
        categorySlug: 'commands',
        description: 'Intelligent test generation for multiple frameworks and testing patterns. Creates comprehensive test suites automatically.',
        tags: ['Testing', 'Automation', 'Jest', 'Pytest'],
        stats: { rating: 4.7, downloads: 780, comments: 19 },
        command: 'npx claude-code-templates@latest --command=generate-tests --yes',
        features: [
            'Multi-framework test generation',
            'Unit and integration test creation',
            'Mock and fixture generation',
            'Coverage optimization',
            'Test automation setup'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'new'
    },
    {
        id: 'davila7-database-architect',
        name: 'Database Architect',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Database architecture and design specialist. Use PROACTIVELY for database design decisions, data modeling, scalability, and optimization.',
        tags: ['Database', 'SQL', 'NoSQL', 'Performance'],
        stats: { rating: 4.8, downloads: 752, comments: 17 },
        command: 'npx claude-code-templates@latest --agent=database/database-architect --yes',
        features: [
            'Database schema design',
            'Query optimization',
            'Scalability planning',
            'Migration strategies',
            'Performance tuning'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-typescript-pro',
        name: 'TypeScript Pro',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Write idiomatic TypeScript with advanced type system features, strict typing, and modern patterns. Masters generic constraints and utility types.',
        tags: ['TypeScript', 'Types', 'Advanced', 'Modern'],
        stats: { rating: 4.9, downloads: 697, comments: 15 },
        command: 'npx claude-code-templates@latest --agent=programming-languages/typescript-pro --yes',
        features: [
            'Advanced TypeScript patterns',
            'Generic constraints and utility types',
            'Strict typing best practices',
            'Modern ES features integration',
            'Type-safe API design'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'hot'
    },
    {
        id: 'davila7-postgresql-mcp',
        name: 'PostgreSQL Integration',
        category: 'MCP INTEGRATIONS',
        categorySlug: 'mcp',
        description: 'Complete PostgreSQL database integration with query optimization, schema management, and performance monitoring.',
        tags: ['PostgreSQL', 'Database', 'SQL', 'Performance'],
        stats: { rating: 4.7, downloads: 643, comments: 13 },
        command: 'npx claude-code-templates@latest --mcp=postgresql-integration --yes',
        features: [
            'Database connection management',
            'Query optimization tools',
            'Schema migration utilities',
            'Performance monitoring',
            'Backup and recovery automation'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-security-auditor',
        name: 'Security Auditor',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Comprehensive security analysis and vulnerability assessment specialist. Identifies security risks and provides remediation strategies.',
        tags: ['Security', 'Audit', 'Vulnerability', 'Compliance'],
        stats: { rating: 4.8, downloads: 612, comments: 11 },
        command: 'npx claude-code-templates@latest --agent=security/security-auditor --yes',
        features: [
            'Vulnerability scanning and assessment',
            'Security best practices enforcement',
            'Compliance checking',
            'Threat modeling',
            'Security documentation'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'new'
    },
    {
        id: 'davila7-api-documenter',
        name: 'API Documenter',
        category: 'AI AGENTS',
        categorySlug: 'ai-agents',
        description: 'Create OpenAPI/Swagger specs, generate SDKs, and write developer documentation. Handles versioning, examples, and interactive docs.',
        tags: ['Documentation', 'API', 'OpenAPI', 'Swagger'],
        stats: { rating: 4.6, downloads: 587, comments: 9 },
        command: 'npx claude-code-templates@latest --agent=documentation/api-documenter --yes',
        features: [
            'OpenAPI specification generation',
            'Interactive documentation',
            'SDK generation automation',
            'Version management',
            'Example generation'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-performance-monitor',
        name: 'Performance Monitor',
        category: 'SMART HOOKS',
        categorySlug: 'hooks',
        description: 'Automated performance monitoring and optimization suggestions. Tracks metrics and identifies bottlenecks in real-time.',
        tags: ['Performance', 'Monitoring', 'Optimization', 'Metrics'],
        stats: { rating: 4.7, downloads: 548, comments: 8 },
        command: 'npx claude-code-templates@latest --hook=performance-monitor --yes',
        features: [
            'Real-time performance tracking',
            'Bottleneck identification',
            'Optimization recommendations',
            'Metric visualization',
            'Alert system integration'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'new'
    },
    {
        id: 'davila7-stripe-integration',
        name: 'Stripe Integration',
        category: 'MCP INTEGRATIONS',
        categorySlug: 'mcp',
        description: 'Complete Stripe payment processing integration with subscription management, webhook handling, and financial reporting.',
        tags: ['Stripe', 'Payments', 'Subscriptions', 'E-commerce'],
        stats: { rating: 4.8, downloads: 521, comments: 7 },
        command: 'npx claude-code-templates@latest --mcp=stripe-integration --yes',
        features: [
            'Payment processing automation',
            'Subscription management',
            'Webhook integration',
            'Financial reporting',
            'PCI compliance helpers'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'hot'
    },
    {
        id: 'davila7-pre-commit-hooks',
        name: 'Pre-commit Validation',
        category: 'SMART HOOKS',
        categorySlug: 'hooks',
        description: 'Comprehensive pre-commit validation including linting, testing, security checks, and code formatting.',
        tags: ['Git Hooks', 'Validation', 'Quality', 'Automation'],
        stats: { rating: 4.9, downloads: 498, comments: 6 },
        command: 'npx claude-code-templates@latest --hook=pre-commit-validation --yes',
        features: [
            'Automated code quality checks',
            'Security vulnerability scanning',
            'Test execution before commits',
            'Code formatting enforcement',
            'Custom validation rules'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'trending'
    },
    {
        id: 'davila7-aws-integration',
        name: 'AWS Integration',
        category: 'MCP INTEGRATIONS',
        categorySlug: 'mcp',
        description: 'Comprehensive AWS cloud services integration including S3, Lambda, DynamoDB, and deployment automation.',
        tags: ['AWS', 'Cloud', 'Lambda', 'S3'],
        stats: { rating: 4.7, downloads: 467, comments: 5 },
        command: 'npx claude-code-templates@latest --mcp=aws-integration --yes',
        features: [
            'AWS service integration',
            'Lambda function management',
            'S3 storage automation',
            'DynamoDB operations',
            'CloudFormation templates'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'stable'
    },
    {
        id: 'davila7-code-optimizer',
        name: 'Code Optimizer',
        category: 'IDE CONFIG',
        categorySlug: 'ide',
        description: 'Advanced code optimization settings for Claude Code including performance tuning, memory management, and response quality.',
        tags: ['Optimization', 'Performance', 'Configuration', 'Settings'],
        stats: { rating: 4.8, downloads: 445, comments: 4 },
        command: 'npx claude-code-templates@latest --setting=code-optimizer --yes',
        features: [
            'Performance optimization settings',
            'Memory usage optimization',
            'Response quality tuning',
            'Context management',
            'Timeout configuration'
        ],
        source: 'davila7/claude-code-templates',
        popularity: 'new'
    }
];

// Export for integration into CoderOne templates
if (typeof module !== 'undefined' && module.exports) {
    module.exports = davila7Templates;
}

// Global assignment for browser environments
if (typeof window !== 'undefined') {
    window.davila7Templates = davila7Templates;
}