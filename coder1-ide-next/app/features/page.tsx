'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles, Brain, Wand2, Rocket, Target, Lightbulb } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/ide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">AI-Powered Features</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
            <Brain className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">AI Code Assistant</h3>
            <p className="text-gray-400">Claude-powered code completion and suggestions</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors cursor-pointer">
            <Wand2 className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Smart Refactoring</h3>
            <p className="text-gray-400">AI-driven code improvements</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
            <Sparkles className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Error Doctor</h3>
            <p className="text-gray-400">Automatic error diagnosis and fixes</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <Rocket className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">One-Click Deploy</h3>
            <p className="text-gray-400">Instant deployment to cloud</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer">
            <Target className="w-8 h-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Test Generation</h3>
            <p className="text-gray-400">AI-generated test suites</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
            <Lightbulb className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">PRD Generator</h3>
            <p className="text-gray-400">AI-powered project planning</p>
          </div>
        </div>
      </div>
    </div>
  );
}