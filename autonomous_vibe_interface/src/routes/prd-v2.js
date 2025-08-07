const express = require('express');
const router = express.Router();

/**
 * PRD Generator V2 - Enhanced with 8-Step Method
 * Generates comprehensive, AI-optimized specifications
 */

// Dynamic question bank based on project type and depth
const questionBank = {
    universal: {
        initial: [
            {
                id: 'project-description',
                question: 'What are you building? Describe your project in a few sentences.',
                type: 'open',
                required: true
            },
            {
                id: 'target-audience',
                question: 'Who is your primary target audience and what problem are you solving for them?',
                type: 'open',
                required: true
            },
            {
                id: 'core-features',
                question: 'What are the 3-5 must-have features for your MVP?',
                type: 'list',
                required: true
            },
            {
                id: 'timeline',
                question: 'What is your timeline? (MVP in weeks/months)',
                type: 'structured',
                required: true
            },
            {
                id: 'design-preference',
                question: 'What design style do you prefer?',
                type: 'choice',
                options: ['Minimal', 'Modern', 'Bold', 'Professional', 'Playful'],
                required: true
            }
        ],
        followUp: [
            {
                id: 'technical-constraints',
                question: 'Are there any technical constraints or existing systems to integrate with?',
                type: 'open'
            },
            {
                id: 'compliance',
                question: 'Any compliance requirements? (GDPR, HIPAA, PCI, etc.)',
                type: 'open'
            }
        ]
    },
    
    saas: [
        {
            id: 'business-model',
            question: 'Is this B2B or B2C?',
            type: 'choice',
            options: ['B2B', 'B2C', 'Both']
        },
        {
            id: 'subscription-model',
            question: 'Will you offer free trials or freemium?',
            type: 'choice',
            options: ['Free trial', 'Freemium', 'Paid only', 'Both']
        },
        {
            id: 'team-features',
            question: 'Will users work in teams/organizations?',
            type: 'boolean'
        }
    ],
    
    ecommerce: [
        {
            id: 'product-types',
            question: 'What types of products will you sell?',
            type: 'open'
        },
        {
            id: 'inventory-size',
            question: 'How many products/SKUs do you expect?',
            type: 'choice',
            options: ['< 100', '100-1000', '1000-10000', '10000+']
        },
        {
            id: 'payment-methods',
            question: 'Which payment methods do you need?',
            type: 'multiselect',
            options: ['Credit Card', 'PayPal', 'Apple Pay', 'Crypto', 'Buy Now Pay Later']
        }
    ],
    
    marketplace: [
        {
            id: 'marketplace-type',
            question: 'What type of marketplace?',
            type: 'choice',
            options: ['B2B', 'B2C', 'C2C', 'Service marketplace']
        },
        {
            id: 'revenue-model',
            question: 'How will you make money?',
            type: 'multiselect',
            options: ['Transaction fees', 'Subscription', 'Listing fees', 'Premium features']
        }
    ],
    
    mobile: [
        {
            id: 'platform',
            question: 'Which platforms?',
            type: 'multiselect',
            options: ['iOS', 'Android', 'Web app']
        },
        {
            id: 'offline-needs',
            question: 'Does the app need to work offline?',
            type: 'boolean'
        },
        {
            id: 'device-features',
            question: 'Which device features will you use?',
            type: 'multiselect',
            options: ['Camera', 'GPS', 'Push notifications', 'Biometric auth', 'NFC/Bluetooth']
        }
    ]
};

// Inference engine - extracts technical requirements from simple answers
class InferenceEngine {
    static analyze(projectType, answers) {
        const inferences = {
            technical: [],
            security: [],
            infrastructure: [],
            features: [],
            integrations: []
        };
        
        // Universal inferences
        answers.forEach(answer => {
            // Payment processing inference
            if (answer.answer && answer.answer.toLowerCase().includes('payment')) {
                inferences.integrations.push('Stripe or PayPal integration');
                inferences.security.push('PCI DSS compliance required');
            }
            
            // User accounts inference
            if (answer.answer && (answer.answer.toLowerCase().includes('user') || 
                answer.answer.toLowerCase().includes('account'))) {
                inferences.features.push('Authentication system');
                inferences.security.push('Secure password handling');
                inferences.technical.push('JWT or session management');
            }
            
            // Scale inference
            if (answer.questionId === 'inventory-size' && 
                (answer.answer === '10000+' || answer.answer === '1000-10000')) {
                inferences.infrastructure.push('CDN for images');
                inferences.technical.push('Database indexing optimization');
                inferences.features.push('Advanced search and filtering');
            }
            
            // Compliance inference
            if (answer.answer && answer.answer.toLowerCase().includes('gdpr')) {
                inferences.security.push('GDPR compliance implementation');
                inferences.features.push('Cookie consent management');
                inferences.features.push('Data export/deletion capabilities');
            }
            
            // Team features inference
            if (answer.questionId === 'team-features' && answer.answer === true) {
                inferences.features.push('Role-based access control');
                inferences.features.push('Team invitation system');
                inferences.features.push('Activity audit logs');
            }
        });
        
        // Project-specific inferences
        if (projectType === 'ecommerce') {
            inferences.features.push('Shopping cart functionality');
            inferences.features.push('Product catalog management');
            inferences.features.push('Order tracking');
            inferences.integrations.push('Shipping calculator API');
            inferences.technical.push('Image optimization pipeline');
            inferences.security.push('Secure checkout process');
        }
        
        if (projectType === 'saas') {
            inferences.features.push('Subscription billing');
            inferences.features.push('Usage analytics dashboard');
            inferences.integrations.push('Email service (SendGrid/Postmark)');
            inferences.technical.push('Multi-tenant architecture');
            inferences.infrastructure.push('Auto-scaling configuration');
        }
        
        if (projectType === 'marketplace') {
            inferences.features.push('Two-sided onboarding');
            inferences.features.push('Review and rating system');
            inferences.features.push('Dispute resolution workflow');
            inferences.security.push('Fraud detection mechanisms');
            inferences.technical.push('Real-time notifications');
        }
        
        return inferences;
    }
}

// Design system generator based on preference
class DesignSystemGenerator {
    static generate(preference = 'Modern') {
        const systems = {
            Minimal: {
                colors: {
                    primary: '#000000',
                    secondary: '#666666',
                    background: '#FFFFFF',
                    surface: '#F8F8F8',
                    text: '#000000',
                    muted: '#999999',
                    border: '#E0E0E0'
                },
                typography: {
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    headingSizes: ['2.5rem', '2rem', '1.5rem', '1.25rem', '1rem'],
                    bodySize: '1rem',
                    lineHeight: 1.6
                },
                spacing: {
                    unit: 8,
                    scale: [0, 4, 8, 16, 24, 32, 48, 64, 96]
                },
                borderRadius: {
                    small: '2px',
                    medium: '4px',
                    large: '8px'
                }
            },
            
            Modern: {
                colors: {
                    primary: '#6366F1',
                    secondary: '#8B5CF6',
                    background: '#FFFFFF',
                    surface: '#F9FAFB',
                    text: '#111827',
                    muted: '#6B7280',
                    border: '#E5E7EB',
                    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                },
                typography: {
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    headingSizes: ['3rem', '2.25rem', '1.875rem', '1.5rem', '1.25rem'],
                    bodySize: '1rem',
                    lineHeight: 1.5
                },
                spacing: {
                    unit: 8,
                    scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
                },
                borderRadius: {
                    small: '4px',
                    medium: '8px',
                    large: '12px',
                    xl: '16px'
                },
                shadows: {
                    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }
            },
            
            Bold: {
                colors: {
                    primary: '#DC2626',
                    secondary: '#FBBF24',
                    background: '#000000',
                    surface: '#1A1A1A',
                    text: '#FFFFFF',
                    muted: '#A0A0A0',
                    border: '#333333',
                    accent: '#10B981'
                },
                typography: {
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    headingSizes: ['4rem', '3rem', '2.25rem', '1.875rem', '1.5rem'],
                    bodySize: '1.125rem',
                    lineHeight: 1.4,
                    fontWeight: {
                        body: 400,
                        heading: 700
                    }
                },
                spacing: {
                    unit: 8,
                    scale: [0, 8, 16, 24, 32, 48, 64, 96, 128]
                },
                borderRadius: {
                    small: '0px',
                    medium: '2px',
                    large: '4px'
                }
            },
            
            Professional: {
                colors: {
                    primary: '#0F172A',
                    secondary: '#3B82F6',
                    background: '#FFFFFF',
                    surface: '#F8FAFC',
                    text: '#0F172A',
                    muted: '#64748B',
                    border: '#CBD5E1'
                },
                typography: {
                    fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
                    headingSizes: ['2.25rem', '1.875rem', '1.5rem', '1.25rem', '1.125rem'],
                    bodySize: '1rem',
                    lineHeight: 1.75
                },
                spacing: {
                    unit: 8,
                    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
                },
                borderRadius: {
                    small: '3px',
                    medium: '6px',
                    large: '8px'
                }
            },
            
            Playful: {
                colors: {
                    primary: '#EC4899',
                    secondary: '#8B5CF6',
                    background: '#FEF3F2',
                    surface: '#FFFFFF',
                    text: '#18181B',
                    muted: '#71717A',
                    border: '#FCA5A5',
                    gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)'
                },
                typography: {
                    fontFamily: "'Fredoka', 'Comic Neue', sans-serif",
                    headingSizes: ['3.5rem', '2.75rem', '2rem', '1.5rem', '1.25rem'],
                    bodySize: '1.125rem',
                    lineHeight: 1.7
                },
                spacing: {
                    unit: 8,
                    scale: [0, 8, 16, 24, 32, 48, 64, 96]
                },
                borderRadius: {
                    small: '12px',
                    medium: '16px',
                    large: '24px',
                    full: '9999px'
                }
            }
        };
        
        return systems[preference] || systems.Modern;
    }
}

// 8-Section PRD Generator
class PRDGenerator {
    static generate(projectData) {
        const {
            projectType,
            projectName,
            description,
            answers,
            inferences,
            designSystem
        } = projectData;
        
        return {
            metadata: {
                version: '2.0',
                generatedAt: new Date().toISOString(),
                projectName,
                projectType,
                aiOptimized: true
            },
            
            // Section 1: Executive Summary
            executiveSummary: this.generateExecutiveSummary(projectData),
            
            // Section 2: System Architecture
            systemArchitecture: this.generateSystemArchitecture(projectType, inferences),
            
            // Section 3: Feature Specifications
            featureSpecifications: this.generateFeatureSpecs(answers, inferences),
            
            // Section 4: Data Architecture
            dataArchitecture: this.generateDataArchitecture(projectType, answers),
            
            // Section 5: API Specifications
            apiSpecifications: this.generateAPISpecs(projectType, inferences),
            
            // Section 6: Security & Privacy
            securityPrivacy: this.generateSecuritySpecs(inferences, answers),
            
            // Section 7: UI Specifications
            uiSpecifications: {
                designSystem,
                wireframes: this.generateWireframeSpecs(projectType),
                userFlows: this.generateUserFlows(projectType, answers),
                accessibility: this.generateAccessibilitySpecs()
            },
            
            // Section 8: Infrastructure & Deployment
            infrastructure: this.generateInfrastructureSpecs(projectType, inferences)
        };
    }
    
    static generateExecutiveSummary(projectData) {
        const { projectName, description, answers, projectType } = projectData;
        
        // Extract key information
        const targetAudience = answers.find(a => a.questionId === 'target-audience')?.answer || 'general users';
        const timeline = answers.find(a => a.questionId === 'timeline')?.answer || '8-12 weeks';
        const coreFeatures = answers.find(a => a.questionId === 'core-features')?.answer || [];
        
        return {
            overview: `${projectName} is a ${projectType} solution designed to ${description}`,
            objectives: [
                `Deliver MVP within ${timeline}`,
                `Serve ${targetAudience} with intuitive user experience`,
                `Implement core features: ${Array.isArray(coreFeatures) ? coreFeatures.join(', ') : coreFeatures}`,
                'Ensure scalability for future growth',
                'Maintain high security and performance standards'
            ],
            keyDecisions: {
                architecture: `Modern ${projectType === 'mobile' ? 'mobile-first' : 'web-based'} architecture`,
                techStack: 'Next.js, Supabase, Prisma, Clerk Auth, Vercel deployment',
                approach: 'Agile development with iterative releases'
            },
            successCriteria: [
                'User adoption rate > 80% within first month',
                'Page load time < 3 seconds',
                'Zero critical security vulnerabilities',
                '99.9% uptime SLA'
            ]
        };
    }
    
    static generateSystemArchitecture(projectType, inferences) {
        const baseArchitecture = {
            overview: 'Modern, scalable microservices architecture with cloud-native design principles',
            
            components: [
                {
                    name: 'Frontend Application',
                    technology: 'Next.js 14 with App Router',
                    description: 'Server-side rendered React application with progressive enhancement',
                    responsibilities: [
                        'User interface rendering',
                        'Client-side state management (Zustand)',
                        'API integration',
                        'Real-time updates',
                        'PWA capabilities'
                    ]
                },
                {
                    name: 'Backend Services',
                    technology: 'Next.js Server Actions + API Routes',
                    description: 'Type-safe server functions with automatic validation',
                    responsibilities: [
                        'Business logic implementation',
                        'Data validation and processing',
                        'Authentication middleware',
                        'Rate limiting',
                        'Background job processing'
                    ]
                },
                {
                    name: 'Database Layer',
                    technology: 'PostgreSQL via Supabase',
                    description: 'Managed PostgreSQL with real-time subscriptions',
                    responsibilities: [
                        'Data persistence',
                        'ACID transactions',
                        'Full-text search',
                        'Row-level security',
                        'Real-time updates via websockets'
                    ]
                },
                {
                    name: 'Authentication Service',
                    technology: 'Clerk Auth',
                    description: 'Managed authentication with social providers',
                    responsibilities: [
                        'User authentication',
                        'Session management',
                        'Social login providers',
                        'MFA support',
                        'User profile management'
                    ]
                },
                {
                    name: 'File Storage',
                    technology: 'Supabase Storage / Vercel Blob',
                    description: 'Object storage for user uploads',
                    responsibilities: [
                        'File upload handling',
                        'Image optimization',
                        'CDN delivery',
                        'Access control'
                    ]
                }
            ],
            
            // Add project-specific components
            ...(projectType === 'ecommerce' ? {
                additionalComponents: [
                    {
                        name: 'Payment Processing',
                        technology: 'Stripe',
                        description: 'PCI-compliant payment processing'
                    },
                    {
                        name: 'Inventory Service',
                        technology: 'Custom microservice',
                        description: 'Real-time inventory tracking'
                    }
                ]
            } : {}),
            
            deploymentArchitecture: {
                platform: 'Vercel',
                regions: ['us-east-1', 'eu-west-1'],
                cdn: 'Vercel Edge Network',
                database: 'Supabase (AWS RDS)',
                monitoring: 'Vercel Analytics + Custom logging'
            }
        };
        
        return baseArchitecture;
    }
    
    static generateFeatureSpecs(answers, inferences) {
        const coreFeatures = answers.find(a => a.questionId === 'core-features')?.answer || [];
        const features = [];
        
        // Parse core features from user input
        const featureList = Array.isArray(coreFeatures) ? coreFeatures : 
                          coreFeatures.split(',').map(f => f.trim());
        
        featureList.forEach((feature, index) => {
            features.push({
                id: `F${index + 1}`,
                name: feature,
                description: `Implementation of ${feature} functionality`,
                userStories: this.generateUserStories(feature),
                acceptanceCriteria: this.generateAcceptanceCriteria(feature),
                technicalRequirements: this.generateTechnicalRequirements(feature),
                apiEndpoints: this.generateFeatureEndpoints(feature),
                dataModels: this.identifyDataModels(feature),
                uiComponents: this.identifyUIComponents(feature),
                edgeCases: this.identifyEdgeCases(feature),
                performanceRequirements: {
                    responseTime: '< 200ms',
                    throughput: '1000 requests/minute',
                    concurrent: '100 concurrent users'
                }
            });
        });
        
        // Add inferred features
        inferences.features.forEach(inferredFeature => {
            if (!features.find(f => f.name.toLowerCase().includes(inferredFeature.toLowerCase()))) {
                features.push({
                    id: `F${features.length + 1}`,
                    name: inferredFeature,
                    description: `Inferred requirement: ${inferredFeature}`,
                    priority: 'High',
                    source: 'Inferred from requirements'
                });
            }
        });
        
        return features;
    }
    
    static generateDataArchitecture(projectType, answers) {
        const models = [];
        
        // Universal models
        models.push({
            name: 'User',
            tableName: 'users',
            description: 'User account information synchronized with Clerk',
            fields: [
                { name: 'id', type: 'uuid', primaryKey: true },
                { name: 'clerk_id', type: 'string', unique: true, indexed: true },
                { name: 'email', type: 'string', unique: true, indexed: true },
                { name: 'name', type: 'string' },
                { name: 'avatar_url', type: 'string', nullable: true },
                { name: 'metadata', type: 'jsonb', nullable: true },
                { name: 'created_at', type: 'timestamp', default: 'now()' },
                { name: 'updated_at', type: 'timestamp', default: 'now()' }
            ],
            indexes: [
                { fields: ['email'], unique: true },
                { fields: ['clerk_id'], unique: true },
                { fields: ['created_at'] }
            ],
            relationships: []
        });
        
        // Project-specific models
        if (projectType === 'ecommerce') {
            models.push(
                {
                    name: 'Product',
                    tableName: 'products',
                    description: 'Product catalog',
                    fields: [
                        { name: 'id', type: 'uuid', primaryKey: true },
                        { name: 'name', type: 'string', indexed: true },
                        { name: 'slug', type: 'string', unique: true, indexed: true },
                        { name: 'description', type: 'text' },
                        { name: 'price', type: 'decimal(10,2)' },
                        { name: 'compare_at_price', type: 'decimal(10,2)', nullable: true },
                        { name: 'cost', type: 'decimal(10,2)', nullable: true },
                        { name: 'sku', type: 'string', unique: true },
                        { name: 'barcode', type: 'string', nullable: true },
                        { name: 'inventory_quantity', type: 'integer', default: 0 },
                        { name: 'weight', type: 'decimal(10,3)', nullable: true },
                        { name: 'status', type: 'enum', values: ['active', 'draft', 'archived'] },
                        { name: 'images', type: 'jsonb', default: '[]' },
                        { name: 'metadata', type: 'jsonb', nullable: true },
                        { name: 'created_at', type: 'timestamp', default: 'now()' },
                        { name: 'updated_at', type: 'timestamp', default: 'now()' }
                    ]
                },
                {
                    name: 'Order',
                    tableName: 'orders',
                    description: 'Customer orders',
                    fields: [
                        { name: 'id', type: 'uuid', primaryKey: true },
                        { name: 'order_number', type: 'string', unique: true },
                        { name: 'user_id', type: 'uuid', foreignKey: 'users.id' },
                        { name: 'status', type: 'enum', values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
                        { name: 'subtotal', type: 'decimal(10,2)' },
                        { name: 'tax', type: 'decimal(10,2)' },
                        { name: 'shipping', type: 'decimal(10,2)' },
                        { name: 'total', type: 'decimal(10,2)' },
                        { name: 'currency', type: 'string', default: 'USD' },
                        { name: 'payment_status', type: 'enum', values: ['pending', 'paid', 'failed', 'refunded'] },
                        { name: 'shipping_address', type: 'jsonb' },
                        { name: 'billing_address', type: 'jsonb' },
                        { name: 'created_at', type: 'timestamp', default: 'now()' }
                    ]
                }
            );
        }
        
        if (projectType === 'saas') {
            models.push(
                {
                    name: 'Organization',
                    tableName: 'organizations',
                    description: 'Team/organization accounts',
                    fields: [
                        { name: 'id', type: 'uuid', primaryKey: true },
                        { name: 'name', type: 'string' },
                        { name: 'slug', type: 'string', unique: true },
                        { name: 'owner_id', type: 'uuid', foreignKey: 'users.id' },
                        { name: 'subscription_tier', type: 'enum', values: ['free', 'starter', 'pro', 'enterprise'] },
                        { name: 'subscription_status', type: 'enum', values: ['active', 'past_due', 'cancelled'] },
                        { name: 'settings', type: 'jsonb' },
                        { name: 'created_at', type: 'timestamp', default: 'now()' }
                    ]
                },
                {
                    name: 'OrganizationMember',
                    tableName: 'organization_members',
                    description: 'Organization membership',
                    fields: [
                        { name: 'id', type: 'uuid', primaryKey: true },
                        { name: 'organization_id', type: 'uuid', foreignKey: 'organizations.id' },
                        { name: 'user_id', type: 'uuid', foreignKey: 'users.id' },
                        { name: 'role', type: 'enum', values: ['owner', 'admin', 'member', 'viewer'] },
                        { name: 'joined_at', type: 'timestamp', default: 'now()' }
                    ]
                }
            );
        }
        
        return {
            models,
            migrations: this.generateMigrations(models),
            seedData: this.generateSeedData(projectType)
        };
    }
    
    static generateAPISpecs(projectType, inferences) {
        const apis = [];
        
        // Authentication endpoints (universal)
        apis.push(
            {
                method: 'POST',
                path: '/api/auth/webhook',
                description: 'Clerk webhook for user sync',
                authentication: 'Webhook signature',
                request: {
                    headers: {
                        'svix-signature': 'string',
                        'svix-timestamp': 'string',
                        'svix-id': 'string'
                    },
                    body: {
                        type: 'user.created | user.updated | user.deleted',
                        data: 'ClerkUserObject'
                    }
                },
                response: {
                    success: { status: 200, body: { success: true } },
                    error: { status: 400, body: { error: 'string' } }
                }
            }
        );
        
        // Project-specific APIs
        if (projectType === 'ecommerce') {
            apis.push(
                {
                    method: 'GET',
                    path: '/api/products',
                    description: 'List products with filtering',
                    authentication: 'Optional',
                    queryParams: {
                        page: 'number',
                        limit: 'number',
                        category: 'string',
                        minPrice: 'number',
                        maxPrice: 'number',
                        search: 'string'
                    },
                    response: {
                        success: {
                            status: 200,
                            body: {
                                products: 'Product[]',
                                pagination: {
                                    page: 'number',
                                    limit: 'number',
                                    total: 'number'
                                }
                            }
                        }
                    }
                },
                {
                    method: 'POST',
                    path: '/api/orders',
                    description: 'Create new order',
                    authentication: 'Required',
                    request: {
                        body: {
                            items: 'OrderItem[]',
                            shippingAddress: 'Address',
                            billingAddress: 'Address',
                            paymentMethodId: 'string'
                        }
                    },
                    response: {
                        success: {
                            status: 201,
                            body: {
                                order: 'Order',
                                paymentIntent: 'StripePaymentIntent'
                            }
                        }
                    }
                }
            );
        }
        
        return apis;
    }
    
    static generateSecuritySpecs(inferences, answers) {
        const hasCompliance = answers.find(a => a.questionId === 'compliance');
        
        return {
            authentication: {
                provider: 'Clerk Auth',
                methods: ['Email/Password', 'OAuth (Google, GitHub)', 'Magic Links'],
                mfa: 'Available for pro plans',
                sessionManagement: 'JWT with refresh tokens',
                passwordPolicy: 'Minimum 8 characters, complexity requirements'
            },
            
            authorization: {
                strategy: 'Role-based access control (RBAC)',
                roles: ['admin', 'user', 'viewer'],
                permissions: 'Defined per resource',
                rowLevelSecurity: 'Implemented in Supabase'
            },
            
            dataProtection: {
                encryption: {
                    atRest: 'AES-256 (Supabase managed)',
                    inTransit: 'TLS 1.3',
                    pii: 'Field-level encryption for sensitive data'
                },
                backup: 'Daily automated backups with 30-day retention',
                recovery: 'Point-in-time recovery available'
            },
            
            compliance: {
                gdpr: hasCompliance?.answer?.includes('GDPR') ? {
                    dataExport: 'User can export all personal data',
                    dataDeletion: 'Right to be forgotten implemented',
                    consent: 'Cookie consent and privacy policy'
                } : null,
                pci: inferences.security.includes('PCI') ? {
                    level: 'SAQ-A (using Stripe)',
                    cardData: 'Never stored, tokenized via Stripe'
                } : null
            },
            
            applicationSecurity: {
                inputValidation: 'Zod schemas for all inputs',
                sqlInjection: 'Prevented via Prisma ORM',
                xss: 'React automatic escaping + CSP headers',
                csrf: 'Token-based protection',
                rateLimit: '100 requests per minute per IP',
                cors: 'Configured for specific origins',
                headers: {
                    'X-Frame-Options': 'DENY',
                    'X-Content-Type-Options': 'nosniff',
                    'Strict-Transport-Security': 'max-age=31536000',
                    'Content-Security-Policy': "default-src 'self'"
                }
            },
            
            monitoring: {
                logging: 'Structured logging with sensitive data redaction',
                alerting: 'Real-time alerts for security events',
                auditTrail: 'Complete audit log of user actions'
            }
        };
    }
    
    static generateInfrastructureSpecs(projectType, inferences) {
        return {
            hosting: {
                platform: 'Vercel',
                plan: 'Pro (for commercial use)',
                regions: ['iad1 (US East)', 'lhr1 (London)'],
                cdn: 'Vercel Edge Network (Global)'
            },
            
            database: {
                provider: 'Supabase',
                plan: 'Pro',
                specs: {
                    cpu: '2 CPUs',
                    ram: '8GB',
                    storage: '100GB',
                    connections: '60 concurrent'
                },
                backup: 'Daily with 30-day retention',
                replication: 'Read replicas for scaling'
            },
            
            cicd: {
                pipeline: 'GitHub Actions',
                environments: ['development', 'staging', 'production'],
                deploymentStrategy: 'Blue-green deployments',
                workflow: `
                    1. Push to main branch
                    2. Run tests (unit, integration)
                    3. Build application
                    4. Deploy to staging
                    5. Run E2E tests
                    6. Manual approval
                    7. Deploy to production
                `,
                rollback: 'Instant rollback via Vercel'
            },
            
            monitoring: {
                apm: 'Vercel Analytics',
                logging: 'Vercel Functions Logs',
                errorTracking: 'Sentry integration',
                uptime: 'Vercel + external monitoring',
                customMetrics: 'Application-specific KPIs'
            },
            
            scaling: {
                strategy: 'Automatic horizontal scaling',
                loadBalancing: 'Vercel Edge Network',
                caching: {
                    cdn: 'Static assets cached at edge',
                    api: 'Redis for API response caching',
                    database: 'Query result caching'
                },
                performance: {
                    target: '< 3s page load',
                    optimization: 'Image optimization, code splitting, lazy loading'
                }
            },
            
            security: {
                ddosProtection: 'Vercel DDoS protection',
                waf: 'Vercel Firewall',
                secrets: 'Environment variables in Vercel',
                certificates: 'Auto-managed SSL/TLS'
            },
            
            estimatedCosts: {
                monthly: {
                    vercel: '$20 (Pro plan)',
                    supabase: '$25 (Pro plan)',
                    clerk: '$25 (Production)',
                    total: '$70/month base cost'
                },
                scaling: 'Additional costs based on usage'
            }
        };
    }
    
    // Helper methods for generating specific content
    static generateUserStories(feature) {
        const stories = [];
        const featureLower = feature.toLowerCase();
        
        if (featureLower.includes('auth') || featureLower.includes('login')) {
            stories.push(
                'As a user, I want to create an account so that I can access personalized features',
                'As a user, I want to log in securely so that my data is protected',
                'As a user, I want to reset my password if I forget it'
            );
        }
        
        if (featureLower.includes('search')) {
            stories.push(
                'As a user, I want to search for items quickly so that I can find what I need',
                'As a user, I want to filter search results so that I can narrow down options',
                'As a user, I want to see relevant suggestions as I type'
            );
        }
        
        // Default stories if no specific match
        if (stories.length === 0) {
            stories.push(
                `As a user, I want to use ${feature} so that I can achieve my goals`,
                `As an admin, I want to manage ${feature} so that I can maintain the system`
            );
        }
        
        return stories;
    }
    
    static generateAcceptanceCriteria(feature) {
        return [
            `${feature} is fully functional and tested`,
            'User interface is intuitive and responsive',
            'All edge cases are handled gracefully',
            'Performance meets defined benchmarks',
            'Security requirements are met',
            'Accessibility standards are followed'
        ];
    }
    
    static generateTechnicalRequirements(feature) {
        return [
            'Implementation using Next.js Server Actions',
            'Data validation with Zod schemas',
            'Error handling with user-friendly messages',
            'Loading states for async operations',
            'Optimistic UI updates where applicable',
            'Mobile-responsive design'
        ];
    }
    
    static generateFeatureEndpoints(feature) {
        const endpoints = [];
        const featureLower = feature.toLowerCase();
        const featureSlug = feature.replace(/\s+/g, '-').toLowerCase();
        
        endpoints.push({
            method: 'GET',
            path: `/api/${featureSlug}`,
            description: `Get ${feature} data`
        });
        
        if (!featureLower.includes('view') && !featureLower.includes('display')) {
            endpoints.push({
                method: 'POST',
                path: `/api/${featureSlug}`,
                description: `Create new ${feature}`
            });
            
            endpoints.push({
                method: 'PUT',
                path: `/api/${featureSlug}/[id]`,
                description: `Update ${feature}`
            });
            
            endpoints.push({
                method: 'DELETE',
                path: `/api/${featureSlug}/[id]`,
                description: `Delete ${feature}`
            });
        }
        
        return endpoints;
    }
    
    static identifyDataModels(feature) {
        const models = [];
        const featureLower = feature.toLowerCase();
        
        if (featureLower.includes('user') || featureLower.includes('profile')) {
            models.push('User', 'UserProfile', 'UserSettings');
        }
        
        if (featureLower.includes('product')) {
            models.push('Product', 'ProductCategory', 'ProductVariant');
        }
        
        if (featureLower.includes('order')) {
            models.push('Order', 'OrderItem', 'OrderStatus');
        }
        
        if (featureLower.includes('payment')) {
            models.push('Payment', 'Invoice', 'Transaction');
        }
        
        return models;
    }
    
    static identifyUIComponents(feature) {
        const components = [];
        const featureLower = feature.toLowerCase();
        
        if (featureLower.includes('form') || featureLower.includes('input')) {
            components.push('FormField', 'ValidationMessage', 'SubmitButton');
        }
        
        if (featureLower.includes('list') || featureLower.includes('table')) {
            components.push('DataTable', 'Pagination', 'FilterBar');
        }
        
        if (featureLower.includes('dashboard')) {
            components.push('StatCard', 'Chart', 'ActivityFeed');
        }
        
        // Default components
        components.push('LoadingSpinner', 'ErrorBoundary', 'Toast');
        
        return components;
    }
    
    static identifyEdgeCases(feature) {
        return [
            'Handle network failures gracefully',
            'Validate all user inputs',
            'Handle concurrent updates',
            'Manage large data sets efficiently',
            'Provide fallback for unsupported browsers',
            'Handle timeout scenarios'
        ];
    }
    
    static generateWireframeSpecs(projectType) {
        const wireframes = [];
        
        // Universal wireframes
        wireframes.push(
            {
                name: 'Homepage',
                description: 'Landing page with value proposition',
                elements: ['Hero', 'Features', 'CTA', 'Footer']
            },
            {
                name: 'Dashboard',
                description: 'Main user dashboard',
                elements: ['Stats', 'Navigation', 'Quick Actions', 'Activity Feed']
            },
            {
                name: 'Settings',
                description: 'User settings and preferences',
                elements: ['Profile', 'Security', 'Notifications', 'Billing']
            }
        );
        
        // Project-specific wireframes
        if (projectType === 'ecommerce') {
            wireframes.push(
                {
                    name: 'Product Listing',
                    description: 'Browse products with filters',
                    elements: ['Search Bar', 'Filters', 'Product Grid', 'Pagination']
                },
                {
                    name: 'Product Detail',
                    description: 'Single product view',
                    elements: ['Images', 'Description', 'Price', 'Add to Cart', 'Reviews']
                },
                {
                    name: 'Shopping Cart',
                    description: 'Cart management',
                    elements: ['Items List', 'Quantity', 'Subtotal', 'Checkout Button']
                },
                {
                    name: 'Checkout',
                    description: 'Purchase completion',
                    elements: ['Shipping', 'Payment', 'Review', 'Confirmation']
                }
            );
        }
        
        return wireframes;
    }
    
    static generateUserFlows(projectType, answers) {
        const flows = [];
        
        // Universal flows
        flows.push({
            name: 'User Onboarding',
            steps: [
                'Land on homepage',
                'Click sign up',
                'Enter email/password',
                'Verify email',
                'Complete profile',
                'View dashboard'
            ]
        });
        
        // Project-specific flows
        if (projectType === 'ecommerce') {
            flows.push({
                name: 'Purchase Flow',
                steps: [
                    'Browse products',
                    'View product details',
                    'Add to cart',
                    'Review cart',
                    'Enter shipping info',
                    'Enter payment info',
                    'Confirm order',
                    'Receive confirmation'
                ]
            });
        }
        
        return flows;
    }
    
    static generateAccessibilitySpecs() {
        return {
            standards: 'WCAG 2.1 Level AA',
            requirements: [
                'Keyboard navigation for all interactive elements',
                'Screen reader compatibility',
                'Color contrast ratio minimum 4.5:1',
                'Alt text for all images',
                'ARIA labels for complex UI elements',
                'Focus indicators visible',
                'Text scalable to 200% without loss of functionality',
                'No seizure-inducing animations'
            ],
            testing: 'Automated testing with axe-core + manual testing'
        };
    }
    
    static generateMigrations(models) {
        return models.map(model => ({
            name: `create_${model.tableName}`,
            sql: `CREATE TABLE ${model.tableName} (
                ${model.fields.map(f => 
                    `${f.name} ${f.type}${f.primaryKey ? ' PRIMARY KEY' : ''}${f.unique ? ' UNIQUE' : ''}${f.nullable ? '' : ' NOT NULL'}${f.default ? ` DEFAULT ${f.default}` : ''}`
                ).join(',\n    ')}
            );`
        }));
    }
    
    static generateSeedData(projectType) {
        if (projectType === 'ecommerce') {
            return {
                products: 10,
                categories: 5,
                users: 3,
                orders: 5
            };
        }
        return {
            users: 3,
            sampleData: 10
        };
    }
}

// CLAUDE.md Generator
class ClaudeMDGenerator {
    static generate(projectData, conversation) {
        const { projectName, projectType, answers, prd } = projectData;
        
        return `# CLAUDE.md - ${projectName}

Generated from PRD conversation on ${new Date().toISOString()}

## Project Overview
**Type:** ${projectType}
**Description:** ${answers.find(a => a.questionId === 'project-description')?.answer || 'No description provided'}
**Timeline:** ${answers.find(a => a.questionId === 'timeline')?.answer || 'Not specified'}

## Critical Business Context
${this.extractBusinessContext(answers)}

## Technical Architecture Decisions
${this.extractTechnicalDecisions(projectData)}

## Code Conventions and Standards

### Project Structure
\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-required routes
│   ├── (public)/          # Public routes
│   ├── api/               # API routes
│   └── actions/           # Server Actions
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── features/         # Feature-specific components
├── lib/                   # Utilities and helpers
│   ├── db.ts             # Database client
│   ├── auth.ts           # Auth utilities
│   └── utils.ts          # General utilities
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
└── styles/               # Global styles
\`\`\`

### Naming Conventions
- **Files:** kebab-case (e.g., \`user-profile.tsx\`)
- **Components:** PascalCase (e.g., \`UserProfile\`)
- **Functions:** camelCase (e.g., \`getUserProfile\`)
- **Constants:** UPPER_SNAKE_CASE (e.g., \`MAX_RETRY_COUNT\`)
- **Types/Interfaces:** PascalCase with prefix (e.g., \`IUserProfile\`, \`TUserRole\`)

### State Management
- **Client State:** Zustand for global state
- **Server State:** React Query for caching
- **Form State:** React Hook Form with Zod validation

### Data Fetching Patterns
- **Queries:** Server Components when possible
- **Mutations:** Server Actions with optimistic updates
- **Real-time:** Supabase subscriptions for live data

## Design System Quick Reference
${this.formatDesignSystem(projectData.designSystem)}

## API Patterns and Conventions

### Server Actions
\`\`\`typescript
'use server'

export async function actionName(formData: FormData) {
    // 1. Authenticate
    const user = await auth()
    if (!user) throw new Error('Unauthorized')
    
    // 2. Validate
    const data = schema.parse(Object.fromEntries(formData))
    
    // 3. Execute
    const result = await db.table.create({ data })
    
    // 4. Revalidate
    revalidatePath('/path')
    
    // 5. Return
    return { success: true, data: result }
}
\`\`\`

### Error Handling
\`\`\`typescript
try {
    // Operation
} catch (error) {
    if (error instanceof ZodError) {
        return { error: 'Validation failed', details: error.errors }
    }
    if (error instanceof PrismaError) {
        return { error: 'Database error', code: error.code }
    }
    return { error: 'Something went wrong' }
}
\`\`\`

## Security Considerations
${this.extractSecurityRequirements(projectData)}

## Performance Requirements
- **Page Load:** < 3 seconds
- **API Response:** < 200ms
- **Database Queries:** < 100ms
- **Image Loading:** Lazy load with blur placeholders
- **Bundle Size:** < 200KB initial JS

## Testing Strategy
- **Unit Tests:** Vitest for utilities and helpers
- **Component Tests:** React Testing Library
- **E2E Tests:** Playwright for critical user flows
- **Coverage Target:** 80% for business logic

## Environment Variables
\`\`\`bash
# Database
DATABASE_URL=              # Supabase connection string
DIRECT_URL=                # Direct connection for migrations

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Services
STRIPE_SECRET_KEY=         # If using payments
STRIPE_WEBHOOK_SECRET=     # If using payments

# Deployment
VERCEL_URL=               # Auto-set by Vercel
\`\`\`

## Development Workflow

### Commands
\`\`\`bash
# Development
npm run dev               # Start dev server
npm run db:push          # Push schema changes
npm run db:seed          # Seed database

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests
npm run test:coverage    # Generate coverage report

# Production
npm run build            # Build for production
npm run start            # Start production server
\`\`\`

### Git Workflow
1. Create feature branch from \`main\`
2. Make changes with clear commits
3. Run tests locally
4. Create PR with description
5. Wait for CI/CD checks
6. Merge after review

## Common Patterns and Solutions

### Authentication Check
\`\`\`typescript
import { auth } from '@clerk/nextjs'

export default async function Page() {
    const { userId } = auth()
    if (!userId) redirect('/sign-in')
    // Continue with authenticated user
}
\`\`\`

### Database Query with Prisma
\`\`\`typescript
import { prisma } from '@/lib/db'

const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
})
\`\`\`

### Optimistic Updates
\`\`\`typescript
const { mutate } = useMutation({
    mutationFn: updateItem,
    onMutate: async (newData) => {
        // Cancel queries
        await queryClient.cancelQueries({ queryKey: ['items'] })
        
        // Snapshot previous value
        const previous = queryClient.getQueryData(['items'])
        
        // Optimistically update
        queryClient.setQueryData(['items'], old => [...old, newData])
        
        // Return rollback function
        return { previous }
    },
    onError: (err, variables, context) => {
        // Rollback on error
        queryClient.setQueryData(['items'], context.previous)
    }
})
\`\`\`

## Potential Pitfalls and How to Avoid Them

1. **N+1 Queries:** Use Prisma's \`include\` for relations
2. **Large Bundle Size:** Use dynamic imports for heavy components
3. **Memory Leaks:** Clean up subscriptions and intervals
4. **Race Conditions:** Use optimistic locking for concurrent updates
5. **Type Safety:** Never use \`any\`, define proper types

## Questions and Answers from PRD Session

${conversation.map((item, index) => `
### Q${index + 1}: ${item.question}
**Answer:** ${item.answer}
`).join('\n')}

## Additional Context

This file was auto-generated from the PRD conversation and contains business context and technical decisions that should guide all development on this project. It should be updated as the project evolves.

## Related Documents
- Full PRD: Available in project documentation
- API Documentation: See /docs/api
- Design System: See /docs/design
- Deployment Guide: See /docs/deployment
`;
    }
    
    static extractBusinessContext(answers) {
        const audience = answers.find(a => a.questionId === 'target-audience')?.answer;
        const features = answers.find(a => a.questionId === 'core-features')?.answer;
        
        return `
- **Target Audience:** ${audience || 'Not specified'}
- **Core Value Proposition:** ${features || 'Not specified'}
- **Key Success Metrics:** User adoption, performance, reliability
- **Business Constraints:** Timeline, budget, compliance requirements
`;
    }
    
    static extractTechnicalDecisions(projectData) {
        return `
- **Architecture:** ${projectData.projectType === 'mobile' ? 'Mobile-first PWA' : 'Server-side rendered web app'}
- **Database:** PostgreSQL for relational data, Redis for caching
- **Authentication:** Clerk for managed auth with social providers
- **Payments:** ${projectData.inferences?.integrations?.includes('Stripe') ? 'Stripe for payment processing' : 'No payment processing required'}
- **File Storage:** Supabase Storage for user uploads
- **Real-time:** WebSockets via Supabase for live updates
- **Deployment:** Vercel with edge functions
`;
    }
    
    static formatDesignSystem(designSystem) {
        if (!designSystem) return 'No design system specified';
        
        return `
### Colors
- **Primary:** ${designSystem.colors.primary}
- **Secondary:** ${designSystem.colors.secondary}
- **Background:** ${designSystem.colors.background}
- **Text:** ${designSystem.colors.text}
- **Border:** ${designSystem.colors.border}

### Typography
- **Font:** ${designSystem.typography.fontFamily}
- **Body Size:** ${designSystem.typography.bodySize}
- **Line Height:** ${designSystem.typography.lineHeight}

### Spacing
- **Base Unit:** ${designSystem.spacing.unit}px
- **Scale:** ${designSystem.spacing.scale.join(', ')}

### Border Radius
- **Small:** ${designSystem.borderRadius.small}
- **Medium:** ${designSystem.borderRadius.medium}
- **Large:** ${designSystem.borderRadius.large}
`;
    }
    
    static extractSecurityRequirements(projectData) {
        const security = [];
        
        if (projectData.inferences?.security?.includes('PCI')) {
            security.push('- **PCI Compliance:** Required for payment processing');
        }
        
        if (projectData.inferences?.security?.includes('GDPR')) {
            security.push('- **GDPR:** Data privacy and user rights implementation');
        }
        
        security.push(
            '- **Authentication:** Managed by Clerk with MFA support',
            '- **Authorization:** Role-based access control (RBAC)',
            '- **Data Encryption:** TLS in transit, AES-256 at rest',
            '- **Input Validation:** Zod schemas for all user inputs',
            '- **SQL Injection:** Protected via Prisma ORM',
            '- **XSS Prevention:** React escaping + CSP headers',
            '- **Rate Limiting:** 100 requests/minute per IP'
        );
        
        return security.join('\n');
    }
}

// Store for temporary transfer storage
const transferStore = new Map();

// API Endpoints

// Get dynamic questions based on project type
router.post('/questions', async (req, res) => {
    try {
        const { projectType, depth = 'standard' } = req.body;
        
        let questions = [...questionBank.universal.initial];
        
        // Add project-specific questions
        if (projectType && questionBank[projectType]) {
            questions.push(...questionBank[projectType]);
        }
        
        // Add follow-up questions based on depth
        if (depth === 'detailed') {
            questions.push(...questionBank.universal.followUp);
        }
        
        res.json({
            success: true,
            questions,
            totalQuestions: questions.length
        });
        
    } catch (error) {
        console.error('Error getting questions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate questions'
        });
    }
});

// Generate comprehensive PRD with 8 sections
router.post('/generate', async (req, res) => {
    try {
        const {
            sessionId,
            projectType,
            projectName,
            projectDescription,
            answers,
            settings
        } = req.body;
        
        console.log('🚀 Generating comprehensive PRD for:', projectName);
        
        // Run inference engine
        const inferences = InferenceEngine.analyze(projectType, answers);
        console.log('🧠 Inferences generated:', inferences);
        
        // Generate design system
        const designPreference = answers.find(a => a.questionId === 'design-preference')?.answer || 'Modern';
        const designSystem = DesignSystemGenerator.generate(designPreference);
        console.log('🎨 Design system generated:', designPreference);
        
        // Prepare project data
        const projectData = {
            projectType,
            projectName: projectName || 'Untitled Project',
            description: projectDescription,
            answers,
            inferences,
            designSystem
        };
        
        // Generate comprehensive PRD
        const prd = PRDGenerator.generate(projectData);
        console.log('📄 PRD generated with', Object.keys(prd).length, 'sections');
        
        // Generate CLAUDE.md
        const claudeMd = ClaudeMDGenerator.generate(
            projectData,
            answers.map(a => ({
                question: a.question,
                answer: a.answer
            }))
        );
        console.log('📝 CLAUDE.md generated');
        
        // Store for transfer
        const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        transferStore.set(transferId, {
            prd,
            claudeMd,
            projectName,
            projectType,
            timestamp: Date.now()
        });
        
        // Clean up old transfers (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        for (const [id, data] of transferStore.entries()) {
            if (data.timestamp < oneHourAgo) {
                transferStore.delete(id);
            }
        }
        
        res.json({
            success: true,
            prdDocument: prd,
            claudeMd,
            transferId,
            message: 'PRD generated successfully'
        });
        
    } catch (error) {
        console.error('Error generating PRD:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PRD',
            details: error.message
        });
    }
});

// Store PRD for transfer to IDE
router.post('/transfer', async (req, res) => {
    try {
        const { prd, claudeMd } = req.body;
        
        const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        transferStore.set(transferId, {
            prd,
            claudeMd,
            timestamp: Date.now()
        });
        
        res.json({
            success: true,
            transferId
        });
        
    } catch (error) {
        console.error('Error storing transfer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store transfer'
        });
    }
});

// Retrieve PRD transfer
router.get('/transfer/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = transferStore.get(id);
        
        if (!transfer) {
            return res.status(404).json({
                success: false,
                error: 'Transfer not found or expired'
            });
        }
        
        res.json({
            success: true,
            ...transfer
        });
        
        // Delete after retrieval (one-time use)
        transferStore.delete(id);
        
    } catch (error) {
        console.error('Error retrieving transfer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve transfer'
        });
    }
});

module.exports = router;