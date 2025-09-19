/* 
===============================================================================
CANONICAL FILE - Smart PRD Generator Next.js Page
===============================================================================
File: page.tsx
Purpose: Next.js page for Smart Repository Patterns PRD Generator
Status: PRODUCTION - Created: January 20, 2025
===============================================================================
*/

'use client';

import { useEffect, useState } from 'react';

export default function SmartPRDGeneratorPage() {
  const [showPatterns, setShowPatterns] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  
  // Define the 5 different questions with their options
  const questions = [
    {
      text: "What type of application are you building?",
      options: ['SaaS Platform', 'E-commerce Platform', 'Developer Tools', 'Social Platform']
    },
    {
      text: "Who is your primary target audience?",
      options: ['Developers', 'Business Users', 'Consumers', 'Enterprise Clients']
    },
    {
      text: "What is your monetization strategy?",
      options: ['Subscription (SaaS)', 'One-time Purchase', 'Freemium', 'Marketplace/Commission']
    },
    {
      text: "What is your expected timeline to launch?",
      options: ['< 1 month', '1-3 months', '3-6 months', '6+ months']
    },
    {
      text: "What is your team size?",
      options: ['Solo founder', '2-5 people', '5-10 people', '10+ people']
    }
  ];
  
  // Debug log whenever currentQuestion changes
  useEffect(() => {
    console.log('Current question changed to:', currentQuestion);
    if (currentQuestion >= 1 && currentQuestion <= 5) {
      console.log('Question text:', questions[currentQuestion - 1].text);
      console.log('Question options:', questions[currentQuestion - 1].options);
    }
  }, [currentQuestion]);
  
  useEffect(() => {
    // Load patterns on mount
    fetch('/api/smart-prd/patterns')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPatterns(data.patterns || []);
        }
      })
      .catch(err => console.error('Error loading patterns:', err));
    
    // Force fix text colors after component mounts
    const fixTextColors = () => {
      // Fix all input and textarea elements
      document.querySelectorAll('input, textarea').forEach((el: any) => {
        el.style.color = '#111827';
        el.style.backgroundColor = '#ffffff';
      });
      
      // Fix all buttons with option-button class
      document.querySelectorAll('.option-button').forEach((el: any) => {
        el.style.color = '#111827';
      });
      
      // Fix question text
      document.querySelectorAll('.question-text').forEach((el: any) => {
        el.style.color = '#111827';
      });
    };
    
    // Apply immediately
    fixTextColors();
    
    // Apply after a delay to catch dynamic content
    const timer = setTimeout(fixTextColors, 500);
    
    // Set up observer for dynamic content
    const observer = new MutationObserver(fixTextColors);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [showQuestionnaire, currentQuestion]);

  const handleGeneratePRD = () => {
    console.log('Generate PRD clicked');
    setShowPatterns(true);
    setShowQuestionnaire(false);
  };

  const handleBrowsePatterns = () => {
    console.log('Browse Patterns clicked');
    setShowPatterns(true);
    setShowQuestionnaire(false);
  };

  const selectPattern = (patternId: string) => {
    console.log('Pattern selected, setting question to 1');
    setShowPatterns(false);
    setShowQuestionnaire(true);
    setCurrentQuestion(1);
  };
  
  const handleNextQuestion = () => {
    const nextQ = Math.min(5, currentQuestion + 1);
    console.log('Next clicked, changing from', currentQuestion, 'to', nextQ);
    setCurrentQuestion(nextQ);
  };
  
  const handlePrevQuestion = () => {
    const prevQ = Math.max(1, currentQuestion - 1);
    console.log('Prev clicked, changing from', currentQuestion, 'to', prevQ);
    setCurrentQuestion(prevQ);
  };

  const handleLaunchCoder1 = () => {
    window.location.href = '/ide';
  };

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(to bottom right, #eff6ff, #ffffff, #fdf4ff)',
      color: '#111827'
    }}>
      {/* Removed Tailwind CDN - using local Tailwind */}
      
      <style jsx global>{`
        .glassmorphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .gradient-text {
          background: linear-gradient(135deg, #6366f1, #ec4899, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pattern-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .pattern-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        /* Force dark text colors to override global white text */
        input, textarea, select {
          color: #111827 !important;
          background-color: #ffffff !important;
        }
        
        input::placeholder,
        textarea::placeholder {
          color: #6b7280 !important;
        }
        
        .question-text {
          color: #111827 !important;
        }
        .option-button {
          color: #111827 !important;
        }
        .option-button:hover {
          color: #111827 !important;
        }
        /* Fix questionnaire section text visibility */
        .questionnaire-section h2,
        .questionnaire-section h3,
        .questionnaire-section span,
        .questionnaire-section button {
          color: #111827 !important;
        }
        
        /* Fix ALL buttons in questionnaire */
        .questionnaire-section button:not(.nav-button):not([style*="background"]) {
          color: #111827 !important;
        }
        
        /* Fix navigation text */
        .nav-button {
          color: #4f46e5 !important;
        }
        .nav-button:hover {
          color: white !important;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glassmorphism">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                   style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-xl font-bold gradient-text">Smart Patterns</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  console.log('Nav Browse Patterns clicked!');
                  setShowPatterns(true);
                  setShowQuestionnaire(false);
                }}
                className="text-gray-600 hover:text-indigo-500 transition-colors"
              >
                Browse Patterns
              </button>
              <button 
                onClick={handleLaunchCoder1}
                className="px-4 py-2 rounded-lg text-white transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
              >
                Launch Coder1 →
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="pt-20 pb-16">
        {/* Hero Section */}
        {!showPatterns && !showQuestionnaire && (
          <section className="container mx-auto px-6 py-16 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
                 style={{ background: 'linear-gradient(135deg, #6366f133, #ec489933)' }}>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-gray-600">Free Professional PRD Generator</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center">
              Build Like the
              <br />
              <span className="gradient-text">Best Startups</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Generate professional PRDs using proven patterns from Notion, Stripe, GitHub, and other successful companies. 
              Get real architectural guidance and seamless handoff to Coder1 for implementation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={() => {
                  console.log('Generate PRD button clicked!');
                  setShowPatterns(true);
                  setShowQuestionnaire(false);
                }}
                className="px-8 py-4 rounded-lg text-lg font-semibold text-white transition-all hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
              >
                🚀 Generate My PRD (Free)
              </button>
              <button 
                onClick={() => {
                  console.log('Browse Patterns button clicked!');
                  setShowPatterns(true);
                  setShowQuestionnaire(false);
                }}
                className="px-8 py-4 rounded-lg text-lg font-semibold border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
              >
                📋 Browse Patterns
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>8 Proven Patterns</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>70%+ Success Rate</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>5-Page Professional PRDs</span>
              </div>
            </div>
          </section>
        )}

        {/* Pattern Selection */}
        {showPatterns && (
          <section className="container mx-auto px-6 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Success Pattern</h2>
              <p className="text-lg text-gray-600">Select the pattern that best matches your startup vision</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patterns.map((pattern) => (
                <div 
                  key={pattern.id}
                  onClick={() => selectPattern(pattern.id)}
                  className="pattern-card bg-white rounded-xl shadow-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{pattern.name}</h3>
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {pattern.successRate}% Success
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{pattern.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Time: {pattern.timeToMarket}</span>
                    <span className={`font-semibold ${
                      pattern.complexity === 'high' ? 'text-red-500' : 
                      pattern.complexity === 'medium' ? 'text-yellow-500' : 
                      'text-green-500'
                    }`}>
                      {pattern.complexity?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => { setShowPatterns(false); setShowQuestionnaire(false); }}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Home
              </button>
            </div>
          </section>
        )}

        {/* Questionnaire Interface */}
        {showQuestionnaire && (
          <section className="container mx-auto px-6 py-16 max-w-3xl questionnaire-section">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Smart Questionnaire</h2>
                <span className="text-sm text-gray-500">
                  Question {currentQuestion} of 5
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500" 
                  style={{
                    width: `${(currentQuestion / 5) * 100}%`,
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)'
                  }}
                ></div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h3 className="text-xl font-semibold mb-4 question-text" style={{ color: '#111827' }}>
                {currentQuestion >= 1 && currentQuestion <= 5 
                  ? questions[currentQuestion - 1].text 
                  : 'Invalid question index'}
              </h3>
              <div className="space-y-3">
                {currentQuestion >= 1 && currentQuestion <= 5 
                  ? questions[currentQuestion - 1].options.map((option) => (
                  <button 
                    key={option}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all option-button"
                    style={{ color: '#111827' }}
                  >
                    {option}
                  </button>
                  ))
                  : <div>Please select a question</div>}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <button 
                onClick={handlePrevQuestion}
                className={`px-6 py-3 border border-indigo-500 rounded-lg hover:bg-indigo-500 transition-all nav-button ${
                  currentQuestion <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={currentQuestion <= 1}
              >
                ← Previous
              </button>
              <button 
                onClick={handleNextQuestion}
                className="ml-auto px-8 py-3 text-white rounded-lg hover:shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
                disabled={currentQuestion >= 5}
              >
                {currentQuestion < 5 ? 'Next Question →' : 'Complete →'}
              </button>
            </div>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => { setShowQuestionnaire(false); setShowPatterns(true); }}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Patterns
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}