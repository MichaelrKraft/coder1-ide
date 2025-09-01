'use client';

import Link from 'next/link';
import { ArrowLeft, Grid, Package, Layers, Box, Palette, Cpu } from 'lucide-react';

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/ide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">Components Library</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
            <Grid className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">UI Components</h3>
            <p className="text-gray-400">Buttons, forms, cards, and more</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors cursor-pointer">
            <Package className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Layout Components</h3>
            <p className="text-gray-400">Grids, containers, and sections</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
            <Layers className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Navigation</h3>
            <p className="text-gray-400">Menus, tabs, and breadcrumbs</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <Box className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Data Display</h3>
            <p className="text-gray-400">Tables, lists, and charts</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer">
            <Palette className="w-8 h-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Styling</h3>
            <p className="text-gray-400">Themes and design tokens</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
            <Cpu className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Advanced</h3>
            <p className="text-gray-400">Complex interactive components</p>
          </div>
        </div>
      </div>
    </div>
  );
}