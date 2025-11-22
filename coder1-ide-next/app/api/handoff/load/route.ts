import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handoffContent, skipQA } = body;
    
    if (!handoffContent) {
      return NextResponse.json(
        { success: false, error: 'Handoff content required' },
        { status: 400 }
      );
    }
    
    // Parse handoff document to extract context
    const handoffData = parseHandoffDocument(handoffContent);
    
    // Generate contextual questions (unless skipped)
    const questions = skipQA ? null : generateHandoffQuestions(handoffData);
    
    return NextResponse.json({
      success: true,
      handoffData,
      questions,
      message: skipQA 
        ? 'Handoff loaded successfully - session ready to continue' 
        : 'Handoff loaded - please answer questions for full context'
    });
  } catch (error) {
    console.error('Handoff load error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

interface HandoffData {
  summary: string;
  sessionType: string;
  duration: string;
  contextUsage?: {
    total: number;
    percentage: number;
    status: string;
  };
  accomplishments: string[];
  openFiles: string[];
  blockers: string[];
  keyDecisions: string[];
  nextSteps: string[];
  errors: string[];
  terminalHistory: string;
}

function parseHandoffDocument(content: string): HandoffData {
  const data: HandoffData = {
    summary: '',
    sessionType: 'General Development',
    duration: '0 minutes',
    accomplishments: [],
    openFiles: [],
    blockers: [],
    keyDecisions: [],
    nextSteps: [],
    errors: [],
    terminalHistory: ''
  };
  
  // Extract session type
  const typeMatch = content.match(/\*\*Session Type\*\*:\s*(.+)/);
  if (typeMatch) data.sessionType = typeMatch[1].trim();
  
  // Extract duration
  const durationMatch = content.match(/\*\*Duration\*\*:\s*(.+)/);
  if (durationMatch) data.duration = durationMatch[1].trim();
  
  // Extract context usage if present
  const contextMatch = content.match(/## 📊 Context Window Status[\s\S]*?- \*\*Current Usage\*\*:\s*([0-9,]+)\s*tokens\s*\((\d+)%\)/);
  if (contextMatch) {
    data.contextUsage = {
      total: parseInt(contextMatch[1].replace(/,/g, '')),
      percentage: parseInt(contextMatch[2]),
      status: contextMatch[2] >= '75' ? 'Critical' : contextMatch[2] >= '50' ? 'Warning' : 'Healthy'
    };
  }
  
  // Extract accomplishments
  const accomplishmentsSection = content.match(/### What Was Accomplished([\s\S]*?)(?=\n###|\n---)/);
  if (accomplishmentsSection) {
    const items = accomplishmentsSection[1].match(/^-\s+(.+)$/gm);
    if (items) {
      data.accomplishments = items.map(item => item.replace(/^-\s+/, '').trim());
    }
  }
  
  // Extract blockers
  const blockersSection = content.match(/## 🚧 Blockers & Issues([\s\S]*?)(?=\n##|\n---)/);
  if (blockersSection) {
    const items = blockersSection[1].match(/^-\s+(.+)$/gm);
    if (items) {
      data.blockers = items.map(item => item.replace(/^-\s+/, '').trim());
    }
  }
  
  // Extract key decisions
  const decisionsSection = content.match(/## ✅ Key Decisions Made([\s\S]*?)(?=\n##|\n---)/);
  if (decisionsSection) {
    const items = decisionsSection[1].match(/^-\s+(.+)$/gm);
    if (items) {
      data.keyDecisions = items.map(item => item.replace(/^-\s+/, '').trim());
    }
  }
  
  // Extract next steps
  const nextStepsSection = content.match(/### Immediate Actions([\s\S]*?)(?=\n###|\n---)/);
  if (nextStepsSection) {
    const items = nextStepsSection[1].match(/^\d+\.\s+(.+)$/gm);
    if (items) {
      data.nextSteps = items.map(item => item.replace(/^\d+\.\s+/, '').trim());
    }
  }
  
  // Extract terminal history
  const terminalSection = content.match(/### Terminal Output \(Last 1000 chars\)\s*```\s*([\s\S]*?)```/);
  if (terminalSection) {
    data.terminalHistory = terminalSection[1].trim();
  }
  
  // Create summary
  data.summary = `${data.sessionType} session (${data.duration})`;
  if (data.accomplishments.length > 0) {
    data.summary += ` - ${data.accomplishments.length} accomplishments`;
  }
  if (data.blockers.length > 0) {
    data.summary += `, ${data.blockers.length} blockers`;
  }
  
  return data;
}

function generateHandoffQuestions(handoffData: HandoffData): string[] {
  const questions: string[] = [];
  
  // Question 1: Clarify primary goal
  if (handoffData.nextSteps.length > 0) {
    questions.push(`What is your primary goal for this session? Continue with "${handoffData.nextSteps[0]}" or something else?`);
  } else {
    questions.push('What is your primary goal for this session?');
  }
  
  // Question 2: Address blockers (if any)
  if (handoffData.blockers.length > 0) {
    questions.push(`There are ${handoffData.blockers.length} blocker(s) from the previous session. Should we address these first, or proceed with new work?`);
  }
  
  // Question 3: Verify critical context
  if (handoffData.openFiles.length > 0) {
    questions.push(`The previous session had ${handoffData.openFiles.length} files open. Should I focus on the same files or different ones?`);
  }
  
  // Question 4: Context window status
  if (handoffData.contextUsage && handoffData.contextUsage.percentage >= 50) {
    questions.push(`Previous session reached ${handoffData.contextUsage.percentage}% context usage. Would you like me to optimize for context efficiency?`);
  }
  
  // Question 5: Any additional context
  questions.push('Is there any additional context or changes since the last session that I should know about?');
  
  return questions.slice(0, 5); // Max 5 questions
}
