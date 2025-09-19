"use client";

import React from 'react';
import Image from 'next/image';
import { MacbookScroll } from "@/components/ui/macbook-scroll";

export default function Coder1LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-cyan-500/10 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Coder1</span>
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-cyan-500 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-cyan-500 transition-colors">Pricing</a>
              <a href="/docs" className="text-gray-600 dark:text-gray-300 hover:text-cyan-500 transition-colors">Docs</a>
              <a href="/blog" className="text-gray-600 dark:text-gray-300 hover:text-cyan-500 transition-colors">Blog</a>
              <a href="/ide" className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5">
                Start for Free
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with MacBook Scroll */}
      <section className="pt-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600/20 to-cyan-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-2 animate-pulse">
            <span className="text-2xl">🧠</span>
            <span className="font-semibold text-gray-800 dark:text-white">Revolutionary Memory Technology</span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-black mb-2 bg-gradient-to-r from-purple-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent leading-tight">
            The Only IDE That<br />Never Forgets
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-4 max-w-3xl mx-auto">
            Your context, decisions, and preferences - remembered forever
          </p>
        </div>

        {/* MacBook Scroll Animation Section - moved immediately after title */}
        <div className="w-full relative overflow-hidden">
          <MacbookScroll
            src="/memory-comparison.svg"
            showGradient={false}
            badge={
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full">
                <span className="text-white font-semibold text-sm">Live Demo</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              </div>
            }
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
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Tool Fragmentation</h3>
              <p className="text-gray-600 dark:text-gray-400">20 different tools that don't talk to each other, creating chaos instead of code</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">10 Revolutionary Features</h2>
            <p className="text-xl text-gray-700 dark:text-gray-400">Powered by our advanced AI agent orchestration system</p>
          </div>

          {/* Feature Grid Preview */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>🧠</span> Contextual Memory
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                      <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Problem</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Lose everything when you close your IDE</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Solution</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Every decision, pattern, and preference saved forever</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>🎙️</span> Voice-to-Text
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                      <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Problem</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Typing slows down your thinking</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Solution</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Describe it. Watch it appear. Ship it.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <a href="#all-features" className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-600 font-semibold">
              View all 10 features
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* All Features Section - Complete Listing */}
      <section id="all-features" className="py-20 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">All 10 Revolutionary Features</h2>
            <p className="text-xl text-gray-700 dark:text-gray-400">Built on our advanced multi-agent AI orchestration system</p>
          </div>

          {/* Complete Feature Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Feature 1: Contextual Memory */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
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

            {/* Feature 2: Multi-Agent Orchestration */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>🤖</span> Multi-Agent Orchestration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">Spawn teams of specialized AI agents that work together to build complete projects from requirements.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Multiple AI experts working on your project simultaneously</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Workflow Templates */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">3</div>
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

            {/* Feature 4: Agent Dashboard */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">4</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>🎯</span> Agent Dashboard
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">Real-time monitoring of agent teams, progress tracking, and interactive agent communication.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Full visibility into your AI development team</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 5: Session Summaries */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">5</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>📝</span> Session Summaries
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">AI-generated summaries of development sessions with context, decisions, and next steps.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Perfect handoffs to teammates or future sessions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 6: Terminal Integration */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">6</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>💻</span> Terminal Integration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">WebSocket-based terminal with AI supervision and real-time command assistance.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">AI explains commands and suggests improvements in real-time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 7: File System Integration */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">7</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>📁</span> File System Integration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">Agents generate real code files directly to your project directory with proper structure.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Ready-to-run code files, not just suggestions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 8: Smart Discovery */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">8</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>🔍</span> Smart Discovery
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">AI-powered command palette and tools discovery system for enhanced productivity.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Find the right tool or command instantly</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 9: Revolutionary Supervision Agent */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">9</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>👁️</span> Revolutionary Supervision Agent
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">AI watches your terminal in real-time, offering proactive help, catching errors, and suggesting improvements as you code.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Never get stuck - AI actively helps before you even ask</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 10: Agent Metrics */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">10</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <span>📊</span> Agent Metrics
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">Performance tracking and analytics for agent teams with success rate monitoring.</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">Benefit</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Optimize your AI development workflow with data</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a href="/ide" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1 group">
              Get All 10 Features - Start Free
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No credit card required. All features included in free plan.</p>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">Start Free. Scale When Ready.</h2>
            <p className="text-xl text-gray-700 dark:text-gray-400">No credit card required. Free forever plan available.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 transition-all hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">FREE FOREVER</h3>
              <div className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">$0</div>
              <p className="text-gray-600 dark:text-gray-400 mb-8">Perfect for getting started</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Contextual Memory</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Voice-to-Text</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">5 AI Agents</span>
                </li>
              </ul>
              <a href="/ide" className="block w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-center hover:shadow-lg hover:shadow-cyan-500/30 transition-all">
                Start for Free
              </a>
            </div>

            {/* Pro Plan - Featured */}
            <div className="relative p-8 bg-gradient-to-b from-purple-900/20 to-cyan-900/20 backdrop-blur-sm rounded-2xl border-2 border-cyan-500 shadow-2xl shadow-cyan-500/20 transform scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-bold">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">PRO</h3>
              <div className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">$29<span className="text-xl font-normal text-gray-700 dark:text-gray-300">/mo</span></div>
              <p className="text-gray-600 dark:text-gray-400 mb-8">For serious developers</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Everything in Free</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Unlimited Memory</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Advanced Multi-Agent Teams</span>
                </li>
              </ul>
              <a href="/ide" className="block w-full py-3 bg-white dark:bg-black text-cyan-500 rounded-full font-semibold text-center hover:shadow-lg transition-all">
                Start Pro Trial
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 transition-all hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">ENTERPRISE</h3>
              <div className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">Custom</div>
              <p className="text-gray-600 dark:text-gray-400 mb-8">For teams and organizations</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Team Collaboration</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-200">Custom AI Agents</span>
                </li>
              </ul>
              <a href="/contact" className="block w-full py-3 border-2 border-cyan-500 text-cyan-500 rounded-full font-semibold text-center hover:bg-cyan-500 hover:text-white transition-all">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-4">Your IDE Should Remember You</h2>
          <p className="text-2xl mb-8 text-white/90">Stop repeating yourself. Start building faster.</p>
          
          <a href="/ide" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-white/30 transition-all hover:-translate-y-1 group">
            Start for Free - Keep Your Memory Forever
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          
          <div className="flex justify-center gap-8 mt-8 text-white/80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Free forever plan
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              5-minute setup
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4 text-cyan-500">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/changelog" className="hover:text-white transition-colors">Changelog</a></li>
                <li><a href="/roadmap" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-cyan-500">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/tutorials" className="hover:text-white transition-colors">Tutorials</a></li>
                <li><a href="/api" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-cyan-500">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/press" className="hover:text-white transition-colors">Press Kit</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-cyan-500">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://github.com/coder1" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://discord.gg/coder1" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="https://twitter.com/coder1" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="https://youtube.com/coder1" className="hover:text-white transition-colors">YouTube</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 Coder1. All rights reserved. | 
              <a href="/privacy" className="hover:text-white transition-colors"> Privacy</a> | 
              <a href="/terms" className="hover:text-white transition-colors"> Terms</a> | 
              <a href="/security" className="hover:text-white transition-colors"> Security</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}