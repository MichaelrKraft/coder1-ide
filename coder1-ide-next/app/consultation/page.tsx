'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Code, Users, Database, Zap, Package } from 'lucide-react';
import { claudeService } from '@/lib/claude-service';
import { glows } from '@/lib/design-tokens';

const questions = [
  {
    id: 1,
    question: "What type of application are you building?",
    placeholder: "e.g., E-commerce platform, Social media app, Dashboard...",
    icon: Code,
  },
  {
    id: 2,
    question: "Who is your ideal customer avatar?",
    placeholder: "e.g., Small business owners, Students, Developers...",
    icon: Users,
  },
  {
    id: 3,
    question: "Do you need user authentication? (yes/no)",
    placeholder: "yes or no",
    icon: Zap,
  },
  {
    id: 4,
    question: "Will you need a database or API? (yes/no)",
    placeholder: "yes or no",
    icon: Database,
  },
  {
    id: 5,
    question: "Any special requirements or features?",
    placeholder: "e.g., Real-time updates, AI integration, Payment processing...",
    icon: Package,
  },
];

export default function AIConsultationPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = async () => {
    if (!currentAnswer.trim()) return;

    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Process consultation and transition to IDE
      setIsProcessing(true);
      
      try {
        // Process with Claude
        const brief = await claudeService.processConsultation(newAnswers);
        const tasks = await claudeService.generateAgentTasks(brief);
        
        // Store in session/localStorage for IDE to pick up
        localStorage.setItem('consultationBrief', JSON.stringify(brief));
        localStorage.setItem('agentTasks', JSON.stringify(tasks));
        
        // Redirect to IDE with agents auto-spawned
        router.push('/ide?autoSpawn=true');
      } catch (error) {
        console.error('Consultation processing failed:', error);
        setIsProcessing(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const CurrentIcon = questions[currentQuestion]?.icon || Code;

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-coder1-cyan to-coder1-purple rounded-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
            AI Development Consultation
          </h1>
          <p className="text-lg text-text-secondary">
            Let&apos;s understand your project needs
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-text-muted mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-coder1-cyan to-coder1-purple transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {!isProcessing ? (
          <div className="bg-bg-secondary border border-border-default rounded-lg p-8">
            <div className="flex items-center gap-4 mb-6">
              <CurrentIcon className="w-8 h-8 text-coder1-cyan" />
              <h2 className="text-2xl font-semibold text-text-primary">
                {questions[currentQuestion].question}
              </h2>
            </div>
            
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={questions[currentQuestion].placeholder}
              className="w-full h-32 px-4 py-3 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:border-coder1-cyan focus:outline-none transition-colors resize-none"
              autoFocus
            />
            
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  if (currentQuestion > 0) {
                    setCurrentQuestion(currentQuestion - 1);
                    setCurrentAnswer(answers[currentQuestion - 1] || '');
                    setAnswers(answers.slice(0, -1));
                  }
                }}
                disabled={currentQuestion === 0}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <button
                onClick={handleNext}
                disabled={!currentAnswer.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                style={{
                  boxShadow: currentAnswer.trim() ? glows.cyan.medium : 'none',
                }}
              >
                {currentQuestion === questions.length - 1 ? 'Start Building' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border-default rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-coder1-cyan border-t-transparent mx-auto mb-6" />
            <h3 className="text-2xl font-semibold mb-4">Processing Your Requirements...</h3>
            <p className="text-text-secondary">
              Claude is analyzing your needs and preparing your development environment
            </p>
            <div className="mt-8 space-y-2">
              <p className="text-sm text-coder1-cyan">✓ Analyzing requirements</p>
              <p className="text-sm text-text-muted">⟳ Generating project structure</p>
              <p className="text-sm text-text-muted">⟳ Spawning AI agents</p>
            </div>
          </div>
        )}

        {/* Previous Answers Summary */}
        {answers.length > 0 && !isProcessing && (
          <div className="mt-8 p-4 bg-bg-secondary border border-border-default rounded-lg">
            <h3 className="text-sm font-semibold text-text-muted mb-2">Your Answers:</h3>
            <div className="space-y-1">
              {answers.map((answer, idx) => (
                <div key={idx} className="text-sm text-text-secondary">
                  <span className="text-coder1-cyan">Q{idx + 1}:</span> {answer}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}