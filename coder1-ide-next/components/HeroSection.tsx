'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import TypewriterText from './TypewriterText';

export default function HeroSection() {
  const [logoAnimated, setLogoAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setLogoAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="hero-section relative flex flex-col items-center justify-center h-full w-full px-4 py-4 overflow-auto">
      {/* Logo - responsive sizing with zoom-in from back animation */}
      <div className="relative z-10 mb-2 mt-2">
        <div 
          className={`relative w-24 h-24 sm:w-32 sm:h-32 lg:w-44 lg:h-44 transition-all duration-1000 ease-out ${
            logoAnimated 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-[0.01]'
          }`}
          style={{
            transformOrigin: 'center',
            transform: logoAnimated ? 'perspective(1000px) translateZ(0)' : 'perspective(1000px) translateZ(-500px)',
            animation: logoAnimated ? 'pulse-glow 3s ease-in-out infinite' : 'none'
          }}
        >
          <Image
            src="/Coder1-logo-Trans.png"
            alt="Coder1 Logo"
            fill
            className="drop-shadow-2xl object-contain"
            priority
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(0, 217, 255, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(0, 217, 255, 0.8)) drop-shadow(0 0 60px rgba(251, 146, 60, 0.4));
          }
        }
      `}</style>

      {/* Title with typewriter effect - responsive */}
      <h1 
        className="relative z-10 shimmer-text mb-2 text-[clamp(1.5rem,5vw,3.5rem)] text-center"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
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

      {/* Subtitle - responsive */}
      <p 
        className="relative z-10 text-[clamp(0.875rem,2vw,1.125rem)] mb-3 text-center max-w-[90%] font-semibold px-2"
        style={{
          background: 'linear-gradient(90deg, #FCD34D 0%, #FB923C 50%, #F97316 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        The only IDE in the world built just for Claude Code
      </p>

      {/* Action buttons - responsive */}
      <div className="relative z-10 flex flex-col gap-2 mb-3 w-full max-w-[min(90%,500px)] px-2">
        <button 
          className="glass-button flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all duration-300 w-full transform hover:translate-y-[-2px]"
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
          <span className="text-xl sm:text-2xl">📁</span>
          <span className="text-gray-300 text-left text-sm sm:text-base">
            Open a file to start coding
          </span>
        </button>

        <button 
          className="glass-button flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all duration-300 w-full transform hover:translate-y-[-2px]"
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
          <span className="text-xl sm:text-2xl">💻</span>
          <span className="text-gray-300 text-left text-sm sm:text-base">
            Use the terminal for commands
          </span>
        </button>

        <button 
          className="glass-button flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all duration-300 w-full transform hover:translate-y-[-2px]"
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
          <span className="text-xl sm:text-2xl">🤖</span>
          <span className="text-gray-300 text-left text-sm sm:text-base">
            Claude Code integration ready
          </span>
        </button>
      </div>

      {/* Hint text - responsive positioning */}
      <div className="relative z-10 mt-2 mb-4">
        <p className="text-gray-500 text-[clamp(0.75rem,1.5vw,0.875rem)] italic text-center">
          Type claude in the terminal below to begin
        </p>
      </div>
    </div>
  );
}