"use client";

import React from 'react';
import Image from 'next/image';
import { BackgroundGradient } from "@/components/ui/background-gradient";

export default function Coder1LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-cyan-500/10 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <a href="/" className="flex items-center gap-3">
              <Image 
                src="/Coder1-Logo-Sharp.svg" 
                alt="Coder1 Logo" 
                width={122} 
                height={122}
                className="w-[122px] h-[122px]"
              />
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white hover:text-cyan-400 transition-colors">Features</a>
              <a href="#pricing" className="text-white hover:text-cyan-400 transition-colors">Pricing</a>
              <a href="/docs" className="text-white hover:text-cyan-400 transition-colors">Docs</a>
              <a href="/blog" className="text-white hover:text-cyan-400 transition-colors">Blog</a>
              <a href="/ide" className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5">
                Start for Free
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-44 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600/20 to-cyan-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-8 animate-pulse">
            <span className="text-2xl">🧠</span>
            <span className="font-semibold text-gray-800 dark:text-white">Revolutionary Memory Technology</span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-purple-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent leading-normal">
            The Only IDE That<br />Never Forgets
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-16 max-w-3xl mx-auto">
            Your context, decisions, and preferences - remembered forever
          </p>

        {/* Memory Comparison Screenshot */}
        <div className="w-full max-w-4xl mx-auto mb-12">
          <Image 
            src="/memory-comparison.svg" 
            alt="Memory Comparison - Before and After" 
            width={800} 
            height={600}
            className="w-full h-auto rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700"
          />
        </div>

        {/* Audience Hooks - moved after animation */}
        <div className="max-w-7xl mx-auto px-6 pt-12 relative z-10">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10">
              <div className="text-purple-600 font-bold text-sm uppercase tracking-wider mb-2">Vibe Coders</div>
              <div className="font-semibold text-lg text-gray-800 dark:text-gray-200">AI that actually understands your project</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10">
              <div className="text-purple-600 font-bold text-sm uppercase tracking-wider mb-2">Entrepreneurs</div>
              <div className="font-semibold text-lg text-gray-800 dark:text-gray-200">No technical co-founder needed</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10">
              <div className="text-purple-600 font-bold text-sm uppercase tracking-wider mb-2">Developers</div>
              <div className="font-semibold text-lg text-gray-800 dark:text-gray-200">10x productivity with perfect memory</div>
            </div>
          </div>
        </div>

          {/* CTA Section */}
          <div className="max-w-7xl mx-auto px-6 text-center mt-4 relative z-10">
            <a href="/ide" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1 group">
              Start for Free - No Credit Card Required
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Free forever. Upgrade when you need more power.</p>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-12">
            Join 10,000+ developers building with cognitive superpowers
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">50K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider mt-2">Projects Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">2M+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider mt-2">Lines Generated</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">100K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider mt-2">Hours Saved</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">24/7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider mt-2">Active Sessions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">Every Developer Knows This Pain</h2>
            <p className="text-xl text-gray-700 dark:text-gray-400">The daily frustrations that slow you down</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <div className="text-6xl mb-4">😫</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Starting Fresh Hell</h3>
              <p className="text-gray-600 dark:text-gray-400">Explaining your project for the 100th time to yet another AI that forgot everything</p>
            </div>
            <div className="text-center p-8 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <div className="text-6xl mb-4">🧠</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Context Amnesia</h3>
              <p className="text-gray-600 dark:text-gray-400">AI that forgets everything after each session, making you repeat yourself endlessly</p>
            </div>
            <div className="text-center p-8 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Tool Switching Chaos</h3>
              <p className="text-gray-600 dark:text-gray-400">Juggling 15 different tools just to get one project done efficiently</p>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Section - Complete Listing */}
      <section id="all-features" className="py-12 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">10 Revolutionary Features</h2>
            <p className="text-xl text-gray-700 dark:text-gray-400">Bring AI into every layer of the development process</p>
          </div>

          {/* Complete Feature Grid - All 10 Features */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Feature 1: Contextual Memory */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>🧠</span> Contextual Memory
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">ChromaDB-powered memory system that remembers every decision, pattern, and preference across all sessions.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Pick up exactly where you left off, even months later</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 2: Speech-to-Text Built-in */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>🎤</span> Speech-to-Text Built-in
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Native voice recognition powered by Web Speech API for hands-free coding and natural language commands.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Code faster with voice commands and dictation support</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 3: AI Supervision */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">3</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>👁️</span> AI Supervision
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Real-time AI assistance that watches your coding patterns and offers proactive suggestions without interrupting your flow.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Intelligent assistance that learns your coding style and preferences</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 4: R&D Sandboxes */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">4</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>🧪</span> R&D Sandboxes
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Isolated development environments for experimenting with new features, testing risky changes, and prototyping without affecting main codebase.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Safe experimentation with instant rollback and containerized isolation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 5: Session Summaries */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">5</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>📄</span> Session Summaries
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Automatic generation of comprehensive development session summaries for perfect handoffs between AI and human developers.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Seamless collaboration with detailed context preservation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 6: Workflow Templates */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">6</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>📋</span> Workflow Templates
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Pre-defined multi-agent workflows for common project types: CRUD apps, auth systems, dashboards.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Structured approach to complex project generation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 7: Codebase Intelligence */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">7</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>🗂️</span> Codebase Intelligence
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Deep understanding of your entire project structure, dependencies, and architecture patterns for context-aware suggestions.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">AI understands your project's unique architecture and conventions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 8: Documentation Intelligence */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">8</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>📚</span> Documentation Intelligence
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Automatic parsing and understanding of documentation URLs with intelligent chunking and context-aware search capabilities.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">AI has instant access to relevant documentation and best practices</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 9: Natural Language Commands */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">9</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>💬</span> Natural Language Commands
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Control your entire development environment through natural language commands, from file operations to complex refactoring tasks.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Express complex operations in plain English instead of remembering syntax</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* Feature 10: Terminal Integration */}
            <BackgroundGradient className="rounded-2xl">
              <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">10</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>💻</span> Terminal Integration
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Full PTY terminal integration with AI supervision, command suggestion, and automatic error analysis and resolution.</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">AI-powered terminal that helps debug and suggests optimal commands</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-cyan-500">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Never Forget Again?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of developers who've upgraded their coding experience with eternal memory.
          </p>
          <a href="/ide" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:shadow-2xl transition-all hover:-translate-y-1 group">
            Start Building with Memory
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}