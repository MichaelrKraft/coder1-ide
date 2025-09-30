/* 
===============================================================================
Smart PRD Generator - Next Question API
===============================================================================
File: app/api/smart-prd/sessions/[sessionId]/next-question/route.ts
Purpose: Get the next question in the questionnaire flow
Status: PRODUCTION - Created: January 20, 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';

// Import the sessions map from the parent route
const sessions = (global as any).prdSessions || new Map();

// Initialize global sessions if not exists
if (!(global as any).prdSessions) {
  (global as any).prdSessions = sessions;
}

// Smart questions for each pattern (Quick Mode - 5 questions)
const quickModeQuestions = {
  'stripe-saas-platform': [
    {
      id: 'product-name',
      text: 'What is the name of your payment platform?',
      type: 'text',
      placeholder: 'e.g., PayFlow, QuickPay, etc.'
    },
    {
      id: 'target-market',
      text: 'Who is your primary target market?',
      type: 'choice',
      choices: [
        { value: 'startups', label: 'Startups & Small Businesses' },
        { value: 'enterprise', label: 'Enterprise Companies' },
        { value: 'developers', label: 'Individual Developers' },
        { value: 'marketplaces', label: 'Online Marketplaces' }
      ]
    },
    {
      id: 'core-differentiator',
      text: 'What is your main competitive advantage?',
      type: 'text',
      placeholder: 'What makes your platform unique?'
    },
    {
      id: 'revenue-model',
      text: 'How will you charge for your service?',
      type: 'multiple',
      choices: [
        { value: 'transaction-fee', label: 'Transaction Fees (%)' },
        { value: 'subscription', label: 'Monthly Subscriptions' },
        { value: 'freemium', label: 'Freemium Model' },
        { value: 'enterprise', label: 'Enterprise Licensing' }
      ]
    },
    {
      id: 'launch-timeline',
      text: 'When do you want to launch your MVP?',
      type: 'choice',
      choices: [
        { value: '1-month', label: 'Within 1 month' },
        { value: '3-months', label: '1-3 months' },
        { value: '6-months', label: '3-6 months' },
        { value: 'no-rush', label: 'No specific timeline' }
      ]
    }
  ],
  // Default questions for patterns without specific ones
  'default': [
    {
      id: 'product-name',
      text: 'What is the name of your product?',
      type: 'text',
      placeholder: 'Enter your product name'
    },
    {
      id: 'problem-statement',
      text: 'What problem are you solving?',
      type: 'text',
      placeholder: 'Describe the main problem your product addresses'
    },
    {
      id: 'target-users',
      text: 'Who are your target users?',
      type: 'text',
      placeholder: 'Describe your ideal user persona'
    },
    {
      id: 'key-features',
      text: 'What are the 3 most important features?',
      type: 'text',
      placeholder: 'List your top 3 features separated by commas'
    },
    {
      id: 'success-metric',
      text: 'How will you measure success?',
      type: 'text',
      placeholder: 'Define your primary success metric'
    }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    // Get session
    const session = sessions.get(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }
    
    // Get pattern-specific questions
    const patternId = session.userContext?.selectedPattern || 'default';
    const questions = quickModeQuestions[patternId] || quickModeQuestions['default'];
    
    // Get current question based on answers length
    const currentIndex = session.answers?.length || 0;
    
    if (currentIndex >= questions.length) {
      return NextResponse.json({
        success: true,
        completed: true,
        message: 'Questionnaire already complete',
        sessionId
      });
    }
    
    const currentQuestion = questions[currentIndex];
    
    return NextResponse.json({
      success: true,
      completed: false,
      question: currentQuestion,
      progress: {
        current: currentIndex + 1,
        total: questions.length,
        percentage: Math.round(((currentIndex + 1) / questions.length) * 100)
      },
      sessionId
    });
    
  } catch (error) {
    console.error('Get next question error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get next question'
    }, { status: 500 });
  }
}