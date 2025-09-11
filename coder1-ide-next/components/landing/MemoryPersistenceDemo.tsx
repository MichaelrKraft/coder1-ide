'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Brain, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import styles from './MemoryPersistenceDemo.module.css';

interface ChatMessage {
  type: 'user' | 'claude' | 'indicator' | 'code';
  text: string;
  delay: number;
  side: 'without' | 'with';
}

const demoScript: ChatMessage[] = [
  // Without Memory Flow (Left Side)
  { type: 'user', text: "Let's continue working on the auth bug we discussed", delay: 2000, side: 'without' },
  { type: 'claude', text: "I'm not familiar with that bug. What project is this regarding?", delay: 4000, side: 'without' },
  { type: 'user', text: 'My application for lawyer databases', delay: 6000, side: 'without' },
  { type: 'claude', text: 'You have three projects. Do you know which project the bug we discussed is in?', delay: 8000, side: 'without' },
  { type: 'user', text: 'The one I was working on three hours ago', delay: 10000, side: 'without' },
  { type: 'claude', text: 'I apologize, I do not have session memory. Can you give me some hints or keywords that may have been in your project?', delay: 12000, side: 'without' },
  { type: 'indicator', text: '😤 Frustrating context loss...', delay: 14000, side: 'without' },
  
  // With Memory Flow (Right Side)
  { type: 'user', text: "Let's continue working on the auth bug we discussed", delay: 16000, side: 'with' },
  { type: 'claude', text: 'I see the JWT timeout issue from 3 hours ago in your LawyerDB project. The token was expiring after 15 minutes instead of 24 hours. Let me apply the fix we identified...', delay: 18000, side: 'with' },
  { type: 'code', text: '// Fixing /lawyerdb/api/auth/route.ts\n// Line 47: Changed from 900000 to 86400000\nconst TOKEN_EXPIRY = 24 * 60 * 60 * 1000;', delay: 21000, side: 'with' },
  { type: 'indicator', text: '✅ Instantly back to work!', delay: 24000, side: 'with' }
];

export default function MemoryPersistenceDemo() {
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [hoveredSide, setHoveredSide] = useState<'without' | 'with' | null>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Auto-play on scroll into view
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPlaying) {
          startDemo();
        }
      },
      { threshold: 0.3 }
    );
    
    if (demoRef.current) {
      observerRef.current.observe(demoRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);
  
  const startDemo = () => {
    setIsPlaying(true);
    setCurrentMessages([]);
    setShowMetrics(false);
    
    // Schedule each message with cumulative delays
    demoScript.forEach((message, index) => {
      setTimeout(() => {
        setCurrentMessages(prev => [...prev, message]);
      }, message.delay);
    });
    
    // Show metrics after all messages
    setTimeout(() => {
      setShowMetrics(true);
    }, 27000);
    
    // Reset and loop after 35 seconds
    setTimeout(() => {
      startDemo();
    }, 35000);
  };
  
  const resetDemo = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCurrentMessages([]);
    setShowMetrics(false);
    setIsPlaying(false);
  };
  
  return (
    <div 
      ref={demoRef}
      className="relative w-full max-w-7xl mx-auto px-4 py-16"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
          Watch Claude Remember Everything
        </h2>
        <p className="text-lg text-text-secondary">
          See the dramatic difference memory persistence makes in your development workflow
        </p>
      </div>
      
      {/* Demo Container */}
      <div className="relative bg-bg-secondary rounded-2xl overflow-hidden border border-border-default shadow-2xl" style={{ height: '500px' }}>
        {/* Split Screen */}
        <div className="flex h-full">
          {/* Without Memory Side */}
          <div 
            className="w-1/2 p-6 relative border-r-2 border-red-500/30 transition-all duration-300"
            style={{
              background: hoveredSide === 'without' 
                ? 'linear-gradient(180deg, rgba(255,0,0,0.05) 0%, rgba(255,0,0,0.02) 100%)'
                : 'linear-gradient(180deg, rgba(255,0,0,0.03) 0%, rgba(255,0,0,0.01) 100%)'
            }}
            onMouseEnter={() => setHoveredSide('without')}
            onMouseLeave={() => setHoveredSide(null)}
          >
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-400">Without Memory</h3>
            </div>
            
            <div className="space-y-3 h-[380px] overflow-y-auto">
              {currentMessages
                .filter(m => m.side === 'without')
                .map((message, idx) => (
                  <div
                    key={idx}
                    className={`${styles.animateSlideIn} ${
                      message.type === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                        message.type === 'user'
                          ? 'bg-blue-500/20 text-blue-300'
                          : message.type === 'indicator'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-bg-tertiary text-text-primary'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* With Memory Side */}
          <div 
            className="w-1/2 p-6 relative transition-all duration-300"
            style={{
              background: hoveredSide === 'with'
                ? 'linear-gradient(180deg, rgba(0,217,255,0.05) 0%, rgba(0,217,255,0.02) 100%)'
                : 'linear-gradient(180deg, rgba(0,217,255,0.03) 0%, rgba(0,217,255,0.01) 100%)'
            }}
            onMouseEnter={() => setHoveredSide('with')}
            onMouseLeave={() => setHoveredSide(null)}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-green-400">With Memory</h3>
            </div>
            
            <div className="space-y-3 h-[380px] overflow-y-auto">
              {currentMessages
                .filter(m => m.side === 'with')
                .map((message, idx) => (
                  <div
                    key={idx}
                    className={`${styles.animateSlideIn} ${
                      message.type === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                        message.type === 'user'
                          ? 'bg-blue-500/20 text-blue-300'
                          : message.type === 'indicator'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : message.type === 'code'
                          ? 'bg-coder1-purple/20 text-coder1-cyan font-mono text-sm'
                          : 'bg-bg-tertiary text-text-primary'
                      }`}
                    >
                      {message.type === 'code' ? (
                        <pre className="whitespace-pre-wrap">{message.text}</pre>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        
        {/* Metrics Overlay */}
        {showMetrics && (
          <div className={`absolute inset-0 bg-bg-primary/95 backdrop-blur-sm flex items-center justify-center ${styles.animateFadeIn}`}>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-6 text-coder1-cyan">The Impact of Memory Persistence</h3>
              
              <div className="grid grid-cols-3 gap-8 mb-8">
                <div className={styles.animateScaleIn} style={{ animationDelay: '0.1s' }}>
                  <div className="text-3xl font-bold text-coder1-purple">2.3 hrs</div>
                  <div className="text-sm text-text-secondary">Saved per week</div>
                </div>
                <div className={styles.animateScaleIn} style={{ animationDelay: '0.2s' }}>
                  <div className="text-3xl font-bold text-green-400">100%</div>
                  <div className="text-sm text-text-secondary">Context retention</div>
                </div>
                <div className={styles.animateScaleIn} style={{ animationDelay: '0.3s' }}>
                  <div className="text-3xl font-bold text-orange-400">Zero</div>
                  <div className="text-sm text-text-secondary">Re-explanations</div>
                </div>
              </div>
              
              <button
                onClick={startDemo}
                className="px-6 py-3 bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
              >
                Watch Again
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Progress Indicator */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-tertiary">
            <div 
              className={`h-full bg-gradient-to-r from-coder1-cyan to-coder1-purple ${styles.animateProgress}`}
              style={{ animationDuration: '35s' }}
            />
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={isPlaying ? resetDemo : startDemo}
          className="px-4 py-2 bg-bg-tertiary hover:bg-bg-secondary rounded-lg transition-colors flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-sm" />
              Stop Demo
            </>
          ) : (
            <>
              <div className="w-0 h-0 border-l-[12px] border-l-coder1-cyan border-y-[8px] border-y-transparent" />
              Start Demo
            </>
          )}
        </button>
      </div>
    </div>
  );
}