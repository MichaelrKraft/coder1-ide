'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cloud, Users } from 'lucide-react';
import { Navigation } from '@/components/landing/Navigation';
import { Footer } from '@/components/landing/Footer';
import { features } from '@/lib/feature-flags';

// Team Hero Section
function TeamHeroSection() {
  const [demoStep, setDemoStep] = useState(0);

  const demoMessages = [
    { side: 'user1', text: 'Working on auth module', user: 'mike', time: '2:15 PM' },
    { side: 'system', text: 'testuser joined the session' },
    { side: 'user2', text: "I see you're in AuthProvider.tsx - I'll handle the form", user: 'testuser', time: '2:16 PM' },
    { side: 'system', text: '✅ Zero merge conflicts, 3 hours saved' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep(prev => (prev + 1) % (demoMessages.length + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-gradient-to-b from-black via-gray-900/50 to-black">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full mb-8 animate-float">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white font-medium">Introducing Team Mode - Multiplayer by Default</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
          Your Team&apos;s Collective Intelligence,<br />Now in Your IDE
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
          Real-time collaboration + persistent team knowledge. Stop merge conflicts, onboard in hours, never lose context.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/ide"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-lg rounded-full hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1"
          >
            Start Your Team Free
          </Link>
          <a
            href="#demo"
            className="px-8 py-4 border border-white/20 text-white font-semibold text-lg rounded-full hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            Watch Collaboration Demo
          </a>
        </div>

        {/* Demo Visual */}
        <div id="demo" className="max-w-4xl mx-auto">
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
            {/* Demo Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-gray-400 text-sm ml-2">Coder1 Team - Real-time Collaboration</span>
              <div className="ml-auto flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-400 text-sm">2 active</span>
              </div>
            </div>

            {/* Demo Chat */}
            <div className="p-6 min-h-[300px] space-y-4">
              {demoMessages.slice(0, demoStep).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.side === 'user1' || msg.side === 'user2' ? 'justify-start' : 'justify-center'} animate-slideIn`}
                >
                  <div className={`max-w-[80%] ${
                    msg.side === 'system'
                      ? 'px-4 py-2 bg-purple-500/20 text-purple-200 border border-purple-500/30 rounded-full text-center text-sm'
                      : 'px-4 py-3 rounded-2xl bg-gray-700/50 text-gray-100 border border-gray-600/30'
                  }`}>
                    {(msg.side === 'user1' || msg.side === 'user2') && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400 font-semibold">
                          {msg.user?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs text-cyan-400 font-semibold">@{msg.user}</span>
                        <span className="text-xs text-gray-500 ml-auto">{msg.time}</span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
              {demoStep === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <span className="animate-pulse">Demo starting...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Team Trust Indicators
function TeamTrustSection() {
  const stats = [
    { value: '3hrs', label: 'Saved Per Day Per Dev' },
    { value: '0', label: 'Merge Conflicts' },
    { value: '24/7', label: 'Team Knowledge Access' },
    { value: '10x', label: 'Faster Onboarding' },
  ];

  return (
    <section className="py-16 bg-gray-900/50 border-y border-gray-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Pain Points
function TeamPainPointsSection() {
  const painPoints = [
    {
      icon: '🔄',
      title: 'Merge Conflict Hell',
      description: 'Two devs work on same file for 3 hours. Discover conflicts. Waste 4 hours resolving.',
    },
    {
      icon: '🌍',
      title: 'Context Lost Daily',
      description: 'Senior dev figured out pattern. Junior faces same issue but senior is on vacation.',
    },
    {
      icon: '⏳',
      title: 'Async Tax Killing Velocity',
      description: '24-hour delays for simple questions. Distributed teams move at half speed.',
    },
  ];

  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            The Problem with Solo AI Tools
          </h2>
          <p className="text-xl text-gray-400">
            Your team deserves better than individual AI assistants
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, i) => (
            <div
              key={i}
              className="p-8 bg-gray-900/50 border border-gray-800/50 rounded-2xl hover:border-red-500/30 transition-all group"
            >
              <div className="text-5xl mb-6">{point.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-red-400 transition-colors">
                {point.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Features Section (8 use cases)
function TeamFeaturesSection() {
  const features = [
    {
      title: 'Onboarding in Hours, Not Weeks',
      problem: 'New dev spends 2 weeks asking "why did we choose this?"',
      solution: 'Johnny5 has learned from your entire team. New dev asks: "How does auth work?" Instant answer: "Using JWT with httpOnly cookies per mike\'s implementation"',
      benefit: 'New devs ship their first feature in 2 hours instead of 2 weeks',
      icon: '🚀',
      stat: '10x faster onboarding',
    },
    {
      title: 'Stop Merge Conflicts Before They Happen',
      problem: '3 hours into work, discover incompatible changes',
      solution: 'Real-time collaborative editing with live cursor visibility. See exactly where testuser is typing in AuthProvider.tsx',
      benefit: 'Coordinate in real-time: "I\'ll handle auth context, you build the form"',
      icon: '👁️',
      stat: 'Zero merge conflicts',
    },
    {
      title: 'Team\'s Collective Intelligence Always Available',
      problem: 'Senior dev figured out WebSocket pattern 3 months ago. Junior dev faces same issue but senior is on vacation',
      solution: 'Team Knowledge Sync captures: "WebSocket reconnection: Use exponential backoff, max 5 retries (contributed by @mike, confirmed by 3 teammates)"',
      benefit: 'Team knowledge persists and compounds, even when people are unavailable',
      icon: '🧠',
      stat: '50+ facts synced',
    },
    {
      title: 'Distributed Team Feels Like In-Person Pairing',
      problem: 'Team across 3 timezones. Async communication = 24-hour delays. Momentum dies.',
      solution: 'See who\'s online now (green presence indicators). Recent Activity: "@testuser pushed to auth-flow 5m ago". Real-time co-editing when schedules overlap. Team knowledge 24/7 when they don\'t.',
      benefit: 'Async teams move at sync-team speed',
      icon: '🌍',
      stat: 'Tokyo, London, SF - 1 codebase',
    },
    {
      title: 'Code Reviews That Actually Teach',
      problem: 'Senior reviews junior\'s PR. Leaves comments: "Don\'t do this." Junior learns what\'s wrong, not why.',
      solution: 'Johnny5 learns from every code review. Next time junior faces similar situation: "Based on team patterns, use useAuth hook here (per mike\'s review on PR #124)"',
      benefit: 'Juniors level up 3x faster, seniors review less',
      icon: '📚',
      stat: '3x faster leveling',
    },
    {
      title: 'Never Lose Context Switching Between Projects',
      problem: 'Work on Project A all week. Switch to Project B Monday. Spend 2 hours remembering context.',
      solution: 'Team Knowledge per repository. Johnny5 instantly recalls: "Project B uses PostgreSQL (not MongoDB), deploys to Vercel, auth via Clerk"',
      benefit: 'Zero context-switching tax across 5+ projects',
      icon: '🔀',
      stat: '5 projects, 0 context loss',
    },
    {
      title: 'Debugging with Team\'s Collective Memory',
      problem: 'Weird bug in production. "I swear we fixed this before..." Spend 3 hours re-discovering solution from 6 months ago.',
      solution: 'Team Knowledge: "CORS issue with Stripe webhooks: Add endpoint to CORS whitelist AND set raw body parser (fixed by @mike, June 2024, 10x confirmed)"',
      benefit: 'Solved in 5 minutes instead of 3 hours',
      icon: '🐛',
      stat: '5min vs 3hr',
    },
    {
      title: 'Consistent Architecture Across Features',
      problem: 'Each developer implements similar features differently. Codebase becomes inconsistent.',
      solution: 'Team Knowledge: "API calls: Use custom useFetch hook with error boundaries (team standard)". Johnny5 enforces: "I notice you\'re using axios directly. Team uses useFetch hook"',
      benefit: 'Consistent codebase without micromanaging',
      icon: '🏗️',
      stat: '1 pattern, enforced',
    },
  ];

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-black to-gray-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6">
            <span className="text-purple-400 font-semibold">Team Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Multiplayer by Default
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Coder1 is the only IDE where team collaboration isn&apos;t bolted on - it&apos;s the core architecture
          </p>
        </div>

        <div className="space-y-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center p-8 bg-gray-900/30 border border-gray-800/50 rounded-2xl hover:border-cyan-500/30 transition-all`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{feature.icon}</span>
                  <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-red-500/10 border-l-4 border-red-500 rounded-r-lg">
                    <div className="text-xs text-red-400 font-semibold uppercase mb-1">The Problem</div>
                    <div className="text-gray-300">{feature.problem}</div>
                  </div>

                  <div className="p-3 bg-green-500/10 border-l-4 border-green-500 rounded-r-lg">
                    <div className="text-xs text-green-400 font-semibold uppercase mb-1">Coder1 Solution</div>
                    <div className="text-gray-300">{feature.solution}</div>
                  </div>

                  <div className="p-3 bg-cyan-500/10 border-l-4 border-cyan-500 rounded-r-lg">
                    <div className="text-xs text-cyan-400 font-semibold uppercase mb-1">Your Benefit</div>
                    <div className="text-gray-300">{feature.benefit}</div>
                  </div>
                </div>

                {feature.stat && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                    <span className="text-cyan-400 font-semibold text-sm">{feature.stat}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full">
                <div className="aspect-video bg-gray-800/50 border border-gray-700/50 rounded-xl flex items-center justify-center">
                  <span className="text-6xl opacity-50">{feature.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Collaboration Demo
function TeamCollaborationDemo() {
  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            See Team Collaboration in Action
          </h2>
          <p className="text-xl text-gray-400">
            Real-time presence, live editing, and persistent team knowledge
          </p>
        </div>

        {/* Mock Team Panel UI */}
        <div className="max-w-4xl mx-auto bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Coder1 Team</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-gray-400">Connected</span>
            </div>
          </div>

          {/* Members (3 online) */}
          <div className="mb-6">
            <h4 className="text-xs text-gray-400 uppercase mb-2">Members (3)</h4>
            <div className="space-y-2">
              {[
                { name: 'mike', role: 'owner', online: true },
                { name: 'testuser', role: 'member', online: true },
                { name: 'sarah', role: 'member', online: false },
              ].map((member, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative w-6 h-6">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400">
                      {member.name[0].toUpperCase()}
                    </div>
                    {member.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-900" />
                    )}
                  </div>
                  <span className="text-white text-sm">{member.name}</span>
                  {member.role !== 'member' && (
                    <span className="text-[10px] text-cyan-400/60 bg-cyan-500/10 px-1 rounded">{member.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="mb-6">
            <h4 className="text-xs text-gray-400 uppercase mb-2">Recent Activity</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span>📝</span>
                <span className="text-cyan-400">@testuser</span>
                <span className="text-gray-400">committed to auth-flow</span>
                <span className="ml-auto text-gray-500 whitespace-nowrap">5m ago</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>🚀</span>
                <span className="text-cyan-400">@mike</span>
                <span className="text-gray-400">pushed to remote</span>
                <span className="ml-auto text-gray-500 whitespace-nowrap">12m ago</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>🌿</span>
                <span className="text-cyan-400">@sarah</span>
                <span className="text-gray-400">switched to feature/payments</span>
                <span className="ml-auto text-gray-500 whitespace-nowrap">1h ago</span>
              </div>
            </div>
          </div>

          {/* Knowledge Base Preview */}
          <div>
            <h4 className="text-xs text-gray-400 uppercase mb-2">Team Knowledge (50)</h4>
            <div className="space-y-2">
              <div className="bg-gray-800/50 rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyan-400">@mike</span>
                  <span className="text-gray-400">3x confirmed</span>
                </div>
                <div className="text-gray-300">
                  <span className="font-medium">authentication-approach:</span> JWT tokens with httpOnly cookies
                </div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyan-400">@testuser</span>
                  <span className="text-gray-400">2x confirmed</span>
                </div>
                <div className="text-gray-300">
                  <span className="font-medium">websocket-pattern:</span> Exponential backoff, max 5 retries
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Comparison Table
function TeamComparisonSection() {
  const competitors = ['Coder1 Teams', 'Cursor', 'GitHub Copilot', 'VS Code Live Share'];
  const features = [
    { name: 'Real-time Co-editing', values: [true, false, false, true] },
    { name: 'Team Knowledge Sync', values: [true, false, false, false] },
    { name: 'Presence Awareness', values: [true, false, false, true] },
    { name: 'Learns from ALL Team Members', values: [true, false, false, false] },
    { name: 'Persistent Team Memory', values: [true, false, false, false] },
    { name: 'Merge Conflict Prevention', values: [true, false, false, false] },
  ];
  const prices = ['$15/user', '$20/user', '$10/user', 'Free'];

  return (
    <section id="comparison" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            How We Compare
          </h2>
          <p className="text-xl text-gray-400">
            See why teams are choosing Coder1
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left text-gray-400 font-semibold">Feature</th>
                {competitors.map((comp, i) => (
                  <th
                    key={i}
                    className={`p-4 text-center font-semibold ${
                      i === 0 ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400'
                    }`}
                  >
                    {comp}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr key={i} className="border-t border-gray-800/50">
                  <td className="p-4 text-gray-300">{feature.name}</td>
                  {feature.values.map((val, j) => (
                    <td
                      key={j}
                      className={`p-4 text-center ${j === 0 ? 'bg-cyan-500/5' : ''}`}
                    >
                      {val ? (
                        <span className="text-green-400 text-xl">✓</span>
                      ) : (
                        <span className="text-red-400 text-xl">✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-800/50">
                <td className="p-4 text-gray-300 font-semibold">Price</td>
                {prices.map((price, i) => (
                  <td
                    key={i}
                    className={`p-4 text-center font-bold ${
                      i === 0 ? 'bg-cyan-500/5 text-cyan-400' : 'text-gray-400'
                    }`}
                  >
                    {price}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Team Use Cases
function TeamUseCasesSection() {
  const useCases = [
    {
      icon: '👥',
      title: '2-5 Person Team',
      description: 'Real-time pairing without Zoom fatigue. See where teammates are typing. Stop merge conflicts before they happen.',
    },
    {
      icon: '🏢',
      title: '5-15 Person Team',
      description: 'Onboard juniors 10x faster. Team patterns become automatic. Seniors review less, juniors level up faster.',
    },
    {
      icon: '🌍',
      title: 'Distributed Team',
      description: 'Tokyo, London, San Francisco - one codebase, zero lag. Async speed with sync feeling.',
    },
  ];

  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Built for Every Team Size
          </h2>
          <p className="text-xl text-gray-400">
            Whether you&apos;re a small team or distributed enterprise
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, i) => (
            <div
              key={i}
              className="p-8 bg-gradient-to-b from-gray-900/80 to-gray-900/40 border border-gray-800/50 rounded-2xl hover:border-purple-500/30 transition-all group text-center"
            >
              <div className="text-6xl mb-6">{useCase.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                {useCase.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Pricing
function TeamPricingSection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Try team features',
      features: [
        'Up to 2 team members',
        'Basic collaborative editing',
        'Team knowledge sync',
        'Presence awareness',
        'Community support',
      ],
      minSeats: 1,
      cta: 'Get Started Free',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/user/month',
      description: 'For individuals and small teams',
      features: [
        'Up to 5 team members',
        'Everything in Free',
        'Advanced IDE features',
        'Priority support',
        'Session replay',
      ],
      featured: false,
      cta: 'Start Pro Trial',
    },
    {
      name: 'Team',
      price: '$24',
      period: '/user/month',
      description: 'Full team collaboration',
      features: [
        'Unlimited team members',
        'Everything in Pro',
        'Real-time multiplayer',
        'Team analytics',
        'Admin dashboard',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      featured: true,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-gray-900/50 to-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Team Pricing
          </h2>
          <p className="text-xl text-gray-400">
            Per-user pricing with no hidden fees
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative p-8 rounded-2xl transition-all ${
                plan.featured
                  ? 'bg-gradient-to-b from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 scale-105'
                  : 'bg-gray-900/50 border border-gray-800/50 hover:border-gray-700/50'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-black text-sm font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <p className="text-gray-400 mt-2">{plan.description}</p>
                {plan.minSeats && (
                  <p className="text-xs text-cyan-400 mt-1">Minimum {plan.minSeats} seats</p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-gray-300">
                    <span className="text-green-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/ide">
                <button
                  className={`w-full py-3 rounded-full font-semibold transition-all ${
                    plan.featured
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:shadow-lg hover:shadow-cyan-500/30'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team CTA
function TeamCTASection() {
  return (
    <section className="py-24 bg-black">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
          Ready to End<br />
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Merge Conflicts Forever?
          </span>
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Join teams who collaborate in real-time, not async hell
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/ide"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-lg rounded-full hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1"
          >
            Start Your Team Free
          </Link>
          <a
            href="mailto:hello@coder1.dev"
            className="px-8 py-4 border border-white/20 text-white font-semibold text-lg rounded-full hover:bg-white/5 transition-all"
          >
            Schedule Team Demo
          </a>
        </div>
      </div>
    </section>
  );
}

// Main Teams Landing Page
export default function TeamsPage() {
  // Hide team features for alpha - show Coming Soon page
  if (!features().teamFeatures) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Team Features Coming Soon</h1>
          <p className="text-gray-400 mb-8">Multiplayer collaboration is coming in our next release.</p>
          <Link href="/ide" className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-full hover:bg-cyan-400 transition-colors">
            Back to IDE
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navigation />
      <TeamHeroSection />
      <TeamTrustSection />
      <TeamPainPointsSection />
      <TeamFeaturesSection />
      <TeamCollaborationDemo />
      <TeamComparisonSection />
      <TeamUseCasesSection />
      <TeamPricingSection />
      <TeamCTASection />
      <Footer />

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </main>
  );
}
