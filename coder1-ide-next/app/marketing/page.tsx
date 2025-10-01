import Link from 'next/link';
import { Code, FileText, Users, Star, Github, DollarSign, Brain, Bot } from 'lucide-react';
import { glows } from '@/lib/design-tokens';
import MemoryPersistenceDemo from '@/components/landing/MemoryPersistenceDemo';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header Navigation */}
      <header className="border-b border-border-default bg-bg-primary/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-8 h-8 text-coder1-cyan" />
              <span className="text-2xl font-bold bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
                Coder1
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-text-secondary hover:text-coder1-cyan transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-text-secondary hover:text-coder1-cyan transition-colors">
                Pricing
              </Link>
              <Link href="https://github.com/MichaelrKraft/autonomous_vibe_interface" className="flex items-center gap-2 text-text-secondary hover:text-coder1-cyan transition-colors">
                <Github className="w-4 h-4" />
                GitHub
              </Link>
              <Link href="/ide" className="bg-coder1-cyan text-black px-4 py-2 rounded-lg font-medium hover:bg-coder1-cyan/90 transition-colors">
                It's Free
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section - Minimized for laptop logo visibility */}
      <div className="text-center py-2 px-6">
        <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
          The Only Agentic IDE With Built-In Contextual Memory
        </h1>
        <p className="text-base text-text-secondary mb-3 max-w-2xl mx-auto">
          90% cost reduction + Built specifically for Claude Code. Experience Coder1&apos;s revolutionary Eternal Memory.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-text-muted mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" />
            <span>Free Forever</span>
          </div>
          <div className="flex items-center gap-1">
            <Github className="w-3 h-3" />
            <span>1,000+ Stars</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Production Ready</span>
          </div>
        </div>
      </div>

      {/* Memory Persistence Demo - Keep this excellent demo! */}
      <MemoryPersistenceDemo />
      
      {/* Enhanced Landing Content */}
      <div className="flex items-center justify-center p-8">
        <div className="max-w-6xl w-full">
          
          {/* Dual Call-to-Actions */}
          <div className="text-center mb-16">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Link
                href="/ide"
                className="group relative px-8 py-4 bg-gradient-to-r from-coder1-cyan to-blue-500 text-black font-semibold rounded-lg hover:shadow-2xl transition-all duration-300 text-lg"
              >
                Open Coder 1
                <div 
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: glows.cyan.intense }}
                />
              </Link>
              
              <Link
                href="/templates"
                className="group relative px-8 py-4 bg-gradient-to-r from-coder1-purple to-purple-500 text-white font-semibold rounded-lg hover:shadow-2xl transition-all duration-300 text-lg"
              >
                Generate PRD
                <div 
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: glows.purple.intense }}
                />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <span className="text-green-400">✓</span>
                <span>Free for individual developers</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-400">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-400">✓</span>
                <span>100 AI requests/month</span>
              </div>
            </div>
            <p className="text-text-muted mt-4">Join 1,000+ developers building the future with AI</p>
          </div>

          {/* Three Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center p-6 bg-bg-secondary border border-border-default rounded-lg">
              <DollarSign className="w-12 h-12 mb-4 text-green-400 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Cost Savings</h3>
              <p className="text-text-secondary">Coder 1 is Free</p>
              <p className="text-sm text-text-muted mt-2">Uses Claude CLI, not expensive API's</p>
            </div>

            <div className="text-center p-6 bg-bg-secondary border border-border-default rounded-lg">
              <Brain className="w-12 h-12 mb-4 text-coder1-purple mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Eternal Memory</h3>
              <p className="text-text-secondary">Never lose context between sessions</p>
              <p className="text-sm text-text-muted mt-2">Remember conversations from weeks ago</p>
            </div>

            <div className="text-center p-6 bg-bg-secondary border border-border-default rounded-lg">
              <Bot className="w-12 h-12 mb-4 text-orange-400 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">AI Supervision</h3>
              <p className="text-text-secondary">The only IDE built for Claude Code</p>
              <p className="text-sm text-text-muted mt-2">AI supervises claude code while you sleep</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="text-center p-8 bg-bg-secondary border border-border-default rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-text-primary">Join the Revolution</h2>
            <p className="text-text-secondary mb-6">The first IDE built specifically for Claude Code users</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-coder1-cyan" />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>1,000+ GitHub Stars</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                <span>Active Community</span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-coder1-purple" />
                <span>Production Ready</span>
              </div>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}