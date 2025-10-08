/**
 * PRD Generation Template
 * 
 * This file contains the 5 strategic questions and the AI prompt
 * for generating comprehensive Product Requirements Documents.
 */

export const PRD_QUESTIONS = [
  {
    id: 'problem',
    question: 'What problem are you solving?',
    placeholder: 'Describe the pain point or opportunity in detail...',
    helpText: 'Be specific about who has this problem and why it matters',
    examples: [
      'Remote teams struggle to track project progress across different time zones',
      'Freelancers waste 10+ hours/week on manual invoicing and payment follow-ups',
      'Small businesses can\'t afford enterprise-level customer support tools'
    ]
  },
  {
    id: 'users',
    question: 'Who are your target users?',
    placeholder: 'Describe your ideal users in detail...',
    helpText: 'Include demographics, behaviors, pain points, and goals',
    examples: [
      'Product managers at 50-500 person companies managing remote teams',
      'Freelance designers and developers earning $50k-$150k annually',
      'Small business owners (1-20 employees) in service industries'
    ]
  },
  {
    id: 'features',
    question: 'What are the core features?',
    placeholder: 'List the essential features your MVP needs...',
    helpText: 'Focus on the minimum viable set - what must be in v1?',
    examples: [
      'Real-time task updates, team chat, time zone conversion, weekly reports',
      'Invoice templates, automated reminders, payment tracking, expense categorization',
      'Live chat widget, ticket system, canned responses, basic analytics'
    ]
  },
  {
    id: 'metrics',
    question: 'What are your success metrics?',
    placeholder: 'How will you measure if this is working?',
    helpText: 'Include both business metrics and user engagement metrics',
    examples: [
      'User metrics: 80% weekly active users, <5% churn. Business: $10k MRR in 6 months',
      'Invoice sent-to-paid time under 7 days, 90% payment collection rate',
      'Average response time under 2 minutes, 85% customer satisfaction score'
    ]
  },
  {
    id: 'constraints',
    question: 'What are your constraints?',
    placeholder: 'Budget, timeline, technical limitations, or other constraints...',
    helpText: 'Be honest about what you can realistically build',
    examples: [
      'Solo founder, $5k budget, need MVP in 4 weeks, prefer no-code/low-code tools',
      'Bootstrap mode, must launch in 2 months, technical but limited backend experience',
      'Small team, $20k budget, 12-week timeline, must integrate with Stripe and Slack'
    ]
  }
];

/**
 * Generate the AI prompt for PRD creation
 */
export function generatePRDPrompt(answers: Record<string, string>): string {
  return `You are an expert product manager and technical architect. Based on the user's answers to 5 strategic questions, generate a comprehensive Product Requirements Document (PRD).

USER'S ANSWERS:

1. Problem: ${answers.problem}

2. Target Users: ${answers.users}

3. Core Features: ${answers.features}

4. Success Metrics: ${answers.metrics}

5. Constraints: ${answers.constraints}

---

Generate a comprehensive PRD with the following sections:

# Product Requirements Document

## 1. Executive Summary
(2-3 paragraphs summarizing the product, problem, and solution)

## 2. Problem Statement
- What problem exists?
- Who experiences this problem?
- Why is this problem worth solving?
- Current workarounds and their limitations

## 3. Target Audience
- Primary user personas (2-3 detailed profiles)
- User demographics and behaviors
- User pain points and goals
- Market size estimation

## 4. Product Vision & Goals
- Vision statement (1-2 sentences)
- Key objectives
- Success criteria
- What success looks like in 6 months, 1 year

## 5. Core Features (MVP)
For each feature:
- Feature name and description
- User story: "As a [user], I want [feature] so that [benefit]"
- Acceptance criteria (specific, testable)
- Priority: P0 (must-have), P1 (should-have), P2 (nice-to-have)

List at least 5-8 core features based on their input.

## 6. User Flows
- Onboarding flow
- Core feature usage flow
- Edge cases and error handling

## 7. Technical Requirements
- Recommended tech stack (frontend, backend, database, hosting)
- Third-party integrations needed
- API requirements
- Performance requirements
- Security considerations
- Scalability considerations

## 8. Non-Functional Requirements
- Performance (load times, response times)
- Security (authentication, data protection)
- Accessibility (WCAG compliance)
- Mobile responsiveness
- Browser compatibility

## 9. Success Metrics & KPIs
- User acquisition metrics
- Engagement metrics
- Revenue/business metrics
- Technical metrics (uptime, performance)
- How to measure each metric

## 10. Timeline & Milestones
Based on their constraints, suggest:
- Phase 1: MVP (weeks 1-X)
- Phase 2: Beta launch (weeks X-Y)
- Phase 3: Public launch (weeks Y-Z)
- Phase 4: Post-launch optimization

## 11. Risks & Mitigation
- Technical risks
- Market risks
- Resource risks
- Mitigation strategies for each

## 12. Open Questions
- 3-5 questions that need answers before building
- Assumptions that need validation
- Areas requiring user research

## 13. Out of Scope (for MVP)
- Features that are explicitly NOT included in v1
- Why they're deferred
- When they might be considered

---

IMPORTANT GUIDELINES:
- Be specific and actionable
- Include concrete examples
- Consider the constraints they mentioned
- Make realistic recommendations based on their budget and timeline
- If they have limited technical skills, recommend no-code/low-code tools
- If they have a tight budget, suggest open-source alternatives
- Include user stories in the format: "As a [persona], I want [feature] so that [benefit]"
- Make success metrics SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Suggest a realistic tech stack based on their constraints

Format the output in clean Markdown with proper headers, lists, and formatting.`;
}

/**
 * Parse the generated PRD into structured sections
 */
export function parsePRD(prdText: string) {
  const sections = prdText.split('\n## ').filter(s => s.trim());
  
  return {
    fullText: prdText,
    sections: sections.map(section => {
      const [title, ...content] = section.split('\n');
      return {
        title: title.replace(/^#\s*/, '').trim(),
        content: content.join('\n').trim()
      };
    })
  };
}
