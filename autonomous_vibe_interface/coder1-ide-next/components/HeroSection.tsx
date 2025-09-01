'use client';

import React from 'react';
import Image from 'next/image';
import TypewriterText from './TypewriterText';

export default function HeroSection() {
  return (
    <div className="hero-section relative flex flex-col items-center justify-center min-h-[400px] px-8 py-16 overflow-hidden">
      {/* Logo - increased by 50% */}
      <div className="relative z-10 mb-8 mt-12">
        <Image
          src="/Coder1-logo-Trans.png"
          alt="Coder1 Logo"
          width={180}
          height={180}
          className="drop-shadow-2xl"
          priority
        />
      </div>

      {/* Title with typewriter effect */}
      <h1 
        className="relative z-10 shimmer-text mb-4"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: '56px',
          fontWeight: 800,
          letterSpacing: '-0.02em'
        }}
      >
        <TypewriterText
          texts={[
            'Welcome to Coder1',
            'Build with AI',
            'Code with Claude Code'
          ]}
          speed={100}
          delay={2000}
          stopAfterCycles={2}
        />
      </h1>

      {/* Subtitle */}
      <p 
        className="relative z-10 text-lg mb-8 text-center max-w-2xl font-semibold"
        style={{
          background: 'linear-gradient(90deg, #FCD34D 0%, #FB923C 50%, #F97316 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        The only IDE in the world built just for Claude Code
      </p>

      {/* Action buttons */}
      <div className="relative z-10 flex flex-col gap-4 mb-8">
        <button 
          className="glass-button flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-300 min-w-[350px] transform hover:translate-y-[-2px]"
          style={{
            background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid #4A90E2',
            boxShadow: '0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(251, 146, 60, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.backdropFilter = 'blur(6px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(6px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = '#4A90E2';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.backdropFilter = 'blur(4px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(4px)';
          }}
        >
          <span className="text-2xl">📁</span>
          <span className="text-gray-300 text-left">
            Open a file to start coding
          </span>
        </button>

        <button 
          className="glass-button flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-300 min-w-[350px] transform hover:translate-y-[-2px]"
          style={{
            background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid #4A90E2',
            boxShadow: '0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(251, 146, 60, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.backdropFilter = 'blur(6px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(6px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = '#4A90E2';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.backdropFilter = 'blur(4px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(4px)';
          }}
        >
          <span className="text-2xl">💻</span>
          <span className="text-gray-300 text-left">
            Use the terminal for commands
          </span>
        </button>

        <button 
          className="glass-button flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-300 min-w-[350px] transform hover:translate-y-[-2px]"
          style={{
            background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid #4A90E2',
            boxShadow: '0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(251, 146, 60, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.backdropFilter = 'blur(6px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(6px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.2), 0 0 20px rgba(74, 144, 226, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = '#4A90E2';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.backdropFilter = 'blur(4px)';
            (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(4px)';
          }}
        >
          <span className="text-2xl">🤖</span>
          <span className="text-gray-300 text-left">
            Claude Code integration ready
          </span>
        </button>
      </div>

      {/* Hint text - positioned closer to the buttons */}
      <div className="relative z-10 mt-6 mb-16">
        <p className="text-gray-500 text-sm italic">
          Type claude in the terminal below to begin
        </p>
      </div>
    </div>
  );
}