/* 
===============================================================================
Smart PRD Generator - PRD Generation API
===============================================================================
File: app/api/smart-prd/sessions/[sessionId]/generate-prd/route.ts
Purpose: Generate professional PRD documents from questionnaire answers
Status: PRODUCTION - Created: January 20, 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';
import { PRDOrchestrator } from '@/services/prd-tools/tool-orchestrator';
import type { PRDGenerationOptions } from '@/services/prd-tools/tool-orchestrator';
// CLI orchestrator imported dynamically below to catch module resolution errors
// import { CLIPRDOrchestrator } from '@/services/prd-tools/cli-tool-orchestrator';
// import type { CLIPRDGenerationOptions } from '@/services/prd-tools/cli-tool-orchestrator';

// Import the sessions map
const sessions = (global as any).prdSessions || new Map();

// Initialize global sessions if not exists
if (!(global as any).prdSessions) {
  (global as any).prdSessions = sessions;
}

// PRD Template for Quick Mode (5-8 pages)
function generateQuickModePRD(session: any, pattern: any) {
  const answers = session.answers || [];
  const userContext = session.userContext || {};
  
  // Extract answers into a map for easy access
  const answerMap: any = {};
  answers.forEach((answer: any) => {
    answerMap[answer.questionId] = answer.answer;
  });
  
  const productName = answerMap['product-name'] || 'Product Name';
  const targetMarket = answerMap['target-market'] || answerMap['target-users'] || 'Target Market';
  const coreDifferentiator = answerMap['core-differentiator'] || answerMap['problem-statement'] || 'Core Value';
  const revenueModel = answerMap['revenue-model'] || 'Revenue Model';
  const timeline = answerMap['launch-timeline'] || answerMap['success-metric'] || '3 months';
  
  const prd = `# Product Requirements Document

## ${productName}

*Generated: ${new Date().toLocaleDateString()}*  
*Pattern: ${pattern?.name || 'Custom'}*  
*Mode: Quick (5-page PRD)*

---

## 1. Executive Summary

### Product Vision
${productName} is a ${pattern?.description || 'innovative solution'} designed to revolutionize the ${userContext.category || 'technology'} industry.

### Key Differentiator
${coreDifferentiator}

### Target Market
${Array.isArray(targetMarket) ? targetMarket.join(', ') : targetMarket}

### Success Metrics
- Launch Timeline: ${timeline}
- Success Rate Benchmark: ${pattern?.successRate || '70'}%
- Time to Market: ${pattern?.timeToMarket || '6 months'}

---

## 2. Problem Statement

### Market Challenge
The ${userContext.category || 'market'} industry faces significant challenges in delivering efficient, scalable solutions. Current offerings fail to address:

- **Complexity**: Existing solutions are overly complex and difficult to integrate
- **Cost**: High implementation and maintenance costs
- **Scalability**: Limited ability to scale with business growth
- **User Experience**: Poor user experience leading to low adoption rates

### Our Solution
${productName} addresses these challenges through:
- ${coreDifferentiator}
- Streamlined implementation process
- Cost-effective pricing model
- Built-in scalability from day one

### Why This Problem is Worth Solving
- Current workarounds are inefficient and costly
- Market size and growth potential justify investment
- Clear path to monetization and sustainability

---

## 3. Target Audience

### Primary User Personas

**Persona 1: The Early Adopter**
- Demographics: ${targetMarket}
- Pain Points: Frustrated with current solutions
- Goals: Find efficient, cost-effective alternatives
- Behaviors: Active in online communities, willing to try new products

**Persona 2: The Enterprise Decision Maker**
- Demographics: Technical leaders at mid-to-large companies
- Pain Points: Need scalable solutions with proven reliability
- Goals: Reduce costs while maintaining quality
- Behaviors: Evaluates multiple vendors, requires ROI justification

### Market Size Estimation
- Total Addressable Market (TAM): ${userContext.category || 'Technology'} industry
- Serviceable Addressable Market (SAM): Target segment within industry
- Serviceable Obtainable Market (SOM): Initial realistic capture target

---

## 4. Product Vision & Goals

### Vision Statement
To become the leading ${pattern?.description || 'solution'} in the ${userContext.category || 'technology'} space by delivering unmatched value and user experience.

### Key Objectives
1. Achieve product-market fit within first 6 months
2. Build strong user community and brand recognition
3. Establish sustainable revenue model
4. Create platform for continuous innovation

### Success Criteria
- **6 Months**: ${timeline} launch achieved, initial user base established
- **1 Year**: Revenue targets met, positive user growth trajectory
- **2 Years**: Market leadership position in target segment

---

## 5. Core Features (MVP)

### Feature 1: User Authentication & Onboarding
**User Story**: As a new user, I want to quickly create an account and understand the platform's value so that I can start using it immediately.

**Acceptance Criteria**:
- Email/password and OAuth social login options
- Guided onboarding tour highlighting key features
- Account verification within 5 minutes
- Mobile-responsive design

**Priority**: P0 (Must-have)

### Feature 2: Core Platform Functionality
**User Story**: As a ${targetMarket}, I want ${coreDifferentiator} so that I can achieve my primary goals efficiently.

**Acceptance Criteria**:
- Main feature workflow completes in under 3 clicks
- Real-time updates and feedback
- Error handling with clear user messaging
- Undo/redo functionality for critical actions

**Priority**: P0 (Must-have)

### Feature 3: Dashboard & Analytics
**User Story**: As a user, I want to see my activity and progress so that I can make informed decisions.

**Acceptance Criteria**:
- Key metrics displayed prominently
- Interactive charts and visualizations
- Export capabilities for data
- Mobile-optimized view

**Priority**: P1 (Should-have)

### Feature 4: Collaboration Tools
**User Story**: As a team member, I want to collaborate with others so that we can work together effectively.

**Acceptance Criteria**:
- Team/workspace management
- Permissions and role-based access control
- Activity feed and notifications
- Comments and discussion threads

**Priority**: P1 (Should-have)

### Feature 5: Integration Hub
**User Story**: As a power user, I want to integrate with my existing tools so that I can streamline my workflow.

**Acceptance Criteria**:
- API access with documentation
- Webhooks for event notifications
- Pre-built integrations with popular services
- SDK for custom integrations

**Priority**: P2 (Nice-to-have)

---

## 6. User Flows

### Onboarding Flow
1. User lands on homepage → Clear value proposition
2. Click "Get Started" → Choose signup method
3. Enter credentials → Email verification sent
4. Verify email → Guided tour begins
5. Complete profile → First action prompt
6. First success → Celebration and next steps

### Core Feature Usage Flow
1. User logs in → Dashboard with quick actions
2. Initiates primary workflow → Step-by-step guidance
3. Completes action → Immediate feedback and confirmation
4. Views results → Options to share, export, or iterate
5. Explores additional features → Contextual help available

### Edge Cases & Error Handling
- Network errors: Offline mode with sync when reconnected
- Invalid inputs: Inline validation with helpful error messages
- Session timeouts: Auto-save with seamless re-authentication
- System errors: Friendly error pages with support contact

---

## 7. Technical Architecture

### Recommended Tech Stack
**Frontend**: ${pattern?.technical?.primaryTech?.[1] || 'React/Next.js'} - Modern, component-based UI framework
**Backend**: ${pattern?.technical?.primaryTech?.[0] || 'Node.js/Express'} - Scalable API server
**Database**: ${pattern?.technical?.primaryTech?.[2] || 'PostgreSQL'} - Reliable relational database
**Caching**: ${pattern?.technical?.primaryTech?.[3] || 'Redis'} - High-performance caching
**Hosting**: Cloud provider (AWS/GCP/Azure) with auto-scaling

### Architecture Pattern
${pattern?.technical?.architecture || 'Microservices architecture with event-driven design'}

### Third-Party Integrations
- Payment processing: Stripe/PayPal
- Authentication: Auth0/Firebase
- Email: SendGrid/Mailgun
- Analytics: Mixpanel/Amplitude
- Monitoring: Datadog/New Relic

### API Requirements
- RESTful API design with OpenAPI/Swagger documentation
- Rate limiting: 1000 requests/hour per user
- Response time: < 200ms for 95th percentile
- Versioning strategy for backward compatibility

### Performance Requirements
- Page load time: < 2 seconds on 3G connection
- Time to interactive: < 3 seconds
- API response time: < 500ms average
- Database query time: < 100ms per query
- Uptime: 99.9% SLA target

### Security Considerations
- OAuth 2.0 authentication with refresh tokens
- End-to-end encryption for sensitive data
- HTTPS only with TLS 1.3
- Regular security audits and penetration testing
- OWASP Top 10 vulnerability protection
- PCI DSS compliance for payment data
- GDPR and CCPA compliance for user data

### Scalability Considerations
${pattern?.technical?.scalingStrategy || 'Horizontal scaling with load balancers and auto-scaling groups'}
- Database read replicas for query performance
- CDN for static asset delivery
- Message queue for async processing
- Microservices architecture for independent scaling

### Core Components
1. **Frontend Application**
   - Responsive web interface
   - Mobile-optimized experience (PWA capable)
   - Real-time updates via WebSocket
   - Offline mode with service workers

2. **Backend Services**
   - RESTful API architecture
   - Authentication & authorization service
   - Data processing pipeline
   - Background job processing
   - Webhook handling

3. **Data Layer**
   - Primary database with automatic backups
   - Caching layer for performance
   - Analytics engine for insights
   - Data warehouse for reporting

---

## 8. Non-Functional Requirements

### Performance
- **Load Times**: All pages load in < 2 seconds on standard broadband
- **API Response**: 95% of API calls complete in < 500ms
- **Concurrent Users**: Support 10,000 concurrent users without degradation
- **Database Queries**: All queries optimized to < 100ms execution time

### Security
- **Authentication**: Multi-factor authentication available
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: At-rest and in-transit encryption
- **Compliance**: GDPR, CCPA, SOC 2 Type II certified
- **Vulnerability Scanning**: Weekly automated security scans

### Accessibility
- **WCAG 2.1 Level AA** compliance minimum
- Screen reader compatibility
- Keyboard navigation for all features
- High contrast mode available
- Closed captions for video content

### Mobile Responsiveness
- Responsive design for all screen sizes (320px to 4K)
- Touch-optimized UI elements
- Progressive Web App (PWA) capabilities
- Native mobile app considerations for future

### Browser Compatibility
- Chrome, Firefox, Safari, Edge (last 2 versions)
- iOS Safari (last 2 versions)
- Android Chrome (last 2 versions)
- Graceful degradation for older browsers

---

## 9. Success Metrics & KPIs

### User Acquisition Metrics
- **New Signups**: Target 1,000 users in first month
- **Activation Rate**: 60% of signups complete onboarding
- **Cost Per Acquisition (CPA)**: < $50 per user
- **Viral Coefficient**: Target 1.2 (each user brings 1.2 new users)

### Engagement Metrics
- **Daily Active Users (DAU)**: Track daily active usage
- **Weekly Active Users (WAU)**: DAU/WAU ratio > 0.3
- **Session Duration**: Average 15+ minutes per session
- **Feature Adoption**: 70% of users use core features weekly
- **Retention Rate**: 40% 30-day retention, 25% 90-day retention

### Revenue/Business Metrics
- **Monthly Recurring Revenue (MRR)**: ${revenueModel} model target
- **Customer Lifetime Value (LTV)**: > 3x CPA
- **Churn Rate**: < 5% monthly churn
- **Average Revenue Per User (ARPU)**: Track and optimize
- **Conversion Rate**: 15% free-to-paid conversion

### Technical Metrics
- **Uptime**: 99.9% uptime (< 45 minutes downtime/month)
- **API Latency**: p95 < 500ms, p99 < 1000ms
- **Error Rate**: < 0.1% of requests result in errors
- **Page Load Time**: p95 < 2 seconds
- **Database Performance**: < 100ms query time p95

### How to Measure
- Analytics platform (Mixpanel/Amplitude) for user behavior
- Application Performance Monitoring (APM) for technical metrics
- Financial dashboard for revenue tracking
- Custom reporting dashboard combining all metrics
- Weekly metrics review meetings with stakeholders

---

## 10. Business Model & Go-to-Market

### Revenue Streams
${Array.isArray(revenueModel) ? revenueModel.map((model: string) => {
  switch(model) {
    case 'transaction-fee':
      return '- **Transaction Fees**: 2.9% + $0.30 per transaction';
    case 'subscription':
      return '- **Monthly Subscriptions**: $29/month starter, $99/month pro';
    case 'freemium':
      return '- **Freemium Model**: Free tier with premium features at $49/month';
    case 'enterprise':
      return '- **Enterprise Licensing**: Custom pricing starting at $999/month';
    default:
      return `- **${model}**: Custom pricing model`;
  }
}).join('\n') : '- Subscription-based model'}

### Go-to-Market Strategy
1. **Phase 1**: Beta launch with early adopters
2. **Phase 2**: Public launch with core features
3. **Phase 3**: Scale and expand feature set

### Target Customers
${targetMarket}

### Competitive Analysis
- Direct competitors and their limitations
- Indirect competitors and alternative solutions
- Our unique positioning and advantages
- Barriers to entry for new competitors

---

## 11. Timeline & Milestones

### Phase 1: MVP Development (Months 1-2)
**Weeks 1-2: Foundation**
- Set up development environment and repositories
- Configure CI/CD pipelines
- Design system architecture and database schema
- Create initial wireframes and UI mockups

**Weeks 3-4: Core Development**
- Implement authentication system
- Build primary API endpoints
- Create basic UI components
- Set up database with initial migrations

**Weeks 5-6: Feature Development**
- Develop P0 must-have features
- Integrate third-party services
- Implement payment processing
- Add analytics tracking

**Weeks 7-8: Testing & Refinement**
- Comprehensive testing suite (unit, integration, e2e)
- Security audit and vulnerability fixes
- Performance optimization
- Beta user feedback integration

### Phase 2: Beta Launch (Month 3)
- Limited beta release to 100 early adopters
- Daily monitoring and rapid bug fixes
- Weekly feature iterations based on feedback
- Onboarding optimization

### Phase 3: Public Launch (Month 4)
- Public launch with marketing campaign
- Support infrastructure ready
- Documentation complete
- Monitoring and analytics in place

### Phase 4: Post-Launch Optimization (Months 5-6)
- Feature refinements based on usage data
- P1 should-have features development
- Scaling infrastructure as needed
- Building for sustainability and growth

### Critical Milestones
- [ ] **Month 1**: MVP feature-complete
- [ ] **Month 2**: Beta launch ready
- [ ] **Month 3**: Beta with 100 users, positive feedback
- [ ] **Month 4**: Public launch, 1,000 users target
- [ ] **Month 5**: Revenue targets on track
- [ ] **Month 6**: Product-market fit achieved

---

## 12. Risks & Mitigation

### Technical Risks
**Risk**: Scalability issues under load
**Mitigation**: Load testing from day one, auto-scaling infrastructure, performance monitoring

**Risk**: Security vulnerabilities
**Mitigation**: Regular security audits, penetration testing, secure coding practices

**Risk**: Third-party service dependencies
**Mitigation**: Fallback options, service monitoring, SLA agreements

### Market Risks
**Risk**: Stronger competitor launches similar product
**Mitigation**: Fast iteration, unique positioning, strong community building

**Risk**: Market size smaller than estimated
**Mitigation**: Adjacent market expansion plan, pivot strategy prepared

**Risk**: User adoption slower than projected
**Mitigation**: Marketing optimization, referral program, product improvements

### Resource Risks
**Risk**: Key team member departure
**Mitigation**: Documentation, knowledge sharing, backup resources

**Risk**: Budget overrun
**Mitigation**: Phased approach, MVP focus, fundraising contingency

**Risk**: Timeline delays
**Mitigation**: Buffer time built in, parallel workstreams, scope flexibility

### Mitigation Strategies Summary
1. Monthly risk assessment reviews
2. KPI tracking with early warning indicators
3. Contingency budget (20% reserve)
4. Backup vendors and service providers
5. Regular team communication and alignment

---

## 13. Open Questions

### Product Questions
- What is the optimal pricing point that maximizes both adoption and revenue?
- Which features are truly essential for MVP vs nice-to-have?
- How do we balance simplicity with power user needs?

### Technical Questions
- Should we build mobile apps immediately or start with responsive web?
- What is the right caching strategy for our use case?
- How do we handle data migrations as the product evolves?

### Business Questions
- What marketing channels will be most effective for user acquisition?
- Should we target B2B, B2C, or both initially?
- What metrics will truly indicate product-market fit?

### User Research Needed
- User testing with target personas for onboarding flow
- Price sensitivity analysis with potential customers
- Feature prioritization through user interviews
- Competitive product comparison from user perspective
- Usage pattern analysis during beta phase

### Assumptions to Validate
- Users will pay ${revenueModel} for this solution
- Our target market has the problem we're solving
- The technical approach is the right fit for scale
- ${timeline} timeline is achievable with current resources

---

## 14. Out of Scope (for MVP)

### Features Explicitly NOT in v1
1. **Native Mobile Apps**: Responsive web first, native apps in v2
   - Why deferred: Focus on core experience, web reaches broader audience
   - When considered: After web MVP proves product-market fit

2. **Advanced Analytics & Reporting**: Basic analytics only in MVP
   - Why deferred: Premature optimization, focus on core functionality
   - When considered: When users specifically request deeper insights

3. **White-label/Multi-tenant**: Single-tenant architecture initially
   - Why deferred: Adds complexity, not required for initial market
   - When considered: When enterprise customers emerge

4. **International Localization**: English-only for MVP
   - Why deferred: Concentrate on primary market first
   - When considered: When international demand is proven

5. **Advanced Integrations**: Core integrations only (payment, auth, email)
   - Why deferred: Build marketplace later with demand
   - When considered: After 20+ integration requests for similar services

6. **AI/ML Features**: Manual processes acceptable initially
   - Why deferred: Requires data to train models effectively
   - When considered: After 6 months of usage data collection

### Scope Management
- Clear communication to stakeholders about v1 boundaries
- "Parking lot" for good ideas to revisit post-launch
- Regular scope review to prevent feature creep
- Focus on MVP definition: Minimum Viable Product that proves core hypothesis

---

## 15. Implementation Roadmap

### Sprint 1-2: Foundation (Weeks 1-2)
- [ ] Set up development environment
- [ ] Initialize project repositories
- [ ] Configure CI/CD pipelines
- [ ] Design system architecture

### Sprint 3-4: Core Development (Weeks 3-4)
- [ ] Implement authentication system
- [ ] Build core API endpoints
- [ ] Create basic UI components
- [ ] Set up database schema

### Sprint 5-6: Feature Development (Weeks 5-6)
- [ ] Develop primary features
- [ ] Integrate third-party services
- [ ] Implement payment processing
- [ ] Add analytics tracking

### Sprint 7-8: Testing & Launch (Weeks 7-8)
- [ ] Comprehensive testing suite
- [ ] Security audit
- [ ] Performance optimization
- [ ] Production deployment

---

## Appendix A: Technical Specifications

### API Endpoints
\`\`\`
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/profile
PUT    /api/users/update
POST   /api/transactions
GET    /api/analytics
\`\`\`

### Database Schema
\`\`\`sql
-- Core tables structure
users, transactions, analytics, settings
\`\`\`

### Security Requirements
- OAuth 2.0 authentication
- End-to-end encryption
- PCI DSS compliance (if payments)
- GDPR compliance

---

*This PRD was generated using proven patterns from ${pattern?.name || 'successful startups'}. Ready for immediate implementation in Coder1 IDE.*`;

  return prd;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { format = 'markdown', useToolBased = true } = body;
    
    // Get session
    const session = sessions.get(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }
    
    // Get the pattern data (simplified for now)
    const patternId = session.userContext?.selectedPattern;
    const pattern = {
      id: patternId,
      name: patternId === 'stripe-saas-platform' ? 'Stripe-style SaaS Platform' : 'Custom Pattern',
      description: 'Modern SaaS platform',
      successRate: 75,
      timeToMarket: '3-6 months',
      technical: {
        architecture: 'Microservices with event-driven design',
        primaryTech: ['Node.js', 'React', 'PostgreSQL', 'Redis'],
        scalingStrategy: 'Horizontal scaling with load balancers'
      }
    };
    
    // Generate PRD based on mode
    const mode = session.userContext?.mode || 'quick';
    let prd = '';
    let metadata: any = {};
    
    // Determine which generation method to use
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    const claudeCliPath = process.env.CLAUDE_CLI_PATH || '/opt/homebrew/bin/claude';
    
    // Prefer CLI (free) over API (paid)
    const useCLI = useToolBased && oauthToken && !apiKey;
    const useAPI = useToolBased && apiKey;
    
    if (useCLI) {
      // CLI-based generation (FREE with OAuth token)
      console.log('🎉 Using CLI-based PRD generation (FREE!)...');
      console.log('🔍 DEBUG: Starting CLI generation process');
      
      try {
        // Step 0: Dynamic import to catch module resolution errors
        console.log('🔍 STEP 0: Dynamically importing CLIPRDOrchestrator...');
        let CLIPRDOrchestrator: any;
        try {
          const module = await import('@/services/prd-tools/cli-tool-orchestrator');
          CLIPRDOrchestrator = module.CLIPRDOrchestrator;
          console.log('✅ STEP 0: CLI orchestrator module imported successfully');
        } catch (importError: any) {
          console.error('❌ STEP 0 FAILED: Cannot import CLI orchestrator');
          console.error('   Import error:', importError.message);
          console.error('   Import stack:', importError.stack);
          throw new Error(`Module import failed: ${importError.message}`);
        }
        
        console.log('🔍 STEP 1: Creating CLIPRDOrchestrator with path:', claudeCliPath);
        const orchestrator = new CLIPRDOrchestrator(claudeCliPath);
        console.log('✅ STEP 1: Orchestrator created successfully');
        
        // Convert answers to the format expected by orchestrator
        // Use answers from request body if provided, otherwise from session
        console.log('🔍 STEP 2: Converting answers');
        const requestAnswers = body.answers || {};
        const answerMap: any = Object.keys(requestAnswers).length > 0
          ? requestAnswers
          : {};
        
        // Also check session.answers if request body is empty
        if (Object.keys(answerMap).length === 0 && session.answers) {
          (session.answers || []).forEach((answer: any) => {
            answerMap[answer.questionId] = answer.answer;
          });
        }
        console.log('✅ STEP 2: Converted answers:', Object.keys(answerMap));
        
        // Determine pattern
        console.log('🔍 STEP 3: Determining pattern');
        const patternId = session.userContext?.selectedPattern || 'stripe-saas';
        const normalizedPattern = patternId.replace(/-platform$/, '').replace(/saas/, 'saas');
        console.log('✅ STEP 3: Pattern normalized:', patternId, '→', normalizedPattern);
        
        // Generate PRD with CLI orchestrator
        console.log('🔍 STEP 4: Configuring options');
        const options: any = {
          mode: mode as 'quick' | 'professional',
          pattern: normalizedPattern,
          includeEvidence: mode === 'professional',
          targetQuality: mode === 'professional' ? 8.5 : 7.0,
          sectionsToGenerate: [
            'executive_summary',
            'problem_statement',
            'solution_overview',
            'target_audience',
            'core_features',
            'technical_architecture'
          ],
          claudeCliPath
        };
        console.log('✅ STEP 4: Options configured:', { mode: options.mode, pattern: options.pattern, sections: options.sectionsToGenerate.length });
        
        console.log('🔍 STEP 5: Calling orchestrator.generatePRD()...');
        const startTime = Date.now();
        const result = await orchestrator.generatePRD(answerMap, options);
        const duration = Date.now() - startTime;
        console.log(`✅ STEP 5: generatePRD() returned in ${duration}ms`);
        console.log('🔍 Result:', { success: result.success, hasPRD: !!result.prd, error: result.error });
        
        if (result.success && result.prd) {
          prd = result.prd;
          metadata = result.metadata;
          
          console.log('✅ CLI-based PRD generation successful');
          console.log(`   Quality: ${metadata.quality?.overall_score?.toFixed(1) || 'N/A'}/10`);
          console.log(`   Tokens: ${metadata.tokensUsed?.total || 0}`);
          console.log(`   Duration: ${duration}ms`);
          console.log(`   Cost: $0.00 (FREE!) 🎉`);
        } else {
          console.warn('⚠️ CLI-based generation failed, falling back to template');
          console.warn('   Reason:', result.error || 'Unknown');
          prd = generateQuickModePRD(session, pattern);
        }
      } catch (error) {
        console.error('❌ CLI-based generation error:', error);
        console.error('   Error name:', (error as Error).name);
        console.error('   Error message:', (error as Error).message);
        console.error('   Stack trace:', (error as Error).stack);
        console.log('   Falling back to template generation...');
        prd = generateQuickModePRD(session, pattern);
      }
    } else if (useAPI) {
      // API-based generation (PAID with API key)
      console.log('🔧 Using API-based PRD generation (PAID)...');
      
      try {
        const orchestrator = new PRDOrchestrator(apiKey!);
        
        // Convert session answers to the format expected by orchestrator
        const answerMap: any = {};
        (session.answers || []).forEach((answer: any) => {
          answerMap[answer.questionId] = answer.answer;
        });
        
        // Determine pattern
        const patternId = session.userContext?.selectedPattern || 'stripe-saas';
        const normalizedPattern = patternId.replace(/-platform$/, '').replace(/saas/, 'saas');
        
        // Generate PRD with orchestrator
        const options: PRDGenerationOptions = {
          mode: mode as 'quick' | 'professional',
          pattern: normalizedPattern,
          includeEvidence: mode === 'professional',
          targetQuality: mode === 'professional' ? 8.5 : 7.0,
          sectionsToGenerate: [
            'executive_summary',
            'problem_statement',
            'solution_overview',
            'target_audience',
            'core_features',
            'technical_architecture'
          ]
        };
        
        const result = await orchestrator.generatePRD(answerMap, options);
        
        if (result.success && result.prd) {
          prd = result.prd;
          metadata = result.metadata;
          
          console.log('✅ Tool-based PRD generation successful');
          console.log(`   Quality: ${metadata.quality?.overall_score?.toFixed(1) || 'N/A'}/10`);
          console.log(`   Tokens: ${metadata.tokensUsed?.total || 0}`);
          console.log(`   Cost: $${metadata.cost?.toFixed(4) || '0.00'}`);
        } else {
          console.warn('⚠️ Tool-based generation failed, falling back to template');
          prd = generateQuickModePRD(session, pattern);
        }
      } catch (error) {
        console.error('❌ Tool-based generation error:', error);
        console.log('   Falling back to template generation...');
        prd = generateQuickModePRD(session, pattern);
      }
    } else {
      // Template-based generation (fallback)
      if (!apiKey) {
        console.log('⚠️ ANTHROPIC_API_KEY not set, using template generation');
      } else {
        console.log('📄 Using template-based PRD generation (useToolBased=false)');
      }
      
      if (mode === 'quick') {
        prd = generateQuickModePRD(session, pattern);
      } else {
        // Professional mode would be more comprehensive (15-20 pages)
        prd = generateQuickModePRD(session, pattern); // Using quick mode for now
      }
    }
    
    // Store the generated PRD in the session
    session.generatedPRD = prd;
    session.prdGeneratedAt = Date.now();
    session.prdMetadata = metadata;
    
    // Calculate stats
    const wordCount = prd.split(/\s+/).filter(w => w.length > 0).length;
    const pageEstimate = Math.ceil(wordCount / 250);
    
    return NextResponse.json({
      success: true,
      prd,
      format,
      sessionId,
      wordCount,
      pageEstimate,
      mode,
      pattern: pattern.name,
      generationMethod: useCLI ? 'cli-based (FREE)' : useAPI ? 'api-based (PAID)' : 'template',
      ...((useCLI || useAPI) && metadata ? {
        quality: metadata.quality,
        tokensUsed: metadata.tokensUsed,
        cost: metadata.cost,
        duration: metadata.duration
      } : {})
    });
    
  } catch (error) {
    console.error('PRD generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PRD'
    }, { status: 500 });
  }
}