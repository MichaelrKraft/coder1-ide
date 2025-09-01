'use client';

import Link from 'next/link';
import { ArrowLeft, Code2, Zap, GitBranch, Database, Cloud, Shield } from 'lucide-react';

export default function HooksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/ide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">React Hooks Library</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
            <Code2 className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">State Management</h3>
            <p className="text-gray-400">useState, useReducer, useContext</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors cursor-pointer">
            <Zap className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Side Effects</h3>
            <p className="text-gray-400">useEffect, useLayoutEffect</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
            <GitBranch className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Performance</h3>
            <p className="text-gray-400">useMemo, useCallback, useRef</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <Database className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Data Fetching</h3>
            <p className="text-gray-400">Custom hooks for API calls</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer">
            <Cloud className="w-8 h-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">WebSocket Hooks</h3>
            <p className="text-gray-400">Real-time communication</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
            <Shield className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Authentication</h3>
            <p className="text-gray-400">useAuth, usePermissions</p>
          </div>
        </div>
      </div>
    </div>
  );
}