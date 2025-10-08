'use client';

import { useState } from 'react';
import { PRD_QUESTIONS } from '@/lib/prd-template';
import { exportAsMarkdown, exportAsJSON, exportAsPDF, generateCoder1HandoffURL } from '@/lib/export-utils';

export default function Home() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPRD, setGeneratedPRD] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = PRD_QUESTIONS[step];
  const isLastQuestion = step === PRD_QUESTIONS.length - 1;

  const handleAnswer = () => {
    if (!answers[currentQuestion.id]?.trim()) {
      setError('Please provide an answer before continuing');
      return;
    }

    setError(null);

    if (isLastQuestion) {
      generatePRD();
    } else {
      setStep(step + 1);
    }
  };

  const generatePRD = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PRD');
      }

      setGeneratedPRD(data.prd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PRD');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setAnswers({});
    setGeneratedPRD(null);
    setError(null);
  };

  const handleLaunchInCoder1 = () => {
    if (!generatedPRD) return;
    const url = generateCoder1HandoffURL(generatedPRD, answers);
    window.open(url, '_blank');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">C1</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Coder1 PRD Generator</h1>
              <p className="text-slate-400 text-sm">AI-Powered Product Requirements</p>
            </div>
          </div>
          <a
            href="https://github.com/MichaelrKraft/coder1-prd-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition"
          >
            ⭐ Star on GitHub
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {!generatedPRD ? (
          /* Question Flow */
          <div className="space-y-8">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Question {step + 1} of {PRD_QUESTIONS.length}</span>
                <span className="text-cyan-400">{Math.round(((step + 1) / PRD_QUESTIONS.length) * 100)}% Complete</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                  style={{ width: `${((step + 1) / PRD_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentQuestion.question}
              </h2>
              <p className="text-slate-400 mb-6">{currentQuestion.helpText}</p>

              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                placeholder={currentQuestion.placeholder}
                className="w-full h-48 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                disabled={isGenerating}
              />

              {/* Examples */}
              <details className="mt-4">
                <summary className="text-cyan-400 cursor-pointer hover:text-cyan-300 text-sm">
                  Show examples
                </summary>
                <div className="mt-3 space-y-2">
                  {currentQuestion.examples.map((example, i) => (
                    <div key={i} className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded border border-slate-700">
                      {example}
                    </div>
                  ))}
                </div>
              </details>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0 || isGenerating}
                className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ← Back
              </button>

              <button
                onClick={handleAnswer}
                disabled={isGenerating || !answers[currentQuestion.id]?.trim()}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isGenerating ? 'Generating PRD...' : isLastQuestion ? 'Generate PRD' : 'Next →'}
              </button>
            </div>
          </div>
        ) : (
          /* Generated PRD Display */
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                ✨ Your PRD is Ready!
              </h2>
              <p className="text-slate-300">
                We've generated a comprehensive Product Requirements Document based on your answers.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLaunchInCoder1}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-medium transition flex items-center gap-2"
              >
                🚀 Build This in Coder1 IDE
              </button>
              <button
                onClick={() => exportAsMarkdown(generatedPRD)}
                className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                📝 Export as Markdown
              </button>
              <button
                onClick={() => exportAsJSON(generatedPRD, answers)}
                className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                💾 Export as JSON
              </button>
              <button
                onClick={() => exportAsPDF(generatedPRD)}
                className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                📄 Export as PDF
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition ml-auto"
              >
                ↻ Generate Another PRD
              </button>
            </div>

            {/* PRD Content */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
              <div className="prose prose-invert prose-slate max-w-none">
                <div
                  className="text-slate-200 whitespace-pre-wrap font-mono text-sm"
                  dangerouslySetInnerHTML={{
                    __html: generatedPRD
                      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-8 mb-4">$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-cyan-400 mt-6 mb-3">$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-slate-300 mt-4 mb-2">$1</h3>')
                      .replace(/^- (.*$)/gim, '<li class="ml-4 text-slate-300">$1</li>')
                      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white">$1</strong>')
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-400 text-sm">
              Made with ❤️ by <a href="https://coder1.dev" className="text-cyan-400 hover:text-cyan-300">Coder1</a>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="https://github.com/MichaelrKraft/coder1-prd-generator" className="text-slate-400 hover:text-cyan-400 transition">
                GitHub
              </a>
              <a href="https://github.com/MichaelrKraft/coder1-community" className="text-slate-400 hover:text-cyan-400 transition">
                Community
              </a>
              <a href="https://coder1.dev" className="text-slate-400 hover:text-cyan-400 transition">
                Coder1 IDE
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
