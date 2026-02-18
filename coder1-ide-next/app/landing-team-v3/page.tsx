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
  AlertTriangle, BarChart3, ExternalLink, Users, UserMinus, Layers
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
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;

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
  }, [mounted, delay]);

  // Server render: show content without animation classes
  if (!mounted) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

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
      title: 'Team context synced',
      items: [
        '- Sarah\'s auth refactor patterns imported',
        '- Mike\'s API conventions learned',
        '- New architecture decisions indexed'
      ]
    },
    {
      icon: BarChart3,
      color: 'text-coder1-cyan',
      title: 'Knowledge preserved',
      items: [
        '- 3 developers\' context merged this week',
        '- 47 codebase patterns now shared'
      ]
    },
    {
      icon: TrendingUp,
      color: 'text-amber-400',
      title: 'Team intelligence growing',
      items: [
        '- New team member onboarded with full context',
        '- Zero re-explanation needed for your stack',
        '- Context handoff completed automatically'
      ]
    },
    {
      icon: AlertTriangle,
      color: 'text-red-400',
      title: '1 context gap detected',
      items: [
        '- Payment module needs team documentation'
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
          <span className="text-xs text-white/40 ml-2 font-mono">johnny5 - team intelligence</span>
        </div>

        {/* Content */}
        <div className="p-6 font-mono text-sm space-y-4">
          <div className="text-coder1-cyan animate-pulse">
            Good morning! Your team&apos;s shared AI brain:
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
  onClick
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
        className={`
        w-full py-3 rounded-xl font-semibold transition-all duration-300
        ${featured
          ? 'bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white hover:shadow-lg hover:shadow-coder1-cyan/30'
          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
        }
      `}>
        {cta}
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
    { type: 'command', text: '$ johnny5 sync --team' },
    { type: 'output', text: 'Syncing team knowledge...' },
    { type: 'output', text: 'Importing Sarah\'s context from last session...' },
    { type: 'success', text: 'Merged: Auth patterns, API conventions, test strategies' },
    { type: 'output', text: 'Checking for new team members...' },
    { type: 'output', text: 'Found: Alex joined yesterday' },
    { type: 'command', text: '> Onboarding Alex with full codebase context' },
    { type: 'output', text: 'Transferring 2 months of team learnings...' },
    { type: 'output', text: 'Sharing architecture decisions...' },
    { type: 'output', text: 'Importing coding conventions...' },
    { type: 'success', text: 'Alex now has full team context - zero ramp-up needed' },
    { type: 'output', text: '' },
    { type: 'command', text: '> Preserving departing dev context...' },
    { type: 'output', text: 'Mike\'s last day was Friday' },
    { type: 'alert', text: 'Knowledge preserved: His AI context saved for team' },
    { type: 'success', text: 'No knowledge lost. Team memory intact.' },
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
        <span className="text-[10px] text-white/30 ml-2">johnny5 --team-brain</span>
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
export default function LandingTeamV3Page() {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [github, setGithub] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        body: JSON.stringify({ email, github, source: 'landing_team_v3' })
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
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/Coder1-Logo-Sharp.svg"
                alt="Coder1"
                width={250}
                height={80}
                className="h-20 w-auto"
              />
            </Link>

            {/* Nav Links - Center */}
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <a href="#features" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Features</a>
              <Link href="/teams" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Teams</Link>
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
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-12">
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-coder1-purple/20 to-coder1-cyan/20 border border-coder1-purple/30 rounded-full mb-8"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            <Brain className="w-4 h-4 text-coder1-purple" />
            <span className="text-sm font-semibold bg-gradient-to-r from-coder1-purple to-coder1-cyan bg-clip-text text-transparent">
              Shared AI Memory for Teams
            </span>
          </div>

          {/* Title - Logo flies in after typing completes */}
          <div className="mb-4 flex justify-center">
            <Image
              src="/Coder1-Logo-Sharp.svg"
              alt="Coder1 IDE"
              width={400}
              height={128}
              className="h-20 md:h-28 w-auto animate-[flyIn_0.8s_ease-out_2.8s_forwards]"
              style={{ opacity: 0 }}
              priority
            />
          </div>

          {/* Subtitle - Shared AI Brain positioning */}
          <div className="mb-6 subtitle-fade-in">
            <p className="text-5xl md:text-6xl lg:text-7xl text-white font-bold">
              Stop Re-Explaining
            </p>
            <p className="text-5xl md:text-6xl lg:text-7xl text-coder1-cyan font-bold">
              Your Codebase to AI
            </p>
          </div>

          {/* Description */}
          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            The IDE with shared team memory. AI learns once. Everyone benefits. Every developer re-explains the same codebase to their own AI. When someone leaves, their AI&apos;s context is lost forever. Coder1&apos;s shared memory changes everything.
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
                <Infinity className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-white/40 text-sm">Shared Team Memory</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-1">
                0
              </div>
              <p className="text-white/40 text-sm">Context Lost on Turnover</p>
            </div>
          </div>

          {/* Audience hooks - Team focused */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {[
              { audience: 'Growing Teams', message: 'New devs inherit the collective AI\'s understanding' },
              { audience: 'High-Turnover Teams', message: 'Context survives when developers leave' },
              { audience: 'Complex Codebases', message: 'AI that truly understands your architecture' }
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

      {/* ===== WHY CODER1 SECTION - Shared AI Brain ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <Brain className="w-5 h-5 text-coder1-cyan" />
                <span className="text-coder1-cyan text-base font-medium">Team Intelligence</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                One AI Brain for<br />Your Entire Team
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Stop the context loss. Start building faster.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Users,
                title: "Learn Once, Benefit Everyone",
                desc: "When AI learns about your codebase, the whole team benefits. No more individual silos of AI knowledge."
              },
              {
                icon: Brain,
                title: "Institutional Knowledge",
                desc: "When a developer leaves, their AI context stays. Years of accumulated understanding preserved forever."
              },
              {
                icon: Zap,
                title: "Instant Onboarding",
                desc: "New devs start with full codebase understanding, day one. Zero ramp-up time, immediate productivity."
              },
              {
                icon: History,
                title: "Zero Re-Explanation",
                desc: "Never tell AI about your project structure again. The shared brain already knows everything."
              },
              {
                icon: Clock,
                title: "Time Capsules",
                desc: "Every AI decision permanently linked to code. Context that survives forever—see the exact AI conversation behind any commit."
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

      {/* ===== PAIN POINTS SECTION - Team Focus ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                The Problem With Individual AI
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Every team faces these frustrations daily
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: AlertTriangle,
                problem: "AI Forgets Everything",
                pain: "Every dev re-explains the same codebase",
                color: "text-red-400"
              },
              {
                icon: UserMinus,
                problem: "Context Is Lost Forever",
                pain: "When someone leaves, their AI knowledge goes too",
                color: "text-amber-400"
              },
              {
                icon: Clock,
                problem: "Onboarding Takes Weeks",
                pain: "New devs start from scratch with AI",
                color: "text-orange-400"
              }
            ].map((item, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="p-8 bg-[#0D0D0D] border border-white/10 rounded-xl text-center">
                  <item.icon className={`w-12 h-12 ${item.color} mx-auto mb-4`} />
                  <h3 className="text-xl font-semibold mb-2">{item.problem}</h3>
                  <p className="text-white/50">{item.pain}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== IDE FEATURES SECTION ===== */}
      <section className="py-24 bg-[#080808]" id="features">
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

      {/* ===== JOHNNY5 SECTION - Team Collective Intelligence ===== */}
      <section className="py-24" id="johnny5">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-purple/10 border border-coder1-purple/20 rounded-full mb-6">
                <Bot className="w-5 h-5 text-coder1-purple" />
                <span className="text-coder1-cyan text-base font-medium">Your Team&apos;s Shared Brain</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Meet <span className="text-shimmer">Johnny5</span> - Your Team&apos;s Collective Intelligence
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                One AI that knows your entire team&apos;s context
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: Brain,
                title: 'Team Memory',
                desc: 'Remembers every decision, every pattern, every preference. The collective knowledge of your entire team in one AI brain.'
              },
              {
                icon: ArrowRight,
                title: 'Context Handoffs',
                desc: 'Seamless context transfer between team members. When Sarah goes on vacation, the AI knows exactly what she was working on.'
              },
              {
                icon: Sun,
                title: 'Team Intelligence Briefings',
                desc: 'Morning updates that keep everyone aligned. What changed overnight, who needs to know what, and where to focus today.'
              },
              {
                icon: TrendingUp,
                title: 'Accumulated Learning',
                desc: 'AI gets smarter as your team uses it. Every interaction, every decision, every pattern makes the shared brain more powerful.'
              },
              {
                icon: GitPullRequest,
                title: 'Proactive PR Creation',
                desc: 'Notices feature requests in Slack conversations and GitHub issues. Builds them automatically and creates PRs for your review.'
              },
              {
                icon: Moon,
                title: 'Autonomous Overnight Work',
                desc: 'Johnny5 builds features while you rest. Queue up tasks before bed, wake up to completed code. No more late nights.'
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
      <section className="py-24 bg-[#080808]" id="demo">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Wake Up to This
              </h2>
              <p className="text-lg text-white/50">
                Your daily team intelligence briefing - click to reveal each section
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <MorningBriefDemo />
          </ScrollReveal>
        </div>
      </section>

      {/* ===== USE CASES SECTION ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <Layers className="w-6 h-6 text-coder1-cyan" />
                <span className="text-coder1-cyan text-lg font-medium">Use Cases</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Built for Teams Like Yours
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                From startups to enterprise, shared AI memory transforms how teams work
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Growing Startups',
                description: 'Scale your team without losing context. Every new hire inherits months of AI learning instantly.',
                icon: TrendingUp
              },
              {
                title: 'Agencies',
                description: 'Switch between client codebases with full memory. No re-onboarding AI for each project.',
                icon: Layers
              },
              {
                title: 'Enterprise',
                description: 'Preserve institutional knowledge across teams. Decades of context, never lost.',
                icon: Shield
              }
            ].map((item, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="p-6 bg-[#0D0D0D] border border-white/10 rounded-xl hover:border-coder1-cyan/30 transition-all">
                  <item.icon className="w-10 h-10 text-coder1-cyan mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-white/50">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECURITY SECTION ===== */}
      <section className="py-24 bg-[#080808]">
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
                More Than Just Shared Memory
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
        </div>
      </section>

      {/* ===== COMPARISON SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Why Teams Are Switching
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
                  <ComparisonRow feature="Shared Team Memory" coder1="infinity" cursor="no" copilot="no" vscode="no" tooltip="Team-wide AI context that persists across all members" />
                  <ComparisonRow feature="Context Survives Turnover" coder1="yes" cursor="no" copilot="no" vscode="no" tooltip="When developers leave, their AI knowledge stays with the team" />
                  <ComparisonRow feature="Full IDE" coder1="yes" cursor="yes" copilot="no" vscode="yes" />
                  <ComparisonRow feature="Autonomous Overnight Work" coder1="yes" cursor="no" copilot="no" vscode="no" tooltip="Johnny5 works while you sleep, creating PRs and researching" />
                  <ComparisonRow feature="Morning Briefings" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Proactive PR Creation" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Security Audit Trail" coder1="yes" cursor="no" copilot="no" vscode="no" />
                  <ComparisonRow feature="Contextual Memory" coder1="infinity" cursor="partial" copilot="no" vscode="partial" />
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
                price="$19"
                period="per month"
                features={[
                  'Everything in Free',
                  'Unlimited Johnny5 messages',
                  'Contextual Memory',
                  'Voice-to-text',
                  'AI supervision',
                  'Priority support',
                  'Full audit trail',
                  'Session replay'
                ]}
                cta="Start Pro Trial"
                featured
                badge="Most Popular"
                onClick={() => document.getElementById('alpha')?.scrollIntoView({ behavior: 'smooth' })}
              />
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <PricingCard
                tier="Team"
                price="$24"
                period="per user/month"
                features={[
                  'Everything in Pro',
                  'Shared Team Memory',
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
      <section className="py-24 bg-[#080808]">
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
                question="How does shared team memory actually work?"
                answer="When any team member interacts with Johnny5 and teaches it something about your codebase, that knowledge is automatically shared with the entire team's AI context. Every pattern recognized, every architecture decision learned, every coding convention discovered becomes part of the collective intelligence that benefits everyone."
              />
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <FAQItem
                question="What happens when a developer leaves the team?"
                answer="Their AI context stays with the team forever. Every insight they helped the AI learn, every problem they solved, every pattern they established - it all remains in the shared memory. No more losing months of accumulated knowledge when someone moves on."
              />
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <FAQItem
                question="How fast can new team members get productive?"
                answer="Day one. New developers inherit the entire team's accumulated AI knowledge instantly. The AI already knows your codebase, your conventions, your architecture decisions. No weeks of ramping up - they start with full context immediately."
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
                question="Can different team members have different access levels?"
                answer="Yes. The Team plan includes admin controls for managing who can contribute to the shared memory, who can view certain contexts, and what level of autonomous action Johnny5 can take for each team member."
              />
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <FAQItem
                question="How is this different from just using Claude Code?"
                answer="Claude Code gives each developer their own isolated AI context that disappears between sessions. Coder1 creates a persistent, shared team brain that accumulates knowledge over time, survives turnover, and means no one ever has to re-explain your codebase again."
              />
            </ScrollReveal>

            <ScrollReveal delay={350}>
              <FAQItem
                question="What's included in the free plan?"
                answer="The free plan includes the full IDE experience: Monaco editor, integrated terminal, live preview, session management, and basic Johnny5 functionality (50 messages per month). You can use it indefinitely - we believe in letting you experience the product before committing."
              />
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <FAQItem
                question="Can I use my own Anthropic API key?"
                answer="Yes! Coder1 works with your own API keys. This means you control costs, have full visibility into usage, and your conversations stay private. We never see your API traffic - it goes directly from your browser to Anthropic's servers."
              />
            </ScrollReveal>

            <ScrollReveal delay={450}>
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
          className="absolute inset-0 pointer-events-none"
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
              <span className="block text-3xl sm:text-4xl md:text-5xl">Ready for AI</span>
              <span className="block text-2xl sm:text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-coder1-cyan to-coder1-purple">
                That Remembers?
              </span>
            </h2>
            <p className="text-lg text-white/50 mb-10">
              Join teams who never re-explain their codebase
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
