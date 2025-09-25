'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import TypewriterText from './TypewriterText';
import dynamic from 'next/dynamic';

// Dynamically import FaultyTerminal to avoid SSR issues with WebGL
const FaultyTerminal = dynamic(
  () => import('./backgrounds/FaultyTerminal').catch(() => {
    // If the component fails to load, return a fallback
    return { default: () => <div className="absolute inset-0 bg-transparent" /> };
  }), 
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-transparent" />
  }
);

// Toggle this to switch between animations
// Set to true for FaultyTerminal, false for dot-grid
const USE_FAULTY_TERMINAL = false;

interface HeroSectionProps {
  onTourStart?: () => void;
  onDismiss?: () => void;
}

export default function HeroSection({ onTourStart, onDismiss }: HeroSectionProps = {}) {
  const [logoAnimated, setLogoAnimated] = useState(false);
  const [showEntranceAnimation, setShowEntranceAnimation] = useState(true);
  const [animationFadingOut, setAnimationFadingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setLogoAnimated(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Handle user interaction to fade out entrance animation and dismiss HeroSection
  const handleUserInteraction = React.useCallback((event?: Event) => {
    // Don't dismiss if clicking on a button (let button handle its action first)
    if (event && event.target && (event.target as HTMLElement).closest('button')) {
      console.log('🛡️ HeroSection: Button click detected, not dismissing');
      return;
    }
    
    console.log('👍 HeroSection: User interaction detected, preparing to dismiss');
    
    // Handle entrance animation fade out
    if (showEntranceAnimation && !animationFadingOut) {
      console.log('🎦 HeroSection: Starting entrance animation fade out');
      setAnimationFadingOut(true);
      // After fade transition, completely remove the animation
      setTimeout(() => {
        setShowEntranceAnimation(false);
      }, 1500); // 1.5s transition duration
    }
    
    // Dismiss the entire HeroSection if callback provided
    if (onDismiss) {
      console.log('🔴 HeroSection: Calling onDismiss callback');
      // Small delay to ensure smooth transition
      setTimeout(() => {
        onDismiss();
      }, 100);
    } else {
      console.log('⚠️ HeroSection: No onDismiss callback provided');
    }
  }, [showEntranceAnimation, animationFadingOut, onDismiss]);

  // Set up interaction listeners
  useEffect(() => {
    // Always listen for interactions if onDismiss is provided
    if (!showEntranceAnimation && !onDismiss) return;

    // Only listen for intentional interactions, not mousemove
    const events = ['click', 'keydown', 'touchstart'];
    
    const handleEvent = (e: Event) => handleUserInteraction(e);
    
    // Add scroll listener with threshold to avoid dismissing on minor scrolls
    let hasScrolled = false;
    const handleScroll = () => {
      if (!hasScrolled && window.scrollY > 50) {
        hasScrolled = true;
        handleUserInteraction();
      }
    };
    
    // Delay adding listeners by 500ms to prevent immediate dismissal
    const listenerTimer = setTimeout(() => {
      events.forEach(event => {
        document.addEventListener(event, handleEvent, { passive: true });
      });
      document.addEventListener('scroll', handleScroll, { passive: true });
    }, 500);

    return () => {
      clearTimeout(listenerTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleEvent);
      });
      document.removeEventListener('scroll', handleScroll);
    };
  }, [showEntranceAnimation, handleUserInteraction, onDismiss]);

  return (
    <div className="hero-section relative flex flex-col items-center justify-center min-h-full h-full w-full px-4 py-4 overflow-auto bg-bg-primary">
      {/* Always present dot-grid background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      {/* Interactive entrance animation overlay */}
      {showEntranceAnimation && USE_FAULTY_TERMINAL && (
        <div 
          className={`absolute inset-0 z-10 transition-all duration-1500 ease-out ${
            animationFadingOut ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
          }`}
          style={{ 
            pointerEvents: animationFadingOut ? 'none' : 'auto' 
          }}
        >
          <FaultyTerminal
            scale={1.2}
            tint="#00D9FF"
            scanlineIntensity={0.3}
            glitchAmount={0.9}
            flickerAmount={0.4}
            noiseAmp={0.6}
            chromaticAberration={3}
            curvature={0.15}
            mouseReact={true}
            mouseStrength={0.4}
            brightness={0.8}
            pageLoadAnimation={true}
            digitSize={1.8}
            gridMul={[2.5, 1.5]}
          />
          
          {/* Subtle hint text that appears after a few seconds */}
          <div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center animate-pulse"
            style={{
              animation: 'fadeInDelay 1s ease-in forwards',
              animationDelay: '3s',
              opacity: 0
            }}
          >
            <p className="text-cyan-300 text-sm font-light tracking-wide">
              Click anywhere to begin
            </p>
          </div>
        </div>
      )}
      
      {/* Hero Background Gradients - Disabled for now */}
      {/* <div className="hero-gradient">
        <div className="hero-top-line"></div>
        <div className="hero-cone-left"></div>
        <div className="hero-cone-right"></div>
      </div> */}
      {/* Logo - responsive sizing with zoom-in from back animation */}
      <div className="relative z-10 -mb-8 mt-2">
        <div 
          className={`relative w-[110px] h-[110px] sm:w-[154px] sm:h-[154px] lg:w-[199px] lg:h-[199px] transition-all duration-1000 ease-out ${
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
            src="/Coder1-Logo-Sharp.svg"
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
        className="relative z-10 shimmer-text mb-0 text-[clamp(1.5rem,5vw,3.5rem)] text-center"
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

      {/* Subtitle - right under typewriter text */}
      <p 
        className="relative z-10 text-[clamp(0.875rem,2vw,1.125rem)] mb-6 text-center max-w-[90%] font-semibold px-2"
        style={{
          background: 'linear-gradient(90deg, #FCD34D 0%, #FB923C 50%, #F97316 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        The only AI-first IDE with built-in contextual memory
      </p>

      {/* Action buttons - responsive */}
      <div className="relative z-10 flex flex-col gap-5 mb-2 w-full max-w-[min(90%,360px)] px-2">
        <button 
          data-tour="start-tour-button"
          onClick={(e) => {
            e.stopPropagation();
            if (onTourStart) {
              onTourStart();
            }
          }}
          className="glass-button flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all duration-300 w-full transform hover:translate-y-[-2px]"
          title="Start Interactive Tour - Learn how to use the Coder1 IDE with a guided walkthrough"
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
          <span className="text-gray-300 text-left text-sm sm:text-base">
            Start Interactive Tour
          </span>
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            router.push('/smart-prd-generator-standalone.html');
          }}
          className="glass-button flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all duration-300 w-full transform hover:translate-y-[-2px]"
          data-tour="prd-generator-button"
          title="Smart PRD Generator - AI-powered Product Requirements Document creation with 5-question intelligent flow"
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
          <span className="text-gray-300 text-left text-sm sm:text-base">
            Automate your PRD documentation
          </span>
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            router.push('/vibe-dashboard');
          }}
          className="glass-button flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all duration-300 w-full transform hover:translate-y-[-2px]"
          title="View your AI dashboard - Access AI tools, templates, and workflow management"
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
          <span className="text-gray-300 text-left text-sm sm:text-base">
            View your AI dashboard
          </span>
        </button>
      </div>

      {/* Hint text - responsive positioning */}
      <div className="relative z-10 mt-1 mb-2">
        <p className="text-gray-500 text-[clamp(0.75rem,1.5vw,0.875rem)] italic text-center">
          Type claude in the terminal below to begin
        </p>
      </div>
      
    </div>
  );
}