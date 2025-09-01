'use client';

import React from 'react';
import { X, Github, Globe, Mail, Heart } from 'lucide-react';
import Image from 'next/image';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <h2 className="text-xl font-semibold text-text-primary">About Coder1 IDE</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-primary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Logo and Version */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Image 
                  src="/Coder1-logo-Trans.png" 
                  alt="Coder1" 
                  width={120} 
                  height={43}
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('about-logo-fallback');
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <span 
                  id="about-logo-fallback" 
                  className="text-coder1-cyan font-bold text-3xl hidden"
                  style={{
                    textShadow: '0 0 20px rgba(0, 217, 255, 0.5)'
                  }}
                >
                  {'{CODER1}'}
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Coder1 IDE</h3>
            <p className="text-text-secondary">Version 2.0.0 (Next.js Edition)</p>
            <p className="text-sm text-text-muted mt-1">Build Date: January 2025</p>
          </div>

          {/* Description */}
          <div className="text-center">
            <p className="text-text-secondary leading-relaxed">
              The first IDE built specifically for Claude Code and the new generation of vibe coders. 
              Bridging the gap between AI capabilities and human creativity.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Key Features</h4>
            <ul className="space-y-1 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Native Claude Code Integration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> AI Supervision System
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Session Intelligence & Summaries
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Monaco Editor (VSCode Engine)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Integrated Terminal with PTY
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/michaelkraft/autonomous_vibe_interface"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-default rounded hover:border-orange-500/50 transition-all"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="/documentation"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-default rounded hover:border-orange-500/50 transition-all"
            >
              <Globe className="w-4 h-4" />
              Documentation
            </a>
            <a
              href="mailto:support@coder1.dev"
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-default rounded hover:border-orange-500/50 transition-all"
            >
              <Mail className="w-4 h-4" />
              Support
            </a>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-border-default">
            <p className="text-xs text-text-muted">
              Built with <Heart className="inline w-3 h-3 text-red-400" /> for Claude Code and vibe coders
            </p>
            <p className="text-xs text-text-muted mt-1">
              © 2025 Coder1 IDE. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}