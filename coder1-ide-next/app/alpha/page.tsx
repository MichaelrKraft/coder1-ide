'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LightRays from '@/components/backgrounds/LightRays';
import {
  Code, Terminal, Eye, History, Link2, Moon, GitPullRequest, Sun,
  TrendingUp, Shield, ClipboardList, ShieldAlert, Lock, PlayCircle,
  Brain, Mic, Zap, Book, FileText, Palette, Slash, Check, X, Infinity,
  CreditCard, ShieldCheck, Ban, Github, MessageCircle, Twitter,
  ChevronDown, ArrowRight, Sparkles, Bot, Clock, Coffee, CheckCircle,
  AlertTriangle, BarChart3, ExternalLink
} from 'lucide-react';

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const colors = {
  primary: '#00D9FF',
  primaryDark: '#00B4D8',
  purple: '#8B5CF6',
  dark: '#0A0A0A',
  darkCard: '#111111',
  darkSection: '#080808',
  border: 'rgba(255,255,255,0.1)',
  borderHover: 'rgba(255,255,255,0.2)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.6)',
  textDim: 'rgba(255,255,255,0.4)',
  gradient: 'linear-gradient(135deg, #00D9FF 0%, #8B5CF6 100%)',
  gradientText: 'linear-gradient(135deg, #00D9FF, #8B5CF6)',
};

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================
function AnimatedCounter({
  end,
  duration = 2000,
  suffix = '',
  prefix = ''
}: {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Start animation after a brief delay to ensure component is visible
    const timeout = setTimeout(() => {
      let startTime: number | null = null;
      const startValue = 0;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);

        // Easing function for smoother animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(easeOutQuart * (end - startValue) + startValue);

        setCount(currentCount);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, 300);

    return () => clearTimeout(timeout);
  }, [mounted, end, duration]);

  // Show final value on server, animate on client
  if (!mounted) {
    return <span className="tabular-nums">{prefix}{end.toLocaleString()}{suffix}</span>;
  }

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ============================================================================
// TYPING ANIMATION COMPONENT
// ============================================================================
function TypeWriter({
  text,
  speed = 50,
  delay = 500,
  className = ''
}: {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Start typing after delay
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [mounted, text, speed, delay]);

  // Show full text on server to avoid layout shift
  if (!mounted) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <span className="inline-block w-[3px] h-[1em] bg-coder1-cyan ml-1 animate-pulse" />
      )}
    </span>
  );
}

// ============================================================================
// SCROLL REVEAL COMPONENT
// ============================================================================
function ScrollReveal({
  children,
  className = '',
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '-50px'
      }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// INTERACTIVE MORNING BRIEF DEMO
// ============================================================================
function MorningBriefDemo() {
  const [visibleSections, setVisibleSections] = useState<number[]>([]);
  const sections = [
    {
      icon: CheckCircle,
      color: 'text-emerald-400',
      title: 'Created 3 PRs',
      items: [
        '- Added dark mode toggle (127 lines)',
        '- Optimized API caching (89 lines)',
        '- Fixed mobile responsive issues (56 lines)'
      ]
    },
    {
      icon: BarChart3,
      color: 'text-coder1-cyan',
      title: 'Completed 2 research tasks',
      items: [
        '- Best practices for WebSocket reconnection',
        '- Competitor analysis: Cursor\'s new features'
      ]
    },
    {
      icon: TrendingUp,
      color: 'text-amber-400',
      title: 'Spotted 3 opportunities',
      items: [
        '- Next.js 15 released - upgrade recommended',
        '- Trending on HN: AI test generation',
        '- Your competitor raised Series A'
      ]
    },
    {
      icon: AlertTriangle,
      color: 'text-red-400',
      title: '1 item needs attention',
      items: [
        '- PR #124 ready for your review'
      ]
    }
  ];

  const revealNext = () => {
    if (visibleSections.length < sections.length) {
      setVisibleSections([...visibleSections, visibleSections.length]);
    }
  };

  const resetDemo = () => {
    setVisibleSections([]);
  };

  return (
    <div className="relative">
      <div className="bg-[#0D0D0D] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-white/40 ml-2 font-mono">johnny5 - morning brief</span>
        </div>

        {/* Content */}
        <div className="p-6 font-mono text-sm space-y-4">
          <div className="text-coder1-cyan animate-pulse">
            Good morning! While you slept, Johnny5:
          </div>

          {sections.map((section, idx) => {
            const Icon = section.icon;
            const isVisible = visibleSections.includes(idx);

            return (
              <div
                key={idx}
                className={`transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'
                }`}
              >
                <div className={`flex items-center gap-2 ${section.color}`}>
                  <Icon className="w-4 h-4" />
                  <span>{section.title}</span>
                </div>
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="ml-6 text-white/60 mt-1"
                    style={{
                      animationDelay: `${itemIdx * 100}ms`,
                      opacity: isVisible ? 1 : 0,
                      transition: `opacity 300ms ${itemIdx * 100}ms`
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Cursor */}
          {visibleSections.length < sections.length && (
            <div className="flex items-center gap-1 text-white/40">
              <span className="w-2 h-4 bg-coder1-cyan animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={revealNext}
          disabled={visibleSections.length >= sections.length}
          className="px-6 py-2 bg-coder1-cyan/10 border border-coder1-cyan/30 rounded-lg text-coder1-cyan text-sm font-medium hover:bg-coder1-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {visibleSections.length >= sections.length ? 'Demo Complete' : 'Reveal Next Section'}
        </button>
        {visibleSections.length > 0 && (
          <button
            onClick={resetDemo}
            className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-sm font-medium hover:bg-white/10 transition-all"
          >
            Reset Demo
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MEMORY COMPARISON DEMO
// ============================================================================
interface DemoMessage {
  type: 'user' | 'claude' | 'indicator' | 'code';
  text: string;
  delay: number;
  side: 'without' | 'with';
}

// ChatBubble defined at module scope to prevent recreation on parent re-render
const ChatBubble = ({ msg }: { msg: DemoMessage }) => {
  const bubbleClasses = {
    user: 'bg-blue-500/20 text-blue-400',
    claude: 'bg-white/10 text-white',
    indicator: msg.side === 'with'
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'bg-red-500/20 text-red-400 border border-red-500/30',
    code: 'bg-purple-500/20 text-coder1-cyan font-mono text-xs whitespace-pre-wrap'
  };

  return (
    <div
      className={`mb-3 ${msg.type === 'user' ? 'text-right' : ''}`}
      style={{
        animation: 'fadeInMessage 0.4s ease-out forwards',
        opacity: 0
      }}
    >
      <div className={`inline-block px-3 py-2 rounded-lg max-w-[90%] text-sm ${bubbleClasses[msg.type]}`}>
        {msg.text}
      </div>
    </div>
  );
};

function MemoryComparisonDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [withoutMessages, setWithoutMessages] = useState<DemoMessage[]>([]);
  const [withMessages, setWithMessages] = useState<DemoMessage[]>([]);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const withoutScrollRef = useRef<HTMLDivElement>(null);
  const withScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages are added
  useEffect(() => {
    if (withoutScrollRef.current) {
      withoutScrollRef.current.scrollTop = withoutScrollRef.current.scrollHeight;
    }
  }, [withoutMessages]);

  useEffect(() => {
    if (withScrollRef.current) {
      withScrollRef.current.scrollTop = withScrollRef.current.scrollHeight;
    }
  }, [withMessages]);

  const demoScript: DemoMessage[] = [
    // Without Memory Flow
    { type: 'user', text: "Let's continue working on the auth bug we discussed", delay: 500, side: 'without' },
    { type: 'claude', text: "I'm not familiar with that bug. What project is this regarding?", delay: 2000, side: 'without' },
    { type: 'user', text: 'My application for lawyer databases', delay: 3500, side: 'without' },
    { type: 'claude', text: 'You have three projects. Do you know which project the bug we discussed is in?', delay: 5000, side: 'without' },
    { type: 'user', text: 'The one I was working on three hours ago', delay: 6500, side: 'without' },
    { type: 'claude', text: 'I apologize, I do not have session memory. Can you give me some hints or keywords?', delay: 8000, side: 'without' },
    { type: 'indicator', text: '😤 Frustrating context loss...', delay: 10000, side: 'without' },

    // With Memory Flow
    { type: 'user', text: "Let's continue working on the auth bug we discussed", delay: 11500, side: 'with' },
    { type: 'claude', text: 'I see the JWT timeout issue from 3 hours ago in your LawyerDB project. The token was expiring after 15 minutes instead of 24 hours. Let me apply the fix...', delay: 13000, side: 'with' },
    { type: 'code', text: '// Fixing /lawyerdb/api/auth/route.ts\n// Line 47: Changed from 900000 to 86400000\nconst TOKEN_EXPIRY = 24 * 60 * 60 * 1000;', delay: 15500, side: 'with' },
    { type: 'indicator', text: '✅ Instantly back to work!', delay: 18000, side: 'with' }
  ];

  const totalDuration = 20000;

  const clearDemo = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    setWithoutMessages([]);
    setWithMessages([]);
    setProgress(0);
    setIsPlaying(false);
  }, []);

  const startDemo = useCallback(() => {
    if (isPlaying) {
      clearDemo();
      return;
    }

    setIsPlaying(true);
    setWithoutMessages([]);
    setWithMessages([]);
    setProgress(0);

    // Add messages based on their delays
    demoScript.forEach((msg) => {
      const timeout = setTimeout(() => {
        if (msg.side === 'without') {
          setWithoutMessages(prev => [...prev, msg]);
        } else {
          setWithMessages(prev => [...prev, msg]);
        }
      }, msg.delay);
      timeoutRefs.current.push(timeout);
    });

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (totalDuration / 100));
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 100);
    timeoutRefs.current.push(progressInterval as unknown as NodeJS.Timeout);

    // Reset after demo completes
    const endTimeout = setTimeout(() => {
      setIsPlaying(false);
    }, totalDuration);
    timeoutRefs.current.push(endTimeout);
  }, [isPlaying, clearDemo]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="mt-16">
      {/* Persistent Memory Feature Box */}
      <div
        className="mb-24 p-6 rounded-xl border border-white/5 bg-white/[0.02] transition-all duration-300 cursor-pointer hover:border-orange-500 hover:-translate-y-1"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2), inset 0 0 20px rgba(249, 115, 22, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-coder1-purple/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-coder1-purple" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Persistent Memory</h3>
            <p className="text-white/60">
              Remember all your context session-to-session. Unlike black-box AI tools, Coder1 maintains
              complete context awareness across conversations, so you never have to re-explain your project,
              codebase, or preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-3xl md:text-4xl font-bold mb-3 text-white">
          Watch Claude Remember Everything
        </h3>
        <p className="text-white/50">
          See the dramatic difference memory persistence makes in your development workflow
        </p>
      </div>

      <div className="bg-[#0A0A0A] rounded-xl border border-white/10 overflow-hidden" style={{ boxShadow: '0 0 80px rgba(0, 217, 255, 0.2), 0 0 120px rgba(0, 217, 255, 0.12)' }}>
        {/* Split demo view */}
        <div className="grid md:grid-cols-2 min-h-[360px]">
          {/* Without Memory Side */}
          <div className="p-5 border-b md:border-b-0 md:border-r border-coder1-cyan/30 bg-gradient-to-b from-red-500/5 to-transparent">
            <div className="flex items-center gap-2 mb-4 text-red-400">
              <X className="w-5 h-5" />
              <h4 className="font-semibold">Without Memory</h4>
            </div>
            <div ref={withoutScrollRef} className="h-[280px] overflow-y-auto scroll-smooth">
              {withoutMessages.map((msg, idx) => (
                <ChatBubble key={idx} msg={msg} />
              ))}
            </div>
          </div>

          {/* With Memory Side */}
          <div className="p-5 bg-gradient-to-b from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Check className="w-5 h-5" />
              <h4 className="font-semibold">With Memory</h4>
            </div>
            <div ref={withScrollRef} className="h-[280px] overflow-y-auto scroll-smooth">
              {withMessages.map((msg, idx) => (
                <ChatBubble key={idx} msg={msg} />
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-coder1-cyan to-coder1-purple transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control button */}
        <div className="p-4 text-center bg-white/[0.02]">
          <button
            onClick={startDemo}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0a1a1f] border border-coder1-cyan/50 text-coder1-cyan font-semibold rounded-full transition-all duration-300 hover:bg-coder1-cyan/10 hover:border-coder1-cyan animate-pulse-slow"
            style={{ animation: isPlaying ? 'none' : 'pulse-glow 2s ease-in-out infinite' }}
          >
            {isPlaying ? (
              <>
                <X className="w-4 h-4" />
                Stop Demo
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                {progress >= 100 ? 'Replay Demo' : 'Start Demo'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// FEATURE CARD WITH HOVER EFFECTS
// ============================================================================
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = false
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-6 rounded-xl transition-all duration-300 cursor-pointer
        ${gradient
          ? 'bg-gradient-to-br from-coder1-cyan/10 to-coder1-purple/10 border border-coder1-cyan/20'
          : 'bg-white/[0.02] border border-white/[0.05]'
        }
        ${isHovered ? 'transform -translate-y-1 border-orange-500' : ''}
      `}
      style={isHovered ? {
        boxShadow: '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2), inset 0 0 20px rgba(249, 115, 22, 0.05)',
        borderColor: '#f97316'
      } : {}}
    >
      {/* Orange glow effect on hover */}
      {isHovered && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
      )}

      <div className={`
        w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 ${gradient ? 'icon-shimmer-horizontal' : 'icon-shimmer'}
        ${gradient ? 'bg-coder1-cyan/20' : 'bg-white/5'}
        ${isHovered ? 'scale-110' : ''}
      `}>
        <Icon className={`w-6 h-6 ${gradient ? 'text-coder1-cyan' : 'text-coder1-purple'}`} />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// ============================================================================
// COMPARISON TABLE ROW
// ============================================================================
function ComparisonRow({
  feature,
  coder1,
  cursor,
  copilot,
  vscode,
  tooltip
}: {
  feature: string;
  coder1: 'yes' | 'no' | 'partial' | 'infinity';
  cursor: 'yes' | 'no' | 'partial';
  copilot: 'yes' | 'no' | 'partial';
  vscode: 'yes' | 'no' | 'partial';
  tooltip?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const renderCell = (value: string, isCoder1 = false) => {
    if (value === 'yes') return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
    if (value === 'no') return <X className="w-5 h-5 text-red-400/60 mx-auto" />;
    if (value === 'partial') return <span className="text-amber-400 text-xs">Limited</span>;
    if (value === 'infinity') return <Infinity className="w-5 h-5 text-coder1-cyan mx-auto" />;
    return null;
  };

  return (
    <tr
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        border-b border-white/5 transition-colors duration-200
        ${isHovered ? 'bg-white/[0.02]' : ''}
      `}
    >
      <td className="py-4 px-4 text-left font-medium relative">
        {feature}
        {tooltip && isHovered && (
          <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-xs text-white/60 shadow-xl">
            {tooltip}
          </div>
        )}
      </td>
      <td className={`py-4 px-4 text-center ${isHovered ? 'bg-coder1-cyan/5' : 'bg-coder1-cyan/[0.03]'}`}>
        {renderCell(coder1, true)}
      </td>
      <td className="py-4 px-4 text-center">{renderCell(cursor)}</td>
      <td className="py-4 px-4 text-center">{renderCell(copilot)}</td>
      <td className="py-4 px-4 text-center">{renderCell(vscode)}</td>
    </tr>
  );
}

// ============================================================================
// PRICING CARD
// ============================================================================
function PricingCard({
  tier,
  price,
  period,
  features,
  cta,
  featured = false,
  badge,
  subtext,
  onClick,
  loading = false
}: {
  tier: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  featured?: boolean;
  badge?: string;
  subtext?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <div className={`
      relative p-8 rounded-2xl transition-all duration-300
      ${featured
        ? 'bg-gradient-to-br from-coder1-cyan/10 to-coder1-purple/10 border-2 border-coder1-cyan/30 scale-105'
        : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
      }
    `}>
      {/* Electric pulse border for featured */}
      {featured && (
        <>
          <div className="absolute inset-[-1px] rounded-2xl border border-coder1-cyan/20 animate-pulse pointer-events-none" />
          <div className="absolute inset-[-2px] rounded-2xl border border-coder1-cyan/10 blur-[1px] animate-pulse pointer-events-none" style={{ animationDelay: '0.5s' }} />
        </>
      )}

      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-coder1-cyan to-coder1-purple rounded-full text-sm font-semibold text-white">
          {badge}
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">{tier}</h3>
        <div className="text-4xl font-bold bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
          {price}
        </div>
        <p className="text-white/40 text-sm">{period}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3 text-white/70">
            <Check className="w-4 h-4 text-coder1-cyan flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={loading}
        className={`
        w-full py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
        ${featured
          ? 'bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white hover:shadow-lg hover:shadow-coder1-cyan/30'
          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
        }
      `}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : cta}
      </button>
      {subtext && (
        <p className="text-center text-coder1-cyan text-sm mt-3 font-medium flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4" />
          {subtext}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// FAQ ITEM COMPONENT
// ============================================================================
function FAQItem({
  question,
  answer
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="bg-[#151515] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-coder1-purple flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-5 text-white/60 leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LIVE TERMINAL DEMO
// ============================================================================
function LiveTerminalDemo() {
  const [currentLine, setCurrentLine] = useState(0);
  const lines = [
    { type: 'command', text: '$ johnny5 start --mode=overnight' },
    { type: 'output', text: 'Johnny5 initializing...' },
    { type: 'output', text: 'Connecting to GitHub...' },
    { type: 'success', text: 'Connected to repository: my-saas-app' },
    { type: 'output', text: 'Scanning Slack channels for feature requests...' },
    { type: 'output', text: 'Found 3 actionable items in #product-feedback' },
    { type: 'command', text: '> Building: "Add dark mode toggle"' },
    { type: 'output', text: 'Creating branch: feature/dark-mode...' },
    { type: 'output', text: 'Implementing toggle component...' },
    { type: 'output', text: 'Adding CSS variables...' },
    { type: 'output', text: 'Writing tests...' },
    { type: 'success', text: 'PR #47 created: Add dark mode toggle (127 lines)' },
    { type: 'output', text: '' },
    { type: 'command', text: '> Monitoring trends...' },
    { type: 'output', text: 'Checking HackerNews...' },
    { type: 'alert', text: 'Alert: Next.js 15 released - 2 breaking changes affect your app' },
    { type: 'success', text: 'Added to morning brief' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine(prev => (prev + 1) % lines.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [lines.length]);

  return (
    <div className="bg-[#0D0D0D] rounded-xl border border-white/10 overflow-hidden font-mono text-xs">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] text-white/30 ml-2">johnny5 --autonomous</span>
      </div>
      <div className="p-4 h-48 overflow-hidden">
        {lines.slice(0, currentLine + 1).map((line, idx) => (
          <div
            key={idx}
            className={`
              ${line.type === 'command' ? 'text-coder1-cyan' : ''}
              ${line.type === 'success' ? 'text-emerald-400' : ''}
              ${line.type === 'alert' ? 'text-amber-400' : ''}
              ${line.type === 'output' ? 'text-white/50' : ''}
              ${idx === currentLine ? 'animate-pulse' : ''}
            `}
          >
            {line.text}
          </div>
        ))}
        <span className="inline-block w-2 h-3 bg-coder1-cyan animate-pulse ml-1" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function AlphaLandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [github, setGithub] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/alpha/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, github, source: 'alpha_landing' })
      });

      if (response.ok) {
        window.location.href = '/alpha/success';
      } else {
        const data = await response.json();
        if (response.status === 409) {
          alert('This email is already on our waitlist!');
        } else {
          alert(data.error || 'Something went wrong');
        }
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Stripe checkout for Pro tier
  const handleProCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes electric-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes flyIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateZ(-500px);
            filter: blur(10px);
          }
          50% {
            opacity: 0.8;
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateZ(0);
            filter: blur(0);
          }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #00D9FF 0%, #8B5CF6 50%, #00D9FF 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .text-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.85) 0%,
            rgba(255, 255, 255, 0.85) 40%,
            rgba(255, 255, 255, 1) 50%,
            rgba(255, 255, 255, 0.85) 60%,
            rgba(255, 255, 255, 0.85) 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShimmer 2.5s ease-in-out infinite;
        }
        @keyframes textShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .icon-shimmer {
          position: relative;
          overflow: hidden;
        }
        .icon-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            -45deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.35) 50%,
            transparent 60%,
            transparent 100%
          );
          animation: iconShimmer 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes iconShimmer {
          0% { transform: translate(-50%, 50%); }
          30%, 100% { transform: translate(50%, -50%); }
        }
        .icon-shimmer-horizontal {
          position: relative;
          overflow: hidden;
        }
        .icon-shimmer-horizontal::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          animation: iconShimmerHorizontal 5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes iconShimmerHorizontal {
          0% { transform: translateX(-100%); }
          25%, 100% { transform: translateX(100%); }
        }
        .subtitle-fade-in {
          animation: subtitleFadeIn 1s ease-out 0.5s forwards;
          opacity: 0;
        }
        @keyframes subtitleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>

      {/* ===== NAVIGATION ===== */}
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0A0A0A]
        ${scrollY > 50 ? 'border-b border-white/5' : ''}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-0.5">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/Coder1-Logo-Sharp.svg"
                alt="Coder1"
                width={200}
                height={56}
                className="h-[4.2rem] w-auto"
              />
            </Link>

            {/* Nav Links - Center */}
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <a href="#features" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Features</a>
              <a href="#johnny5" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Johnny5</a>
              <a href="#pricing" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Pricing</a>
            </div>

            {/* CTA Button - Right */}
            <div className="hidden md:flex items-center">
              <a
                href="#alpha"
                className="px-5 py-2 bg-coder1-cyan rounded-full text-sm font-semibold text-black hover:shadow-lg hover:shadow-coder1-cyan/30 transition-all "
              >
                Join Alpha
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              <div className="w-6 h-0.5 bg-white mb-1.5" />
              <div className="w-6 h-0.5 bg-white mb-1.5" />
              <div className="w-6 h-0.5 bg-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12">
        {/* Pure CSS Static Dot Grid Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Static dot pattern - no JavaScript, no animation */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #362A45 1.5px, transparent 1.5px)',
              backgroundSize: '15px 15px',
            }}
          />
          {/* Edge fade + vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(10, 10, 10, 0.6) 100%),
                radial-gradient(ellipse 50% 45% at 50% 45%, rgba(10, 10, 10, 0.7) 0%, rgba(10, 10, 10, 0.5) 70%, transparent 100%)
              `
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-gradient-to-r from-coder1-purple/20 to-coder1-cyan/20 border border-coder1-purple/30 rounded-full mb-8"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            <Sparkles className="w-4 h-4 text-coder1-purple" />
            <span className="text-sm font-semibold bg-gradient-to-r from-coder1-purple to-coder1-cyan bg-clip-text text-transparent">
              Purpose-Built for Claude Code
            </span>
          </div>

          {/* Title - Logo flies in after typing completes */}
          <div className="mb-4 flex justify-center">
            <Image
              src="/Coder1-Logo-Sharp.svg"
              alt="Coder1 IDE"
              width={520}
              height={166}
              className="h-28 md:h-36 w-auto animate-[flyIn_0.8s_ease-out_2.8s_forwards]"
              style={{ opacity: 0 }}
              priority
            />
          </div>

          {/* Subtitle with styled text - Two lines for larger impact */}
          <div className="mb-6 subtitle-fade-in">
            <p className="text-4xl md:text-5xl lg:text-6xl text-white/80 font-semibold">
              The Only <span className="text-coder1-cyan">IDE</span> Built For
            </p>
            <p className="text-4xl md:text-5xl lg:text-6xl text-white/80 font-semibold">
              <span className="text-coder1-cyan">Claude Code</span> Users.
            </p>
          </div>

          {/* Description */}
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop babysitting your Claude Code sessions. Johnny5 works autonomously overnight,
            creating PRs and briefing you every morning - All within an ADE (Agentic Development Environment) built for Claude Code power users.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a
              href="#alpha"
              className="px-8 py-4 bg-coder1-cyan rounded-full text-lg font-semibold text-black hover:shadow-xl hover:shadow-coder1-cyan/30 transition-all transform hover:scale-105 "
            >
              Join the Alpha
            </a>
            <a
              href="#demo"
              className="px-8 py-4 border-2 border-coder1-cyan/50 rounded-full text-lg font-semibold text-coder1-cyan hover:bg-coder1-cyan/10 transition-all"
            >
              Watch Demo
            </a>
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-coder1-cyan mb-1">
                <AnimatedCounter end={8000} suffix="+" duration={2000} />
              </div>
              <p className="text-white/40 text-sm">MCP Integrations</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-coder1-purple mb-1">
                24/7
              </div>
              <p className="text-white/40 text-sm">Autonomous Work</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-1">
                100%
              </div>
              <p className="text-white/40 text-sm">Audit Transparency</p>
            </div>
          </div>

          {/* Audience hooks */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {[
              { audience: 'Founders', message: 'Ship faster with AI that works while you sleep' },
              { audience: 'Developers', message: 'Full IDE + autonomous agent in one' },
              { audience: 'Vibe Coders', message: 'User-friendly interface with AI power features' }
            ].map((hook, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="p-6 bg-[#151515] border border-white/10 rounded-xl hover:border-white/20 transition-all">
                  <p className="text-coder1-purple text-base font-semibold uppercase tracking-widest mb-2">{hook.audience}</p>
                  <p className="text-white font-medium">{hook.message}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/30" />
        </div>
      </section>

      {/* ===== WHY CLAUDE CODE SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <Bot className="w-5 h-5 text-coder1-cyan" />
                <span className="text-coder1-cyan text-base font-medium">Claude Code Native</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                Why We Built Coder1<br />For Claude Code
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                We&apos;re Claude Code power users who got tired of babysitting sessions. Every feature was designed around Claude Code workflows.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Code,
                title: "Native CLI Integration",
                desc: "Not a wrapper, not a plugin - direct Claude Code CLI integration that just works."
              },
              {
                icon: Brain,
                title: "Session Memory That Survives",
                desc: "Context that persists across resets, handoffs, and overnight runs."
              },
              {
                icon: Moon,
                title: "Overnight Autonomy You Trust",
                desc: "Set it and forget it with confidence - full audit trail and safety rails."
              },
              {
                icon: Zap,
                title: "Built BY Claude Code Users",
                desc: "Every pain point you've felt, we've solved. Zero learning curve."
              }
            ].map((item, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="flex gap-5 p-6 bg-white/[0.02] border border-white/5 rounded-xl hover:border-coder1-cyan/20 transition-all group">
                  <div className="w-14 h-14 rounded-xl bg-coder1-cyan/10 flex items-center justify-center flex-shrink-0 group-hover:bg-coder1-cyan/20 transition-all icon-shimmer">
                    <item.icon className="w-7 h-7 text-coder1-cyan" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-white/50">{item.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== IDE FEATURES SECTION ===== */}
      <section className="py-24" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                A Complete AI-Powered IDE
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Everything you need to build, all in one place
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            {[
              { icon: Code, name: 'Monaco Editor', desc: 'Syntax highlighting, IntelliSense' },
              { icon: Terminal, name: 'Integrated Terminal', desc: 'Full terminal access' },
              { icon: Eye, name: 'Live Preview', desc: 'See changes instantly' },
              { icon: History, name: 'Session Management', desc: 'Never lose context' },
              { icon: Link2, name: 'AI Assistance', desc: 'Connect to your AI Agent' }
            ].map((feature, idx) => (
              <ScrollReveal key={idx} delay={idx * 50}>
                <FeatureCard icon={feature.icon} title={feature.name} description={feature.desc} />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="text-center p-8 bg-gradient-to-r from-coder1-purple/10 to-coder1-cyan/10 border border-coder1-purple/20 rounded-2xl">
              <ChevronDown className="w-8 h-8 text-coder1-purple mx-auto mb-4 animate-bounce" />
              <p className="text-[28px] font-semibold text-coder1-cyan">
                But here&apos;s what makes Coder1 different...
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== JOHNNY5 SECTION ===== */}
      <section className="py-24 bg-[#080808]" id="johnny5">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-purple/10 border border-coder1-purple/20 rounded-full mb-6">
                <Bot className="w-5 h-5 text-coder1-purple" />
                <span className="text-coder1-cyan text-base font-medium">Your AI Employee</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Meet <span className="text-shimmer">Johnny5</span>
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                The autonomous agent that works while you sleep
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: Moon,
                title: 'Autonomous Overnight Work',
                desc: 'Johnny5 builds features while you rest. Queue up tasks before bed, wake up to completed code. No more late nights.'
              },
              {
                icon: MessageCircle,
                title: 'WhatsApp Communication',
                desc: 'Message Johnny5 directly via WhatsApp. Get updates, ask questions, and give instructions from anywhere - no IDE required.'
              },
              {
                icon: Infinity,
                title: '8,000+ MCP Integrations',
                desc: 'Connect to thousands of tools and services. Johnny5 works autonomously around the clock with access to your entire stack.'
              },
              {
                icon: TrendingUp,
                title: 'Trend Monitoring',
                desc: 'Watches X, GitHub, and HackerNews for opportunities relevant to your project. Alerts you to new releases, your competitors, and trends.'
              },
              {
                icon: GitPullRequest,
                title: 'Proactive PR Creation',
                desc: 'Notices feature requests in Slack conversations and GitHub issues. Builds them automatically and creates PRs for your review.'
              },
              {
                icon: Sun,
                title: 'Morning Briefings',
                desc: 'Start each day knowing exactly what got done. Clear summaries of completed work, research findings, and items needing attention.'
              }
            ].map((card, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <FeatureCard icon={card.icon} title={card.title} description={card.desc} gradient />
              </ScrollReveal>
            ))}
          </div>

          {/* Full width security card */}
          <ScrollReveal>
            <div className="p-8 bg-gradient-to-br from-coder1-cyan/10 to-coder1-purple/10 border border-coder1-cyan/20 rounded-2xl transition-all duration-300 hover:border-orange-400/60 hover:shadow-lg hover:shadow-orange-400/40">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-xl bg-coder1-cyan/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-8 h-8 text-coder1-cyan" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Security Transparency</h3>
                  <p className="text-white/50 text-lg leading-relaxed">
                    See every decision, every action, full audit trail. Unlike black-box AI tools,
                    Johnny5 shows you exactly what it&apos;s doing and why. Full session replay available.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Comparison with OpenClaw */}
          <ScrollReveal>
            <div className="mt-12 p-8 bg-gradient-to-br from-coder1-cyan/5 to-coder1-purple/5 border-2 border-coder1-cyan/20 rounded-2xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold text-coder1-cyan">Johnny5</span>
                  <span className="text-white/30 text-xl">vs</span>
                  <span className="text-2xl font-bold text-white/50">OpenClaw</span>
                </div>
                <p className="text-white/40 text-sm max-w-xl mx-auto">
                  Inspired by the ClawdBot movement. When OpenClaw hit 100K stars in 3 days, the message was clear.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-4 px-4 text-white/40 font-medium border-b border-white/10">Feature</th>
                      <th className="text-center py-4 px-6 font-bold text-lg bg-coder1-cyan/10 border border-coder1-cyan/30 rounded-t-lg">
                        <span className="text-coder1-cyan">Johnny5</span>
                      </th>
                      <th className="text-center py-4 px-6 text-white/50 font-medium border-b border-white/10">OpenClaw</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    <tr>
                      <td className="py-4 px-4 text-white/50 border-b border-white/5">Environment</td>
                      <td className="py-4 px-6 text-center font-medium bg-coder1-cyan/5 border-x border-coder1-cyan/20">Integrated in IDE</td>
                      <td className="py-4 px-6 text-center text-white/40 border-b border-white/5">Standalone app</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-white/50 border-b border-white/5">Target User</td>
                      <td className="py-4 px-6 text-center font-medium bg-coder1-cyan/5 border-x border-coder1-cyan/20">Developers / Founders</td>
                      <td className="py-4 px-6 text-center text-white/40 border-b border-white/5">General users</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-white/50 border-b border-white/5">Communication</td>
                      <td className="py-4 px-6 text-center font-medium bg-coder1-cyan/5 border-x border-coder1-cyan/20">WhatsApp / IDE</td>
                      <td className="py-4 px-6 text-center text-white/40 border-b border-white/5">WhatsApp / Telegram</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-white/50 border-b border-white/5">Security</td>
                      <td className="py-4 px-6 text-center font-medium text-coder1-cyan bg-coder1-cyan/5 border-x border-coder1-cyan/20">✓ Enterprise audit trails</td>
                      <td className="py-4 px-6 text-center text-white/40 border-b border-white/5">⚠️ Concerns raised</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-white/50">Focus</td>
                      <td className="py-4 px-6 text-center font-medium bg-coder1-cyan/5 border-x border-b border-coder1-cyan/20 rounded-b-lg">Code &amp; general tasks</td>
                      <td className="py-4 px-6 text-center text-white/40">General tasks</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>

          {/* Live terminal demo */}
          <div className="mt-12">
            <ScrollReveal>
              <div className="text-center mb-8">
                <p className="text-white/40 text-4xl uppercase tracking-widest font-bold">DEMO</p>
              </div>
              <LiveTerminalDemo />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ===== MORNING BRIEF DEMO SECTION ===== */}
      <section className="py-24" id="demo">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Wake Up to This
              </h2>
              <p className="text-lg text-white/50">
                Your daily briefing from Johnny5 - click to reveal each section
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <MorningBriefDemo />
          </ScrollReveal>
        </div>
      </section>

      {/* ===== WHAT JOHNNY5 BUILT SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <Coffee className="w-6 h-6 text-coder1-cyan" />
                <span className="text-coder1-cyan text-lg font-medium">Real Results</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                What Johnny5 Built Last Night
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Actual PRs created by Johnny5 for alpha users while they slept
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                project: 'SaaS Dashboard',
                pr: 'Add dark mode toggle with system preference detection',
                lines: 127,
                time: '2:34 AM',
                status: 'merged'
              },
              {
                project: 'E-commerce API',
                pr: 'Implement rate limiting middleware with Redis',
                lines: 89,
                time: '3:12 AM',
                status: 'merged'
              },
              {
                project: 'Mobile App',
                pr: 'Fix accessibility issues flagged in lighthouse audit',
                lines: 234,
                time: '4:47 AM',
                status: 'reviewing'
              }
            ].map((item, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="p-6 bg-[#0D0D0D] border border-white/10 rounded-xl hover:border-coder1-cyan/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-white/40 font-mono">{item.time}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'merged'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {item.status === 'merged' ? '✓ Merged' : '⏳ In Review'}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mb-2">{item.project}</p>
                  <p className="text-white font-medium mb-4">{item.pr}</p>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      {item.lines} lines
                    </span>
                    <span className="flex items-center gap-1">
                      <GitPullRequest className="w-3 h-3" />
                      Pull Request
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECURITY SECTION ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                See Everything Your AI Does
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Other AI tools are black boxes. Johnny5 shows you everything.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: ClipboardList, title: 'Full Audit Trail', desc: 'Every action logged with timestamp and reasoning' },
              { icon: ShieldAlert, title: 'Prompt Injection Detection', desc: 'Real-time blocking of suspicious inputs' },
              { icon: Lock, title: 'Permission Boundaries', desc: 'Clear scope definitions, risky ops flagged' },
              { icon: PlayCircle, title: 'Session Replay', desc: 'Step-by-step playback of AI reasoning' }
            ].map((item, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div
                  className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-xl transition-all duration-300 cursor-pointer group hover:border-coder1-cyan hover:-translate-y-1"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.4), 0 0 40px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0, 217, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="w-14 h-14 rounded-xl bg-coder1-cyan/10 flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110 icon-shimmer">
                    <item.icon className="w-7 h-7 text-coder1-cyan" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MORE FEATURES SECTION ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                More Than Just Johnny5
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                A complete development experience
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              { icon: Brain, name: 'Contextual Memory', desc: 'Never re-explain your project' },
              { icon: Mic, name: 'Voice-to-Text', desc: 'Code at the speed of thought' },
              { icon: Eye, name: 'AI Supervision', desc: 'AI watches your Claude sessions' },
              { icon: Zap, name: 'Templates & Hooks', desc: 'Intelligent automation' },
              { icon: Book, name: 'Codebase Wiki', desc: 'Living documentation' },
              { icon: FileText, name: 'Session Summaries', desc: 'Seamless handoffs' },
              { icon: Palette, name: 'Component Studio', desc: 'Visual component building' },
              { icon: Slash, name: '/Commands', desc: 'Everything at slash-command speed' }
            ].map((feature, idx) => (
              <ScrollReveal key={idx} delay={idx * 50}>
                <div
                  className="p-6 bg-white/[0.02] border border-white/5 rounded-xl transition-all duration-300 cursor-pointer group hover:border-orange-500 hover:-translate-y-1"
                  style={{}}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2), inset 0 0 20px rgba(249, 115, 22, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <feature.icon className="w-7 h-7 text-coder1-purple mb-3 transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="font-semibold text-base mb-1">{feature.name}</h3>
                  <p className="text-white/40 text-sm">{feature.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* ===== MEMORY DEMO ===== */}
          <ScrollReveal delay={200}>
            <MemoryComparisonDemo />
          </ScrollReveal>
        </div>
      </section>

      {/* ===== COMPARISON SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Why Developers Are Switching
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                See how Coder1 compares to alternatives
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="overflow-x-auto">
              <table className="w-full bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                <thead>
                  <tr className="bg-white/[0.05]">
                    <th className="py-4 px-4 text-left font-semibold">Feature</th>
                    <th className="py-4 px-4 text-center font-semibold bg-coder1-cyan/10 text-coder1-cyan">Coder1 IDE</th>
                    <th className="py-4 px-4 text-center font-semibold text-white/60">Cursor</th>
                    <th className="py-4 px-4 text-center font-semibold text-white/60">GitHub Copilot</th>
                    <th className="py-4 px-4 text-center font-semibold text-white/60">VS Code + Claude</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow feature="Full IDE" coder1="yes" cursor="yes" copilot="no" vscode="yes" />
                  <ComparisonRow feature="Autonomous Overnight Work" coder1="yes" cursor="no" copilot="no" vscode="no" tooltip="Johnny5 works while you sleep, creating PRs and researching" />
                  <ComparisonRow feature="Morning Briefings" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Proactive PR Creation" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Security Audit Trail" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Contextual Memory" coder1="infinity" cursor="partial" copilot="no" vscode="partial" />
                  <ComparisonRow feature="Prompt Injection Detection" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Session Replay" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Free Forever Plan" coder1="yes" cursor="no" copilot="no" vscode="partial" />
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section className="py-24" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Start Free, Scale When Ready
              </h2>
              <p className="text-lg text-white/50">
                No credit card required to get started
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            <ScrollReveal delay={0}>
              <PricingCard
                tier="Free Forever"
                price="$0"
                period="per month"
                features={[
                  'Basic IDE features',
                  '50 Johnny5 messages',
                  '1 click MCP\'s',
                  'AI agents',
                  'Sandbox environments',
                  'Community support',
                  'Basic session history'
                ]}
                cta="Get Started"
                subtext="No credit card required"
                onClick={() => document.getElementById('alpha')?.scrollIntoView({ behavior: 'smooth' })}
              />
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <PricingCard
                tier="Pro"
                price="$29"
                period="per month"
                features={[
                  'Everything in Free',
                  'Unlimited Johnny5 tasks',
                  'Contextual Memory',
                  'Priority support',
                  'Full audit trail',
                  'Session replay'
                ]}
                cta="Start Pro Trial"
                featured
                badge="Most Popular"
                onClick={handleProCheckout}
                loading={checkoutLoading}
              />
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <PricingCard
                tier="Team"
                price="Custom"
                period="contact us"
                features={[
                  'Everything in Pro',
                  'Team collaboration',
                  'Admin dashboard',
                  'SSO/SAML',
                  'Dedicated support',
                  'Custom integrations'
                ]}
                cta="Contact Sales"
                onClick={() => window.location.href = 'mailto:alpha@coder1.ai?subject=Coder1 Team Plan Inquiry'}
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="pt-24 pb-0 bg-[#080808] relative">
        <div className="max-w-3xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-coder1-cyan">
                Everything you need to know about Coder1 IDE
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            <ScrollReveal delay={50}>
              <FAQItem
                question="What makes Coder1 different from Cursor or GitHub Copilot?"
                answer="Coder1 is purpose-built for Claude Code users. Unlike Cursor or Copilot which focus on code completion, Coder1 provides a complete IDE experience with Johnny5 - an autonomous agent that works overnight, creates PRs, and briefs you every morning. Plus, you get full audit trails, session replay, and security transparency that other tools don't offer."
              />
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <FAQItem
                question="What exactly is Johnny5?"
                answer="Johnny5 is your AI employee built into Coder1. It works autonomously while you sleep - monitoring GitHub issues, Slack conversations, and trend feeds to identify work. It then builds features, creates pull requests, and prepares a morning briefing so you wake up to completed work instead of a todo list."
              />
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <FAQItem
                question="Do I need to install anything locally?"
                answer="Coder1 IDE runs in your browser, but to connect it to your local codebase, you'll install our lightweight bridge CLI. This creates a secure tunnel between the web IDE and your machine, letting you run terminal commands, access files, and execute Claude Code locally while using the full IDE interface."
              />
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <FAQItem
                question="Is my code secure? Where is it stored?"
                answer="Your code never leaves your machine unless you explicitly push to GitHub. The bridge CLI runs locally and only transmits terminal output and file contents to your browser session. We don't store your code on our servers. All AI processing happens through your own API keys, and you can see every action in the full audit trail."
              />
            </ScrollReveal>

            <ScrollReveal delay={250}>
              <FAQItem
                question="What is Contextual Memory and how does it work?"
                answer="Contextual Memory eliminates the frustration of re-explaining your project to Claude. It automatically captures important decisions, breakthroughs, and architecture patterns from your sessions. When you start a new session, this context is available so Claude understands your codebase, preferences, and past decisions without you having to repeat yourself."
              />
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <FAQItem
                question="Can I use my own Anthropic API key?"
                answer="Yes! Coder1 works with your own API keys. This means you control costs, have full visibility into usage, and your conversations stay private. We never see your API traffic - it goes directly from your browser to Anthropic's servers."
              />
            </ScrollReveal>

            <ScrollReveal delay={350}>
              <FAQItem
                question="What's included in the free plan?"
                answer="The free plan includes the full IDE experience: Monaco editor, integrated terminal, live preview, session management, and basic Johnny5 functionality (5 tasks per day). You can use it indefinitely - we believe in letting you experience the product before committing."
              />
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <FAQItem
                question="How is Johnny5 different from just running Claude Code?"
                answer="Claude Code is reactive - you give it a task and it executes. Johnny5 is proactive. It monitors your project's ecosystem (GitHub, Slack, news feeds), identifies opportunities and issues, prioritizes them, and takes action autonomously. It's the difference between having an assistant who waits for instructions versus an employee who anticipates needs."
              />
            </ScrollReveal>

            <ScrollReveal delay={450}>
              <FAQItem
                question="What if Johnny5 makes a mistake while I'm asleep?"
                answer="Johnny5 never pushes directly to your main branch. All work is done in feature branches with pull requests for your review. You have full session replay to see exactly what it did and why. Plus, our prompt injection detection and permission boundaries prevent it from taking destructive actions."
              />
            </ScrollReveal>

            <ScrollReveal delay={500}>
              <FAQItem
                question="Can I use Coder1 with my existing VS Code setup?"
                answer="Coder1 is a standalone IDE, not a VS Code extension. However, it's designed to complement your existing workflow. Many users keep VS Code for certain tasks while using Coder1 for Claude Code sessions where the integrated terminal, session management, and Johnny5 features shine."
              />
            </ScrollReveal>

            <ScrollReveal delay={550}>
              <FAQItem
                question="How do I get started with the alpha?"
                answer="Sign up below with your email. We're onboarding alpha users in batches to ensure quality support. Once accepted, you'll get access to the full IDE, documentation, and our Discord community where the team is actively helping users and gathering feedback."
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ===== ALPHA CTA SECTION ===== */}
      <section className="relative pt-0 pb-24 overflow-visible" id="alpha">
        {/* Purple light rays background - positioned below FAQ */}
        <div className="absolute top-8 left-0 right-0 bottom-0 bg-[#0A0A0A]" />
        <div className="absolute top-0 left-0 right-0 h-[600px]">
          <LightRays
            raysOrigin="top-center"
            raysColor="#8B5CF6"
            raysSpeed={0.8}
            lightSpread={1.2}
            rayLength={2.5}
            pulsating={false}
            fadeDistance={1.2}
            saturation={1.2}
            followMouse={true}
            mouseInfluence={0.05}
            noiseAmount={0}
            distortion={0}
          />
        </div>
        {/* Radial fade to soften edges */}
        <div
          className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 0%, transparent 0%, transparent 40%, #0A0A0A 85%)'
          }}
        />

        <div className="relative z-10 max-w-xl mx-auto px-6 text-center pt-40">
          <ScrollReveal>
            {/* Urgency badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-full mb-6">
              <div className="w-2 h-2 bg-amber-400/70 rounded-full animate-pulse" />
              <span className="text-amber-300/80 text-sm font-semibold">Only 47 Alpha spots remaining</span>
            </div>

            <h2 className="font-bold mb-4 tracking-tight text-center">
              <span className="block text-3xl sm:text-4xl md:text-5xl">Be First to Experience</span>
              <span className="block text-2xl sm:text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-coder1-cyan to-coder1-purple">
                Autonomous Development
              </span>
            </h2>
            <p className="text-lg text-white/50 mb-10">
              Alpha access is limited. Get in for free and shape the future.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-coder1-cyan/50 transition-colors"
              />
              <input
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="GitHub username (optional)"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-coder1-cyan/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-coder1-purple to-coder1-cyan rounded-xl text-lg font-semibold hover:shadow-xl hover:shadow-coder1-cyan/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Joining...' : 'Request Alpha Access'}
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <CreditCard className="w-4 h-4 text-coder1-cyan" />
                <span className="text-white/80 text-sm font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <ShieldCheck className="w-4 h-4 text-coder1-cyan" />
                <span className="text-white/80 text-sm font-medium">Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <Ban className="w-4 h-4 text-coder1-cyan" />
                <span className="text-white/80 text-sm font-medium">Cancel anytime</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-16 bg-[#080808] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Product</h4>
              <div className="space-y-3">
                <a href="#features" className="block text-white/50 hover:text-white transition-colors text-sm">Features</a>
                <a href="#pricing" className="block text-white/50 hover:text-white transition-colors text-sm">Pricing</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">Changelog</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">Roadmap</a>
              </div>
            </div>
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Resources</h4>
              <div className="space-y-3">
                <a href="/documentation" className="block text-white/50 hover:text-white transition-colors text-sm">Documentation</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">Blog</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">Tutorials</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">API Reference</a>
              </div>
            </div>
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Company</h4>
              <div className="space-y-3">
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">About</a>
                <a href="mailto:alpha@coder1.ai" className="block text-white/50 hover:text-white transition-colors text-sm">Contact</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">Careers</a>
                <a href="#" className="block text-white/50 hover:text-white transition-colors text-sm">Press</a>
              </div>
            </div>
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Connect</h4>
              <div className="flex gap-3">
                <a
                  href="https://github.com/coder1-ide"
                  target="_blank"
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://discord.gg/coder1"
                  target="_blank"
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/coder1ide"
                  target="_blank"
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-white/30 text-sm">
              &copy; 2026 Coder1. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
