'use client';

import Link from 'next/link';
import { ArrowLeft, Info, Heart, Users, Star, Github, Twitter } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/ide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">About Coder1 IDE</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Info className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Version</h3>
            <p className="text-gray-400">v1.0.0-alpha</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Heart className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Built with Love</h3>
            <p className="text-gray-400">For vibe coders everywhere</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Users className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Community</h3>
            <p className="text-gray-400">Join our Discord server</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Star className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Open Source</h3>
            <p className="text-gray-400">MIT Licensed</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Github className="w-8 h-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Contribute</h3>
            <p className="text-gray-400">Fork us on GitHub</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Twitter className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Follow Us</h3>
            <p className="text-gray-400">@CoderOneIDE</p>
          </div>
        </div>
        
        <div className="mt-12 bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Mission</h2>
          <p className="text-gray-300 leading-relaxed">
            Coder1 IDE is built specifically for Claude Code and the new generation of vibe coders. 
            We believe coding should be intuitive, creative, and fun. Our mission is to bridge the gap 
            between AI capabilities and human creativity, making programming accessible to newcomers 
            while providing power features for experienced developers.
          </p>
        </div>
      </div>
    </div>
  );
}