'use client';

import { useState } from 'react';

interface Question {
  question: string;
  options: string[];
  type?: string;
}

export default function SmartPRDGeneratorFixed() {
  const [currentStep, setCurrentStep] = useState('hero'); // 'hero', 'patterns', 'questions'
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

  // Original questionnaire structure with ALL the options
  const questions: Question[] = [
    {
      question: "Describe the application you'd like to build:",
      options: [], // Free text input
      type: "text"
    },
    {
      question: "What type of application are you building?",
      options: ["SaaS Platform", "E-commerce Platform", "Developer Tools", "Social Platform"]
    },
    {
      question: "Who is your target audience?",
      options: ["Developers", "Business Users", "Consumers", "Enterprise"]
    },
    {
      question: "What's your primary monetization strategy?",
      options: ["Subscription (Monthly/Annual)", "One-time Purchase", "Freemium Model", "Transaction Fees"]
    },
    {
      question: "What's your estimated timeline to launch?",
      options: ["1-3 months", "3-6 months", "6-12 months", "12+ months"]
    },
    {
      question: "What's your team size?",
      options: ["Solo Founder", "2-5 people", "5-10 people", "10+ people"]
    }
  ];

  const totalQuestions = questions.length;

  const selectOption = (questionNum: number, option: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionNum]: option
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Generate PRD
      console.log('Generating PRD with answers:', selectedAnswers);
      alert('PRD Generation Complete! (This would normally generate the PRD)');
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const getCurrentQuestionData = () => {
    return questions[currentQuestion - 1];
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Dark Theme Styling */
          body {
            background: linear-gradient(135deg, #0f0f23, #1a1a2e, #16213e) !important;
            margin: 0;
            padding: 0;
            color: #e2e8f0 !important;
          }
          
          /* Dark theme text colors */
          h1, h2, h3, h4, h5, h6 {
            color: #f1f5f9 !important;
          }
          
          p, span, div {
            color: #cbd5e1 !important;
          }
          
          /* Form elements with dark theme */
          input, textarea {
            color: #f1f5f9 !important;
            background: rgba(30, 41, 59, 0.8) !important;
            border: 1px solid rgba(100, 116, 139, 0.3) !important;
            -webkit-text-fill-color: #f1f5f9 !important;
          }
          
          input:focus, textarea:focus {
            background: rgba(30, 41, 59, 0.9) !important;
            border-color: #6366f1 !important;
            outline: none !important;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
          }
          
          /* Dark theme buttons */
          button {
            transition: all 0.2s ease !important;
          }
          
          /* Progress bar dark styling */
          .progress-bg {
            background: rgba(30, 41, 59, 0.6) !important;
          }
          
          /* Card styling for dark theme */
          .card-dark {
            background: rgba(30, 41, 59, 0.8) !important;
            border: 1px solid rgba(100, 116, 139, 0.2) !important;
            backdrop-filter: blur(10px) !important;
          }
          
          /* Option buttons dark theme */
          .option-button-dark {
            background: rgba(30, 41, 59, 0.6) !important;
            border: 2px solid rgba(100, 116, 139, 0.3) !important;
            color: #e2e8f0 !important;
          }
          
          .option-button-dark:hover {
            background: rgba(99, 102, 241, 0.1) !important;
            border-color: #6366f1 !important;
            color: #f1f5f9 !important;
          }
          
          .option-button-dark.selected {
            background: rgba(99, 102, 241, 0.2) !important;
            border-color: #6366f1 !important;
            color: #f1f5f9 !important;
          }
          
          /* Placeholder text */
          ::placeholder {
            color: #94a3b8 !important;
            opacity: 1 !important;
          }
          
          /* Navigation buttons dark theme */
          .nav-button-outline {
            border: 2px solid #6366f1 !important;
            background: transparent !important;
            color: #6366f1 !important;
          }
          
          .nav-button-outline:hover {
            background: #6366f1 !important;
            color: white !important;
          }
          
          .nav-button-outline:disabled {
            border-color: rgba(100, 116, 139, 0.5) !important;
            color: rgba(100, 116, 139, 0.5) !important;
            cursor: not-allowed !important;
          }
          
          /* Loading animation */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
      
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f0f23, #1a1a2e, #16213e)',
        padding: '40px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Hero Section */}
        {currentStep === 'hero' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', paddingTop: '60px' }}>
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.1)', 
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '50px',
              padding: '12px 24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '40px'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#10b981' 
              }}></span>
              <span style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                Free Professional PRD Generator
              </span>
            </div>
            
            <h1 style={{ 
              color: '#f1f5f9', 
              fontSize: '64px', 
              fontWeight: 'bold',
              marginBottom: '20px',
              lineHeight: '1.1'
            }}>
              Build Like the
              <br />
              <span style={{ 
                background: 'linear-gradient(135deg, #6366f1, #ec4899, #10b981)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Best Startups
              </span>
            </h1>
            
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '20px', 
              marginBottom: '50px',
              maxWidth: '700px',
              margin: '0 auto 50px auto',
              lineHeight: '1.6'
            }}>
              Generate professional PRDs using proven patterns from Notion, Stripe, GitHub, and other successful companies. 
              Get real architectural guidance and seamless handoff to Coder1 for implementation.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginBottom: '60px' }}>
              <button 
                onClick={() => setCurrentStep('patterns')}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
                }}
              >
                🚀 Generate My PRD (Free)
              </button>
              <button 
                onClick={() => setCurrentStep('patterns')}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: '2px solid #6366f1',
                  background: 'transparent',
                  color: '#6366f1',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                📋 Browse Patterns
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>8 Proven Patterns</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>70%+ Success Rate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>5-Page Professional PRDs</span>
              </div>
            </div>
          </div>
        )}

        {/* Simple Patterns Selection - Skip for now */}
        {currentStep === 'patterns' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>
              Skip to Questionnaire
            </h2>
            <button 
              onClick={() => setCurrentStep('questions')}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              Start Questionnaire →
            </button>
            <br />
            <button 
              onClick={() => setCurrentStep('hero')}
              style={{
                color: '#6366f1',
                background: 'transparent',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ← Back to Home
            </button>
          </div>
        )}

        {/* Original Questionnaire with ALL Options */}
        {currentStep === 'questions' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ 
                color: '#f1f5f9', 
                fontSize: '48px', 
                fontWeight: 'bold',
                marginBottom: '10px' 
              }}>
                Smart PRD Generator
              </h1>
              <p style={{ color: '#cbd5e1', fontSize: '18px' }}>
                Generate professional PRDs using proven patterns
              </p>
            </div>
            
            {/* Progress Bar */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#f1f5f9', fontWeight: '600' }}>
                  Question {currentQuestion} of {totalQuestions}
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  {Math.round((currentQuestion / totalQuestions) * 100)}% Complete
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                background: 'rgba(30, 41, 59, 0.6)', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(currentQuestion / totalQuestions) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
            
            {/* Current Question */}
            <div className="card-dark" style={{ 
              background: 'rgba(30, 41, 59, 0.8)', 
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              padding: '32px',
              marginBottom: '30px',
              border: '1px solid rgba(100, 116, 139, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ color: '#f1f5f9', fontSize: '24px', marginBottom: '24px', fontWeight: '600' }}>
                {getCurrentQuestionData().question}
              </h2>
              
              {getCurrentQuestionData().type === 'text' ? (
                <textarea 
                  value={selectedAnswers[currentQuestion] || ''}
                  onChange={(e) => selectOption(currentQuestion, e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    background: 'rgba(30, 41, 59, 0.8)',
                    fontSize: '16px',
                    minHeight: '120px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Describe your application idea in detail..."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {getCurrentQuestionData().options.map((option, index) => {
                    const isSelected = selectedAnswers[currentQuestion] === option;
                    
                    return (
                      <button
                        key={option}
                        onClick={() => selectOption(currentQuestion, option)}
                        className={`option-button-dark ${isSelected ? 'selected' : ''}`}
                        style={{
                          padding: '16px',
                          border: isSelected ? '2px solid #6366f1' : '2px solid rgba(100, 116, 139, 0.3)',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                          color: '#e2e8f0',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '16px',
                          fontWeight: isSelected ? '600' : '400',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid ' + (isSelected ? '#6366f1' : 'rgba(100, 116, 139, 0.5)'),
                          borderRadius: '50%',
                          background: isSelected ? '#6366f1' : 'transparent'
                        }}></div>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Navigation Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '30px'
            }}>
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 1}
                className="nav-button-outline"
                style={{
                  padding: '12px 24px',
                  border: '2px solid #6366f1',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#6366f1',
                  cursor: currentQuestion === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  opacity: currentQuestion === 1 ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                ← Previous
              </button>
              
              <button
                onClick={nextQuestion}
                style={{
                  padding: '12px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                {currentQuestion === totalQuestions ? 'Generate PRD →' : 'Next Question →'}
              </button>
            </div>
            
            {/* Back to Patterns */}
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={() => setCurrentStep('patterns')}
                style={{
                  color: '#6366f1',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                ← Back to Patterns
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}