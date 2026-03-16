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
            <p className="text-gray-400">@Coder1IDE</p>
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

        {/* E-E-A-T: Author & Trust Signals */}
        <div className="mt-12 bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">About the Creator</h2>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">Mike Kraft</h3>
              <p className="text-gray-400 mb-2">Founder & Lead Developer</p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Serial SaaS founder and Claude Code power user with over 10 years of software engineering experience.
                Built Coder1 IDE after experiencing firsthand the limitations of existing IDEs when working with AI assistants.
                Passionate about making AI-powered development accessible to everyone.
              </p>
              <div className="flex gap-4">
                <a href="https://twitter.com/coder1ai" target="_blank" rel="noopener noreferrer" className="text-coder1-cyan hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="https://github.com/MichaelrKraft" target="_blank" rel="noopener noreferrer" className="text-coder1-cyan hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Trust */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Contact Us</h3>
            <p className="text-gray-300 mb-2">Email: support@coder1.ai</p>
            <p className="text-gray-300 mb-2">Discord: discord.gg/coder1</p>
            <p className="text-gray-400 text-sm mt-4">
              We typically respond within 24 hours.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Company</h3>
            <p className="text-gray-300 mb-2">Pool Kraft LLC</p>
            <p className="text-gray-300 mb-2">United States</p>
            <p className="text-gray-400 text-sm mt-4">
              Building developer tools since 2020.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}