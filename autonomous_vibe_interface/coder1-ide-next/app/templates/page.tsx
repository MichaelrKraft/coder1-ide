'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Zap, Globe, ShoppingCart, Users, Briefcase } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/ide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">Project Templates</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
            <Zap className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Next.js Starter</h3>
            <p className="text-gray-400">Full-stack React application with TypeScript</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors cursor-pointer">
            <Globe className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Landing Page</h3>
            <p className="text-gray-400">Marketing website with animations</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
            <ShoppingCart className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">E-Commerce</h3>
            <p className="text-gray-400">Online store with payment integration</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <Users className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">SaaS Dashboard</h3>
            <p className="text-gray-400">Multi-tenant application template</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer">
            <FileText className="w-8 h-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Blog Platform</h3>
            <p className="text-gray-400">Content management system</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
            <Briefcase className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Portfolio</h3>
            <p className="text-gray-400">Personal website showcase</p>
          </div>
        </div>
      </div>
    </div>
  );
}