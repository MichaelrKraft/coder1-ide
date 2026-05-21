'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LightRays from '@/components/backgrounds/LightRays';
import {
  Code, Terminal, Eye, History, Link2, Moon, GitPullRequest, Sun,
  TrendingUp, Shield, ClipboardList, ShieldAlert, Lock, PlayCircle,
  Brain, Mic, Zap, Book, FileText, Palette, Slash, Check, X, Infinity,
  CreditCard, ShieldCheck, Ban, Github, MessageCircle, Twitter,
  ChevronDown, ArrowRight, Sparkles, Bot, Clock, Coffee, CheckCircle,
  AlertTriangle, BarChart3, Users, HardDrive, Cpu, GitBranch,
  Database, Layers, Workflow, RefreshCw, GraduationCap
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timeout = setTimeout(() => {
      let startTime: number | null = null;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 300);
    return () => clearTimeout(timeout);
  }, [mounted, end, duration]);

  if (!mounted) {
    return <span className="tabular-nums">{prefix}{end.toLocaleString()}{suffix}</span>;
  }
  return <span className="tabular-nums">{prefix}{count.toLocaleString()}{suffix}</span>;
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
        if (entry.isIntersecting) setTimeout(() => setIsVisible(true), delay);
      },
      { threshold: 0, rootMargin: '200px 0px 200px 0px' }
    );
    observer.observe(ref.current);
    const fallback = setTimeout(() => setIsVisible(true), 150);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// AGENT HUB DEMO COMPONENT
// ============================================================================
function AgentHubDemo() {
  const [mounted, setMounted] = useState(false);
  const [approvalState, setApprovalState] = useState<'pending' | 'approved' | 'rejected'>('pending');
  useEffect(() => { setTimeout(() => setMounted(true), 300); }, []);

  const agents = [
    { name: 'Frontend Agent', model: 'Haiku', status: 'running', task: 'Building dark mode toggle', progress: 72, color: 'text-coder1-cyan', bg: 'bg-coder1-cyan/10', barColor: 'bg-coder1-cyan' },
    { name: 'Backend Agent', model: 'Sonnet', status: 'pending-approval', task: 'Optimize API caching layer', progress: 100, color: 'text-amber-400', bg: 'bg-amber-400/10', barColor: 'bg-amber-400' },
    { name: 'QA Agent', model: 'Opus', status: 'completed', task: 'Write integration tests', progress: 100, color: 'text-emerald-400', bg: 'bg-emerald-400/10', barColor: 'bg-emerald-400' },
  ];
  const approvalItem = {
    agent: 'Backend Agent',
    diff: `+ async function getCachedUser(id: string) {\n+   const cached = await redis.get(\`user:\${id}\`);\n+   if (cached) return JSON.parse(cached);\n+   const user = await db.users.findById(id);\n+   await redis.setex(\`user:\${id}\`, 300, JSON.stringify(user));\n+   return user;\n+ }`,
    files: '2 files changed, +47 lines'
  };

  return (
    <div className="relative">
      <div className="bg-[#0D0D0D] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Dashboard header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-white/40 font-mono ml-2">Agent Hub — 3 agents active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs text-amber-400">1 awaiting approval</span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {agents.map((agent, idx) => (
            <div key={idx} className="p-4 bg-[#111] border border-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${agent.bg} flex items-center justify-center`}>
                    <Bot className={`w-4 h-4 ${agent.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded font-mono">{agent.model}</span>
                    </div>
                    <span className="text-xs text-white/40">{agent.task}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  agent.status === 'running' ? 'bg-coder1-cyan/10 text-coder1-cyan' :
                  agent.status === 'pending-approval' ? 'bg-amber-400/10 text-amber-400' :
                  'bg-emerald-400/10 text-emerald-400'
                }`}>
                  {agent.status === 'running' ? 'Running' :
                   agent.status === 'pending-approval' ? 'Awaiting Approval' : 'Complete'}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${agent.barColor}`}
                  style={{
                    width: mounted ? `${agent.progress}%` : '0%',
                    transition: `width 1200ms cubic-bezier(0.4, 0, 0.2, 1) ${idx * 200}ms`,
                  }}
                />
              </div>
            </div>
          ))}

          {/* Approval gate */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            approvalState === 'approved' ? 'bg-emerald-400/5 border-emerald-400/30' :
            approvalState === 'rejected' ? 'bg-red-400/5 border-red-400/20' :
            'bg-amber-400/5 border-amber-400/20'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className={`w-4 h-4 ${
                approvalState === 'approved' ? 'text-emerald-400' :
                approvalState === 'rejected' ? 'text-red-400' : 'text-amber-400'
              }`} />
              <span className={`text-sm font-medium ${
                approvalState === 'approved' ? 'text-emerald-400' :
                approvalState === 'rejected' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {approvalState === 'approved' ? 'Merged — Backend Agent' :
                 approvalState === 'rejected' ? 'Changes Requested — Backend Agent' :
                 'Approval Required — ' + approvalItem.agent}
              </span>
            </div>
            <pre className="text-xs font-mono text-emerald-400/80 bg-[#0A0A0A] p-3 rounded-lg overflow-hidden leading-relaxed mb-3">
              {approvalItem.diff}
            </pre>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/30">{approvalItem.files}</span>
              {approvalState === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setApprovalState('approved')}
                    className="px-3 py-1.5 text-xs bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 rounded-lg hover:bg-emerald-400/20 transition-all"
                  >
                    Approve & Merge
                  </button>
                  <button
                    onClick={() => setApprovalState('rejected')}
                    className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-white/40 rounded-lg hover:bg-white/10 transition-all"
                  >
                    Request Changes
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setApprovalState('pending')}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-white/30 rounded-lg hover:bg-white/10 transition-all"
                >
                  Reset demo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MEMORY DEMO COMPONENT (simplified)
// ============================================================================
function MemoryDemo() {
  const memories = [
    { session: 'Session 1 — 3 weeks ago', item: 'Auth uses JWT with 7-day refresh cycle', importance: 9 },
    { session: 'Session 4 — 2 weeks ago', item: 'Never use Redis for user sessions — caused prod incident', importance: 10 },
    { session: 'Session 9 — 5 days ago', item: 'Prefers functional components, avoid class components', importance: 7 },
    { session: 'Session 14 — yesterday', item: 'Payment flow uses Stripe webhooks, not polling', importance: 8 },
  ];

  return (
    <div className="bg-[#0D0D0D] rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-white/40 font-mono ml-2">Persistent Memory — 847 entries indexed</span>
        </div>
        <span className="text-xs text-emerald-400">FTS5 searchable</span>
      </div>
      <div className="p-5 space-y-3">
        {memories.map((m, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-[#111] border border-white/5 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-coder1-cyan mt-1.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-white/30 block mb-1">{m.session}</span>
              <span className="text-sm text-white/80">{m.item}</span>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-xs text-white/30 mb-1">importance</div>
              <div className={`text-sm font-bold ${m.importance >= 9 ? 'text-coder1-cyan' : 'text-coder1-purple'}`}>{m.importance}/10</div>
            </div>
          </div>
        ))}
        <div className="text-center py-2">
          <span className="text-xs text-white/30">...843 more entries — every session compounds</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FEATURE CARD COMPONENT
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
  return (
    <div className={`
      p-6 rounded-xl transition-all duration-300 border group
      ${gradient
        ? 'bg-gradient-to-br from-coder1-purple/10 to-coder1-cyan/10 border-coder1-purple/20 hover:border-coder1-purple/40'
        : 'bg-white/[0.02] border-white/5 hover:border-coder1-cyan/20'
      }
    `}>
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center mb-4
        ${gradient ? 'bg-coder1-purple/20' : 'bg-coder1-cyan/10 group-hover:bg-coder1-cyan/20'}
        transition-all icon-shimmer
      `}>
        <Icon className={`w-6 h-6 ${gradient ? 'text-coder1-purple' : 'text-coder1-cyan'}`} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// ============================================================================
// PRICING CARD COMPONENT
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
    <div className="bg-[#151515] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-coder1-purple flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-5 text-white/60 leading-relaxed">{answer}</div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPARISON ROW COMPONENT
// ============================================================================
function ComparisonRow({
  feature,
  coder1,
  desktop,
  terminal,
  cowork,
  tooltip
}: {
  feature: string;
  coder1: 'yes' | 'no' | 'partial' | 'infinity';
  desktop: 'yes' | 'no' | 'partial';
  terminal: 'yes' | 'no' | 'partial';
  cowork: 'yes' | 'no' | 'partial';
  tooltip?: string;
}) {
  const renderCell = (value: string, highlighted = false) => {
    if (value === 'yes') return <Check className={`w-5 h-5 mx-auto ${highlighted ? 'text-coder1-cyan' : 'text-emerald-400'}`} />;
    if (value === 'no') return <X className="w-5 h-5 mx-auto text-white/20" />;
    if (value === 'infinity') return <Infinity className="w-5 h-5 mx-auto text-coder1-cyan" />;
    return <span className="text-amber-400 text-xs mx-auto block text-center">Partial</span>;
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-4 px-4 text-white/70">
        <div className="flex items-center gap-2">
          {feature}
          {tooltip && (
            <span className="text-[10px] text-white/30 hidden sm:inline">— {tooltip}</span>
          )}
        </div>
      </td>
      <td className="py-4 px-4 bg-coder1-cyan/5 border-x border-coder1-cyan/20">{renderCell(coder1, true)}</td>
      <td className="py-4 px-4">{renderCell(desktop)}</td>
      <td className="py-4 px-4">{renderCell(terminal)}</td>
      <td className="py-4 px-4">{renderCell(cowork)}</td>
    </tr>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function AlphaSystemLandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [utmContent, setUtmContent] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_content');
    if (utm) setUtmContent(utm);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch('/api/alpha/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, source: 'alpha_system', utm_content: utmContent || undefined })
      });
      if (response.ok) {
        window.location.href = '/alpha/success';
      } else {
        const data = await response.json();
        if (response.status === 409) {
          window.location.href = '/ide';
        } else {
          setFormError(data.error || 'Something went wrong. Please try again.');
        }
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
        setCheckoutLoading(false);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden" suppressHydrationWarning>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes flyIn {
          0% { opacity: 0; transform: scale(0.3) translateZ(-500px); filter: blur(10px); }
          50% { opacity: 0.8; filter: blur(2px); }
          100% { opacity: 1; transform: scale(1) translateZ(0); filter: blur(0); }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #00D9FF 0%, #8B5CF6 50%, #00D9FF 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .text-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0.85) 100%);
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
          top: 0; left: 0;
          width: 200%; height: 200%;
          background: linear-gradient(-45deg, transparent 0%, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%, transparent 100%);
          animation: iconShimmer 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes iconShimmer {
          0% { transform: translate(-50%, 50%); }
          30%, 100% { transform: translate(50%, -50%); }
        }
        .subtitle-fade-in {
          animation: subtitleFadeIn 1s ease-out 0.5s forwards;
          opacity: 0;
        }
        @keyframes subtitleFadeIn {
          0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>

      {/* ===== NAVIGATION ===== */}
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0A0A0A]
        ${scrollY > 50 ? 'border-b border-white/5' : ''}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-0.5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/Coder1-Logo-Sharp.svg" alt="Coder1" width={200} height={56} className="h-[4.2rem] w-auto" />
            </Link>

            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <a href="#system" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">The System</a>
              <a href="#agent-hub" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Agent Hub</a>
              <a href="#teams" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Teams</a>
              <a href="#pricing" className="text-white/60 hover:text-white transition-colors text-sm font-medium tracking-wide">Pricing</a>
            </div>

            <div className="hidden md:flex items-center">
              <a href="#alpha" className="px-5 py-2 bg-coder1-cyan rounded-full text-sm font-semibold text-black hover:shadow-lg hover:shadow-coder1-cyan/30 transition-all">
                Join Alpha
              </a>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white p-2">
              <div className="w-6 h-0.5 bg-white mb-1.5" />
              <div className="w-6 h-0.5 bg-white mb-1.5" />
              <div className="w-6 h-0.5 bg-white" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A0A0A] border-t border-white/10 px-6 py-4">
            <div className="flex flex-col gap-4">
              <a href="#system" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white transition-colors text-base font-medium">The System</a>
              <a href="#agent-hub" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white transition-colors text-base font-medium">Agent Hub</a>
              <a href="#teams" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white transition-colors text-base font-medium">Teams</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white transition-colors text-base font-medium">Pricing</a>
              <a href="#alpha" onClick={() => setMobileMenuOpen(false)} className="mt-2 px-5 py-3 bg-coder1-cyan rounded-full text-base font-semibold text-black text-center hover:shadow-lg hover:shadow-coder1-cyan/30 transition-all">
                Join Alpha
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #362A45 1.5px, transparent 1.5px)',
              backgroundSize: '15px 15px',
            }}
          />
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
              Beyond Claude Code Desktop, Terminal & Co-Work
            </span>
          </div>

          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/Coder1-Logo-Sharp.svg"
              alt="Coder1 IDE"
              width={520}
              height={166}
              className="h-28 md:h-36 w-auto animate-[flyIn_0.8s_ease-out_0.3s_forwards]"
              style={{ opacity: 0 }}
              priority
            />
          </div>

          {/* Hero headline */}
          <h1 className="mb-6 subtitle-fade-in">
            <span style={{ display: 'block' }} className="text-4xl md:text-5xl lg:text-6xl text-white/80 font-semibold">
              Claude Code gives you a <span className="text-coder1-cyan">tool.</span>
            </span>
            <span style={{ display: 'block' }} className="text-4xl md:text-5xl lg:text-6xl text-white/80 font-semibold mt-1">
              Coder1 gives you a <span className="text-coder1-purple">system.</span>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Scheduled agents. Persistent memory. Approval gates.<br />
            A team that compounds over time.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a
              href="#alpha"
              className="px-8 py-4 bg-coder1-cyan rounded-full text-lg font-semibold text-black hover:shadow-xl hover:shadow-coder1-cyan/30 transition-all transform hover:scale-105"
            >
              Join the Alpha
            </a>
            <a
              href="#demo-video"
              className="px-8 py-4 border-2 border-coder1-cyan/50 rounded-full text-lg font-semibold text-coder1-cyan hover:bg-coder1-cyan/10 transition-all"
            >
              Watch Demo
            </a>
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-coder1-cyan mb-1">
                0
              </div>
              <p className="text-white/40 text-sm">Code leaves your machine</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-coder1-purple mb-1">
                24/7
              </div>
              <p className="text-white/40 text-sm">Scheduled agent work</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-1">
                100%
              </div>
              <p className="text-white/40 text-sm">Approval-gated commits</p>
            </div>
          </div>

          {/* Audience line */}
          <p className="text-base text-white/50 text-center mt-10">
            For{' '}
            <span className="text-coder1-cyan font-medium">Claude Code users</span>{' '}
            who want a system that gets smarter every session.
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/30" />
        </div>
      </section>

      {/* ===== THE DIFFERENCE SECTION ===== */}
      <section className="py-24 bg-[#080808]" id="system">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <Layers className="w-5 h-5 text-coder1-cyan" />
                <span className="text-coder1-cyan text-base font-medium">Tool vs System</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                What Makes a System<br />Different From a Tool
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Claude Code Desktop, Terminal, and Co-Work are excellent tools — present-required, session-scoped, stateless.
                Coder1 is the layer that makes them compound.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Tool column */}
            <ScrollReveal>
              <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white/60">Claude Code</h3>
                    <span className="text-xs text-white/30">Desktop / Terminal / Co-Work</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    'Requires you to be present',
                    'Context resets each session',
                    'One agent at a time',
                    'You review in the moment',
                    'Each session starts from scratch',
                    'Your code goes to the cloud',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-white/40 text-sm">
                      <X className="w-4 h-4 text-white/20 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            {/* System column */}
            <ScrollReveal delay={100}>
              <div className="p-8 bg-gradient-to-br from-coder1-cyan/10 to-coder1-purple/10 border border-coder1-cyan/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-coder1-cyan/20 flex items-center justify-center">
                    <Workflow className="w-5 h-5 text-coder1-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Coder1</h3>
                    <span className="text-xs text-coder1-cyan">The compounding layer</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    'Agents work while you sleep',
                    'Memory persists and compounds',
                    'Fleet of agents with defined roles',
                    'Approve diffs before anything merges',
                    'Every session adds to your knowledge graph',
                    'Your code never leaves your machine',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-white/80 text-sm">
                      <Check className="w-4 h-4 text-coder1-cyan flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <div className="text-center p-8 bg-gradient-to-r from-coder1-purple/10 to-coder1-cyan/10 border border-coder1-purple/20 rounded-2xl">
              <p className="text-2xl font-semibold text-white">
                Every session you do in Coder1 makes the next one faster.
              </p>
              <p className="text-white/50 mt-2">That&apos;s the difference between a tool and a system.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== IDE FEATURES SECTION ===== */}
      <section className="py-24" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                A Complete IDE, Plus the System Layer
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Everything Claude Code users need, with the infrastructure to compound
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
            {[
              { icon: Code, name: 'Monaco Editor', desc: 'Syntax highlighting, IntelliSense' },
              { icon: Terminal, name: 'Integrated Terminal', desc: 'Full terminal access' },
              { icon: Eye, name: 'Live Preview', desc: 'See changes instantly' },
              { icon: History, name: 'Session Management', desc: 'Never lose context' },
              { icon: Link2, name: 'Claude Code Native', desc: 'Direct CLI integration' }
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
                But this is just the foundation...
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== DEMO VIDEO SECTION ===== */}
      <section className="py-24 relative overflow-hidden" id="demo-video">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <span className="text-coder1-cyan text-lg font-medium">See It In Action</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Demo</h2>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="relative flex flex-col items-center">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 50% at 50% 45%, rgba(0, 217, 255, 0.18) 0%, rgba(0, 217, 255, 0.06) 50%, transparent 100%)',
                }}
              />
              <div
                className="relative w-full rounded-2xl overflow-hidden border-4 border-white/10"
                style={{
                  background: '#111',
                  boxShadow: '0 0 60px 20px rgba(0, 217, 255, 0.2), 0 0 120px 40px rgba(0, 217, 255, 0.08), 0 30px 80px rgba(0,0,0,0.7)',
                }}
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <div className="flex-1 ml-4 bg-white/5 rounded-md px-4 py-1 text-white/30 text-xs font-mono">
                    coder1.ai/ide
                  </div>
                </div>
                <div className="relative w-full" style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    suppressHydrationWarning
                  >
                    <source src="/videos/alpha-demo-web-optimized.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
              <div className="w-24 h-4 bg-[#1a1a1a] rounded-b-lg border-x border-b border-white/10" />
              <div className="w-48 h-2 bg-[#111] rounded-full border border-white/10" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== AGENT HUB SECTION ===== */}
      <section className="py-24 bg-[#080808]" id="agent-hub">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-purple/10 border border-coder1-purple/20 rounded-full mb-6">
                <Bot className="w-5 h-5 text-coder1-purple" />
                <span className="text-coder1-cyan text-base font-medium">Not available in Claude Code Desktop, Terminal, or Co-Work</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Meet <span className="text-shimmer">Agent Hub</span>
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                A fleet of specialized agents, each with defined roles, budgets, and memory — working with your approval, not past it.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div>
              <div className="grid md:grid-cols-1 gap-5">
                {[
                  {
                    icon: Workflow,
                    title: 'Multi-Agent Fleet',
                    desc: 'Create agents with distinct roles (Frontend, Backend, QA) — each running Haiku, Sonnet, or Opus. Every agent works in its own git worktree so nothing interferes.'
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Approval-Gated Autonomy',
                    desc: 'Agents propose changes, you review diffs before anything merges. Full worktree isolation means safe rollback at any point. You stay in control.'
                  },
                  {
                    icon: Clock,
                    title: 'Scheduled Autonomous Work',
                    desc: 'Queue tasks before bed. Agents run on cron schedules and execute overnight. Wake up to completed work, morning briefings, and pending approvals.'
                  },
                  {
                    icon: GraduationCap,
                    title: 'Teaching → Skills',
                    desc: 'Train an agent interactively on your patterns. Convert the session into a reusable skill. Your agents get smarter the more you use them.'
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

            <ScrollReveal delay={200}>
              <AgentHubDemo />
            </ScrollReveal>
          </div>

          {/* Full width transparency card */}
          <ScrollReveal>
            <div className="p-8 bg-gradient-to-br from-coder1-cyan/10 to-coder1-purple/10 border border-coder1-cyan/20 rounded-2xl">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-xl bg-coder1-cyan/20 flex items-center justify-center flex-shrink-0">
                  <PlayCircle className="w-8 h-8 text-coder1-cyan" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Full Transparency</h3>
                  <p className="text-white/50 text-lg leading-relaxed">
                    Real-time WebSocket-driven live output from every agent. Every decision logged.
                    Full session replay available. Cost tracking per agent, per run.
                    No black boxes — you see exactly what your agents are doing and why.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== PERSISTENT MEMORY SECTION ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-coder1-cyan/10 border border-coder1-cyan/20 rounded-full mb-6">
                <Database className="w-5 h-5 text-coder1-cyan" />
                <span className="text-coder1-cyan text-base font-medium">Not available anywhere else</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Memory That Compounds
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Every session adds to a searchable knowledge base. Agents remember your architecture decisions,
                your patterns, your constraints — forever. The longer you use Coder1, the smarter it gets.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-5">
              {[
                {
                  icon: Brain,
                  title: 'Per-Agent Memory',
                  desc: 'Each agent maintains its own FTS5-indexed memory with importance scoring. Automatically extracted from every run.'
                },
                {
                  icon: GitBranch,
                  title: 'Time Capsules',
                  desc: 'Commit-level AI context snapshots tied to git SHA. Every merge is annotated with what the agent knew and decided.'
                },
                {
                  icon: FileText,
                  title: 'Session Handoff Documents',
                  desc: 'Auto-generated with context window awareness. Zero context loss between sessions, even across team members.'
                },
                {
                  icon: Database,
                  title: 'Vault / Knowledge Graph',
                  desc: 'Growing project intelligence with semantic search and code graphs. The system gets smarter the more your team ships.'
                }
              ].map((item, idx) => (
                <ScrollReveal key={idx} delay={idx * 100}>
                  <div className="flex gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-coder1-cyan/20 transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-coder1-purple/10 flex items-center justify-center flex-shrink-0 group-hover:bg-coder1-purple/20 transition-all">
                      <item.icon className="w-6 h-6 text-coder1-purple" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                      <p className="text-white/50 text-sm">{item.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={150}>
              <MemoryDemo />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ===== LOCAL ARCHITECTURE SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-orange-400/10 border border-orange-400/20 rounded-full mb-6">
                <HardDrive className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 text-base font-medium">Your code. Your machine. Your control.</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Local-First Architecture
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Coder1 runs entirely on your machine. A lightweight bridge connects your local instance to the IDE interface.
                Your code never touches our servers. This isn&apos;t a setting — it&apos;s the architecture.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Lock,
                title: 'Code Sovereignty',
                desc: 'Your source code stays on your machine. The bridge transmits terminal output and file contents only within your local browser session.',
                color: 'text-orange-400',
                bg: 'bg-orange-400/10'
              },
              {
                icon: Shield,
                title: 'Enterprise Ready',
                desc: 'Regulated industries, proprietary codebases, defense contractors — if your code can\'t leave your network, Coder1 is the only AI IDE that works.',
                color: 'text-coder1-cyan',
                bg: 'bg-coder1-cyan/10'
              },
              {
                icon: Cpu,
                title: 'Your Own API Keys',
                desc: 'AI processing goes directly from your browser to Anthropic. We never see your API traffic. You control costs and maintain full privacy.',
                color: 'text-coder1-purple',
                bg: 'bg-coder1-purple/10'
              }
            ].map((item, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                  <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                    <item.icon className={`w-7 h-7 ${item.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-white/50">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Architecture diagram */}
          <ScrollReveal>
            <div className="p-8 bg-[#0D0D0D] border border-white/10 rounded-2xl font-mono text-sm">
              <div className="text-coder1-cyan mb-4 text-base">How the bridge works:</div>
              <div className="space-y-3 text-white/60">
                <div className="flex items-center gap-4">
                  <span className="text-white/30 w-6">1.</span>
                  <span>You install the <span className="text-coder1-cyan">coder1-bridge</span> CLI locally (lightweight, &lt;5MB)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/30 w-6">2.</span>
                  <span>Bridge creates a secure WSS tunnel: <span className="text-coder1-purple">localhost ↔ your browser session</span></span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/30 w-6">3.</span>
                  <span>All file access, terminal commands, and Claude Code execution happen <span className="text-orange-400">on your machine</span></span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/30 w-6">4.</span>
                  <span>Only terminal output and approved diffs are transmitted — <span className="text-emerald-400">your source code never leaves</span></span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== TEAMS SECTION ===== */}
      <section className="py-24 bg-[#060606]" id="teams">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-block px-3 py-1 rounded-full bg-coder1-purple/10 border border-coder1-purple/30 text-coder1-purple text-xs font-semibold uppercase tracking-widest mb-4">
                For Teams
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                The only IDE where your whole team<br />
                <span className="text-coder1-cyan">shares agents, memory, and context in real time</span>
              </h2>
              <p className="text-white/50 text-base max-w-xl mx-auto">
                Building with a co-founder or team? Coder1 Teams connects everyone to shared agents, shared memory, and a shared approval queue — no more re-explaining context to every team member.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0D0D0D]">
                    <th className="text-left py-4 px-5 text-white/40 font-medium">Feature</th>
                    <th className="py-4 px-5 text-center font-semibold text-coder1-cyan bg-coder1-cyan/5 border-x border-coder1-cyan/20">Coder1 Teams</th>
                    <th className="py-4 px-5 text-center text-white/40 font-medium">Claude Co-Work</th>
                    <th className="py-4 px-5 text-center text-white/40 font-medium">Cursor</th>
                    <th className="py-4 px-5 text-center text-white/40 font-medium">GitHub Copilot</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Shared Team AI Memory', true, false, false, false],
                    ['Shared Agent Fleet', true, false, false, false],
                    ['Shared Approval Queue', true, false, false, false],
                    ['Persistent Memory Across Sessions', true, false, false, false],
                    ['Scheduled Overnight Work', true, false, false, false],
                    ['Local Architecture (code stays on-prem)', true, false, false, false],
                  ].map(([feature, coder1, cowork, cursor, copilot], idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-5 text-white/60">{feature as string}</td>
                      <td className="py-3 px-5 text-center bg-coder1-cyan/5 border-x border-coder1-cyan/10">
                        {coder1 ? <Check className="w-4 h-4 text-coder1-cyan mx-auto" /> : <X className="w-4 h-4 text-white/20 mx-auto" />}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {cowork ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-white/20 mx-auto" />}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {cursor ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-white/20 mx-auto" />}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {copilot ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-white/20 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#0D0D0D]">
                    <td className="py-3 px-5 text-white/40 font-medium">Price</td>
                    <td className="py-3 px-5 text-center bg-coder1-cyan/5 border-x border-coder1-cyan/10 text-coder1-cyan font-semibold">$24/user/mo</td>
                    <td className="py-3 px-5 text-center text-white/40">Included w/ Claude</td>
                    <td className="py-3 px-5 text-center text-white/40">$20/user/mo</td>
                    <td className="py-3 px-5 text-center text-white/40">$10/user/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-center mt-8">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-coder1-purple/10 border border-coder1-purple/30 rounded-full text-coder1-purple text-sm font-semibold hover:bg-coder1-purple/20 transition-all"
              >
                See Team Pricing <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FULL COMPARISON SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Coder1 vs Claude Code Environments
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Claude Code now has three environments — Desktop, Terminal, and Co-Work. None of them are a system. Coder1 is the layer that compounds.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="overflow-x-auto">
              <table className="w-full bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                <thead>
                  <tr className="bg-white/[0.05]">
                    <th className="py-4 px-4 text-left font-semibold">Capability</th>
                    <th className="py-4 px-4 text-center font-semibold bg-coder1-cyan/10 text-coder1-cyan">Coder1</th>
                    <th className="py-4 px-4 text-center font-semibold text-white/60">Claude Desktop</th>
                    <th className="py-4 px-4 text-center font-semibold text-white/60">Claude Terminal</th>
                    <th className="py-4 px-4 text-center font-semibold text-white/60">Claude Co-Work</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow feature="Full IDE (Monaco + Terminal)" coder1="yes" desktop="yes" terminal="no" cowork="partial" />
                  <ComparisonRow feature="Agent Hub (multi-agent fleet)" coder1="yes" desktop="no" terminal="no" cowork="no" tooltip="Scheduled, approval-gated, role-scoped agents" />
                  <ComparisonRow feature="Scheduled Autonomous Work" coder1="yes" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Approval-Gated Commits" coder1="yes" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Persistent Cross-Session Memory" coder1="infinity" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Time Capsules (git-tied context)" coder1="yes" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Teaching → Skills Workflow" coder1="yes" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Team Shared Memory + Agents" coder1="yes" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Local Architecture (code stays on-prem)" coder1="yes" desktop="no" terminal="yes" cowork="no" />
                  <ComparisonRow feature="Vault / Knowledge Graph" coder1="yes" desktop="no" terminal="no" cowork="no" />
                  <ComparisonRow feature="Free Forever Plan" coder1="yes" desktop="partial" terminal="partial" cowork="partial" />
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FOUNDER STORY SECTION ===== */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div
              className="p-8 md:p-12 rounded-2xl border border-white/10 bg-[#0D0D0D]"
              style={{ boxShadow: '0 0 60px rgba(0, 217, 255, 0.06)' }}
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="flex-shrink-0">
                  <div
                    className="w-32 h-32 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center"
                    style={{ boxShadow: '0 0 0 2px rgba(0,217,255,0.35), 0 0 24px rgba(0,217,255,0.15)' }}
                  >
                    <Image
                      src="/mike-founder.png"
                      alt="Mike, Founder of Coder1"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-xs text-coder1-cyan font-semibold uppercase tracking-widest mb-4">
                    Built For Claude Code Users Who Want More
                  </p>
                  <blockquote className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-4">
                    &ldquo;I&apos;m not a traditional developer. I left my corporate job, went into debt, and taught myself
                    to build using Claude. I kept running into the same wall — powerful tool, no system.
                    I built Coder1 because I needed a system that compounded, not just a tool that reset.&rdquo;
                  </blockquote>
                  <p className="text-white/50 text-sm">
                    &mdash; Mike, Founder of Coder1
                  </p>
                </div>
              </div>
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
            <PricingCard
              tier="Free Forever"
              price="$0"
              period="per month"
              features={[
                'Full IDE (Monaco + Terminal)',
                '50 Agent Hub messages',
                '1-click MCPs',
                'Basic session history',
                'Local bridge architecture',
                'Community support',
              ]}
              cta="Get Started"
              subtext="No credit card required"
              onClick={() => document.getElementById('alpha')?.scrollIntoView({ behavior: 'smooth' })}
            />

            <PricingCard
              tier="Pro"
              price="$19"
              period="per month"
              features={[
                'Everything in Free',
                'Unlimited Agent Hub messages',
                'Persistent Memory + Vault',
                'Scheduled autonomous work',
                'Approval-gated commits',
                'Time Capsules',
                'Teaching → Skills workflow',
                'Full session replay',
                'Priority support',
              ]}
              cta="Start Pro Trial"
              featured
              badge="Most Popular"
              onClick={handleProCheckout}
              loading={checkoutLoading}
            />

            <PricingCard
              tier="Team"
              price="$24"
              period="per user/month"
              features={[
                'Everything in Pro',
                'Shared team agent fleet',
                'Shared memory & context',
                'Team approval queue',
                'Admin dashboard',
                'SSO/SAML',
                'Dedicated support',
              ]}
              cta="Contact Sales"
              subtext="3 users minimum."
              onClick={() => window.location.href = 'mailto:alpha@coder1.ai?subject=Coder1 Team Plan Inquiry'}
            />
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
                Everything you need to know about Coder1
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            <FAQItem
              question="How is Coder1 different from Claude Code Desktop or Co-Work?"
              answer="Claude Code Desktop, Terminal, and Co-Work are excellent tools for present, real-time coding. Coder1 adds the system layer on top: Agent Hub for multi-agent fleets with scheduled autonomous work, persistent cross-session memory that compounds over time, approval-gated commits, team shared context, and a local architecture where your code never leaves your machine. None of those capabilities exist in any of Claude Code's native environments."
            />

            <FAQItem
              question="What is Agent Hub?"
              answer="Agent Hub is Coder1's multi-agent orchestration system. You create agents with distinct roles (Frontend, Backend, QA), choose the model for each (Haiku/Sonnet/Opus), set budgets, and assign tasks. Each agent runs in its own git worktree so work is isolated. Agents run scheduled tasks autonomously — including overnight — and all proposed changes require your approval before anything merges. You stay in control while agents do the work."
            />

            <FAQItem
              question="Is my code secure? Does Coder1 see my source code?"
              answer="No. Coder1 runs a local bridge CLI on your machine. Your source code never leaves your local environment — we don't store it, we don't see it. The bridge transmits terminal output and file contents only within your own browser session. All AI processing goes directly from your browser to Anthropic's servers using your own API keys."
            />

            <FAQItem
              question="What is Persistent Memory and how does it compound?"
              answer="Every Coder1 session automatically extracts important context — architecture decisions, patterns you prefer, constraints, past mistakes — and indexes them in a per-agent FTS5 database with importance scoring. When you start a new session, this context is available immediately. The longer you use Coder1, the more context is available. After a year of daily use, your agents understand your codebase better than any new hire."
            />

            <FAQItem
              question="Do I need to already be using Claude Code?"
              answer="Yes — Coder1 is built specifically for Claude Code users. It wraps and extends the Claude Code CLI with IDE features, persistent memory, and Agent Hub. If you're just getting started with Claude Code, Coder1 is a great way to get going — you get the full IDE experience from day one instead of working in the raw terminal."
            />

            <FAQItem
              question="What is the local bridge and do I need to install anything?"
              answer="To connect Coder1 to your local codebase, you install the lightweight bridge CLI (under 5MB). It creates a secure WebSocket tunnel between the web IDE and your machine, letting you run terminal commands, access files, and execute Claude Code locally while using the full IDE interface. Your code never leaves your machine."
            />

            <FAQItem
              question="What are Time Capsules?"
              answer="Time Capsules are commit-level AI context snapshots tied to git SHA. Every time an agent merges work, a Time Capsule captures what it knew, what it decided, and why. Future agents can query this history. It's like git blame, but for AI reasoning — you can trace any decision back to the context that produced it."
            />

            <FAQItem
              question="What's included in the free plan?"
              answer="The free plan includes the full IDE experience (Monaco editor, integrated terminal, live preview, session management), 50 Agent Hub messages per month, 1-click MCP integrations, and the local bridge architecture. You can use it indefinitely — we believe in letting you experience the product before committing."
            />

            <FAQItem
              question="How do I get started with the alpha?"
              answer="Sign up below with your email. We're onboarding alpha users in batches to ensure quality support. Once accepted, you'll get access to the full IDE, Agent Hub, documentation, and our Discord community where the team is actively helping users and gathering feedback."
            />
          </div>
        </div>
      </section>

      {/* ===== ALPHA CTA SECTION ===== */}
      <section className="relative pt-0 pb-24 overflow-visible" id="alpha">
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
        <div
          className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 0%, transparent 0%, transparent 40%, #0A0A0A 85%)'
          }}
        />

        <div className="relative z-10 max-w-xl mx-auto px-6 text-center pt-40">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-full mb-6">
              <div className="w-2 h-2 bg-amber-400/70 rounded-full animate-pulse" />
              <span className="text-amber-300/80 text-sm font-semibold">Only 47 Alpha spots remaining</span>
            </div>

            <h2 className="font-bold mb-4 tracking-tight text-center">
              <span className="block text-3xl sm:text-4xl md:text-5xl">Stop Using a Tool.</span>
              <span className="block text-2xl sm:text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-coder1-cyan to-coder1-purple">
                Start Building a System.
              </span>
            </h2>
            <p className="text-lg text-white/50 mb-10">
              Alpha access is limited. Get in for free and shape the future.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <input
                type="text"
                name="fullName"
                id="alpha-fullname"
                aria-label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-coder1-cyan/50 transition-colors"
              />
              <input
                type="email"
                name="email"
                id="alpha-email"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-coder1-cyan/50 transition-colors"
              />
              {formError && (
                <div className="p-3 rounded-lg text-sm text-center" style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                }}>
                  {formError}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-coder1-purple to-coder1-cyan rounded-xl text-lg font-semibold hover:shadow-xl hover:shadow-coder1-cyan/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Joining...' : 'Request Alpha Access'}
              </button>
            </form>

            <div className="text-center mb-8">
              <Link
                href="/login?redirect=/ide"
                className="text-white/50 hover:text-coder1-cyan transition-colors text-sm inline-flex items-center gap-2"
              >
                Already have access? <span className="text-coder1-cyan">Go to IDE →</span>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <CreditCard className="w-4 h-4 text-coder1-cyan" />
                <span className="text-white/80 text-sm font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <ShieldCheck className="w-4 h-4 text-coder1-cyan" />
                <span className="text-white/80 text-sm font-medium">Code stays on your machine</span>
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
                <a href="#agent-hub" className="block text-white/50 hover:text-white transition-colors text-sm">Agent Hub</a>
                <a href="#teams" className="block text-white/50 hover:text-white transition-colors text-sm">Teams</a>
              </div>
            </div>
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Resources</h4>
              <div className="space-y-3">
                <a href="/documentation" className="block text-white/50 hover:text-white transition-colors text-sm">Documentation</a>
              </div>
            </div>
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Company</h4>
              <div className="space-y-3">
                <a href="mailto:alpha@coder1.ai" className="block text-white/50 hover:text-white transition-colors text-sm">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-coder1-cyan font-semibold mb-4">Connect</h4>
              <div className="flex gap-3">
                <a
                  href="https://github.com/coder1-ide"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Coder1 on GitHub"
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://discord.gg/coder1"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Coder1 Discord community"
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/coder1ide"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Coder1 on Twitter"
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
