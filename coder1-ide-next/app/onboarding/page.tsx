'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Download, Terminal, Zap, ChevronRight, AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [claudeDetected, setClaudeDetected] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [claudeCommand, setClaudeCommand] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [validating, setValidating] = useState(false);
  
  // Detect Claude CLI on mount
  useEffect(() => {
    detectClaude();
  }, []);

  const detectClaude = async () => {
    setDetecting(true);
    try {
      const response = await fetch('/api/claude/detect');
      const detection = await response.json();
      setClaudeDetected(detection.available);
      setClaudeCommand(detection.command);
      if (detection.available) {
        // Auto-advance if Claude is detected
        setTimeout(() => setCurrentStep(2), 1500);
      }
    } catch (error) {
      console.error('Error detecting Claude:', error);
      setClaudeDetected(false);
    } finally {
      setDetecting(false);
    }
  };

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    
    // For now, just save to localStorage and proceed
    // In production, this would validate with your license server
    localStorage.setItem('coder1_email', email);
    localStorage.setItem('coder1_license', licenseKey || 'free-trial');
    
    setTimeout(() => {
      setValidating(false);
      setCurrentStep(3);
      // Redirect to IDE after a brief delay
      setTimeout(() => {
        router.push('/ide');
      }, 2000);
    }, 1000);
  };

  const skipToFreeTrial = () => {
    localStorage.setItem('coder1_email', 'trial@coder1.app');
    localStorage.setItem('coder1_license', 'free-trial');
    router.push('/ide');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-2xl w-full">
          {/* Logo & Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl mb-6 shadow-2xl">
              <Terminal className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Welcome to Coder1
            </h1>
            <p className="text-xl text-gray-400">
              The IDE where Claude never forgets your context
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${currentStep >= step 
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-400'}
                  transition-all duration-500
                `}>
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-24 h-1 mx-3 ${currentStep > step ? 'bg-cyan-400' : 'bg-gray-700'} transition-all duration-500`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-700">
            {/* Step 1: Claude CLI Detection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-4">Step 1: Detecting Claude CLI</h2>
                
                {detecting ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                      <Terminal className="absolute inset-0 m-auto w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                ) : claudeDetected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <Check className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="font-semibold text-green-400">Claude CLI Detected!</p>
                        <p className="text-sm text-gray-400">Found: {claudeCommand}</p>
                      </div>
                    </div>
                    <p className="text-gray-400">
                      Great! Claude Code CLI is installed and ready to use.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-400">Claude CLI Not Found</p>
                        <p className="text-sm text-gray-400">Please install Claude Code CLI to continue</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-gray-400">To use Coder1, you need Claude Code CLI installed:</p>
                      <ol className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400">1.</span>
                          <span>Visit <a href="https://claude.ai/code" target="_blank" className="text-cyan-400 hover:underline">claude.ai/code</a></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400">2.</span>
                          <span>Sign in with your Claude account</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400">3.</span>
                          <span>Download and install Claude Code CLI</span>
                        </li>
                      </ol>
                      
                      <div className="flex gap-3 mt-6">
                        <a 
                          href="https://claude.ai/code" 
                          target="_blank"
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          Get Claude Code CLI
                        </a>
                        <button
                          onClick={detectClaude}
                          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                        >
                          Retry Detection
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: License Setup */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-4">Step 2: Set Up Your Account</h2>
                
                <form onSubmit={handleLicenseSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:border-cyan-400 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      License Key <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="XXX-YYY-ZZZ (leave empty for free trial)"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      No license key? Start with a free trial - no credit card required!
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={validating || !email}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {validating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={skipToFreeTrial}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                    >
                      Skip to Free Trial
                    </button>
                  </div>
                </form>
                
                <div className="pt-6 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-900/30 rounded-lg">
                      <p className="font-semibold text-cyan-400 mb-1">Free Trial</p>
                      <p className="text-gray-400">Basic IDE + Claude integration</p>
                      <p className="text-gray-500 text-xs mt-1">Sessions expire daily</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
                      <p className="font-semibold text-cyan-400 mb-1">Pro ($29/mo)</p>
                      <p className="text-gray-400">Infinite memory persistence</p>
                      <p className="text-gray-500 text-xs mt-1">Claude never forgets</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <div className="space-y-6 text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-cyan-500 rounded-full mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold mb-4">You're All Set!</h2>
                <p className="text-xl text-gray-400 mb-8">
                  Launching Coder1 IDE with memory persistence...
                </p>
                
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse animation-delay-200" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse animation-delay-400" />
                </div>
                
                <p className="text-sm text-gray-500 mt-8">
                  Redirecting to IDE in a moment...
                </p>
              </div>
            )}
          </div>

          {/* Help Text */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Need help? Visit our <a href="/docs" className="text-cyan-400 hover:underline">documentation</a> or contact support
          </p>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
}