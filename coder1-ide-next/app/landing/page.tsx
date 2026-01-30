'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Navigation Component
function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-sm border-b border-cyan-500/30' : 'bg-black border-b border-cyan-500/20'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/Coder1-Logo-Sharp.svg"
            alt="Coder1"
            width={180}
            height={60}
            className="h-14 w-auto"
          />
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Features</a>
          <a href="#johnny5" className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Johnny5</a>
          <a href="#pricing" className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Pricing</a>
          <a href="#comparison" className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Compare</a>
        </div>
        <Link
          href="/ide"
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold rounded-full hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
        >
          Try Coder1 Free
        </Link>
      </div>
    </nav>
  );
}

// Hero Section
function HeroSection() {
  const [demoStep, setDemoStep] = useState(0);

  const demoMessages = [
    { side: 'user', text: "Build a dashboard component with charts" },
    { side: 'johnny5', text: "I'll start working on this. You can go to sleep - I'll have it ready by morning." },
    { side: 'system', text: "Johnny5 is working... 8 hours later..." },
    { side: 'johnny5', text: "Good morning! I've completed the dashboard. Created 3 components, added Chart.js integration, and wrote 12 tests. All passing. PR #47 is ready for review." },
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
          <span className="text-white font-medium">Introducing Johnny5 - Your AI Employee</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
          Build Software<br />While You Sleep
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
          The first IDE with an autonomous AI that works overnight, remembers everything, and shows you exactly what it did
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/ide"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-lg rounded-full hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1"
          >
            Start Building Free
          </Link>
          <a
            href="#demo"
            className="px-8 py-4 border border-white/20 text-white font-semibold text-lg rounded-full hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            Watch Johnny5 Demo
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
              <span className="text-gray-400 text-sm ml-2">Johnny5 - Autonomous Mode</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm">Connected</span>
              </div>
            </div>

            {/* Demo Chat */}
            <div className="p-6 min-h-[300px] space-y-4">
              {demoMessages.slice(0, demoStep).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.side === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
                >
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.side === 'user'
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30'
                      : msg.side === 'system'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 text-center w-full'
                      : 'bg-gray-700/50 text-gray-100 border border-gray-600/30'
                  }`}>
                    {msg.side === 'johnny5' && (
                      <div className="flex items-center gap-2 mb-1 text-xs text-cyan-400">
                        <span className="font-semibold">Johnny5</span>
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

// Trust Indicators
function TrustSection() {
  const stats = [
    { value: '40+', label: 'Hours Saved Weekly' },
    { value: '24/7', label: 'Autonomous Building' },
    { value: '85/100', label: 'Security Score' },
    { value: '17x', label: 'Cheaper than Devin' },
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

// Pain Points Section
function PainPointsSection() {
  const painPoints = [
    {
      icon: '🧠',
      title: 'AI Tools Forget Everything',
      description: 'Every session starts from scratch. Context is lost. You repeat yourself endlessly.',
    },
    {
      icon: '😴',
      title: "You Can't Code 24/7",
      description: 'You need sleep. Your competitors might not. Hours lost every night.',
    },
    {
      icon: '🔒',
      title: 'AI is a Black Box',
      description: "You don't know what it did, why it made decisions, or if it's safe.",
    },
  ];

  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            The Problem with AI Coding Tools
          </h2>
          <p className="text-xl text-gray-400">
            Current AI assistants have fundamental limitations
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

// Johnny5 Features Section
function Johnny5FeaturesSection() {
  const features = [
    {
      title: 'Autonomous Overnight Building',
      problem: 'You sleep, work stops',
      solution: 'Johnny5 queues tasks and works through the night',
      benefit: 'Wake up to completed PRs',
      icon: '🌙',
    },
    {
      title: 'Session Intelligence & Replay',
      problem: "Don't know what AI did while you were away",
      solution: 'Full session replay with reasoning timeline',
      benefit: 'Total transparency into AI decisions',
      icon: '📺',
    },
    {
      title: 'Security Monitor',
      problem: 'AI might execute dangerous code',
      solution: 'Real-time prompt injection detection, audit logs, permission controls',
      benefit: '85/100 security score you can trust',
      icon: '🛡️',
    },
    {
      title: 'Morning Brief',
      problem: 'What happened overnight?',
      solution: 'AI-generated summary of all work completed',
      benefit: 'Start your day informed, not confused',
      icon: '☀️',
    },
    {
      title: 'Mission Control Dashboard',
      problem: 'Tasks scattered across tools',
      solution: 'Centralized task tracking with AI progress',
      benefit: 'One view of everything Johnny5 is working on',
      icon: '🎯',
    },
  ];

  return (
    <section id="johnny5" className="py-24 bg-gradient-to-b from-black to-gray-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6">
            <span className="text-purple-400 font-semibold">Meet Johnny5</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Your AI Employee That Never Sleeps
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Johnny5 is not just another AI assistant. It's an autonomous agent that works independently while you rest.
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
                    <div className="text-xs text-green-400 font-semibold uppercase mb-1">Johnny5 Solution</div>
                    <div className="text-gray-300">{feature.solution}</div>
                  </div>

                  <div className="p-3 bg-cyan-500/10 border-l-4 border-cyan-500 rounded-r-lg">
                    <div className="text-xs text-cyan-400 font-semibold uppercase mb-1">Your Benefit</div>
                    <div className="text-gray-300">{feature.benefit}</div>
                  </div>
                </div>
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

// IDE Features Section
function IDEFeaturesSection() {
  const features = [
    { icon: '📝', title: 'Monaco Editor', desc: 'VS Code-quality editing with AI completions' },
    { icon: '💻', title: 'Integrated Terminal', desc: 'Full Claude Code CLI access built-in' },
    { icon: '👁️', title: 'Live Preview', desc: 'See changes instantly as you build' },
    { icon: '📁', title: 'File Explorer', desc: 'Navigate your project with session tracking' },
    { icon: '🩺', title: 'Error Doctor', desc: 'AI-powered debugging assistance' },
    { icon: '📊', title: 'Analytics', desc: 'Track token usage and costs in real-time' },
  ];

  return (
    <section id="features" className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Full-Featured IDE
          </h2>
          <p className="text-xl text-gray-400">
            Everything you need to build, all in one place
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-6 bg-gray-900/50 border border-gray-800/50 rounded-xl hover:border-cyan-500/30 hover:bg-gray-900/80 transition-all group"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Comparison Section
function ComparisonSection() {
  const competitors = ['Coder1 + Johnny5', 'Cursor', 'Windsurf', 'GitHub Copilot', 'Devin'];
  const features = [
    { name: 'Autonomous Overnight Work', values: [true, false, false, false, true] },
    { name: 'Session Replay', values: [true, false, false, false, false] },
    { name: 'Security Monitoring', values: [true, false, false, false, false] },
    { name: 'Use Your Own API Keys', values: [true, false, false, false, false] },
    { name: 'Transparent Reasoning', values: [true, false, false, false, false] },
    { name: 'Morning Briefs', values: [true, false, false, false, false] },
  ];
  const prices = ['$29/mo', '$20/mo', '$15/mo', '$10/mo', '$500/mo'];

  return (
    <section id="comparison" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            How We Compare
          </h2>
          <p className="text-xl text-gray-400">
            See why developers are switching to Coder1 + Johnny5
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
                      i === 0 ? 'bg-cyan-500/5 text-cyan-400' : i === 4 ? 'text-red-400' : 'text-gray-400'
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

// Use Cases Section
function UseCasesSection() {
  const useCases = [
    {
      icon: '👨‍💻',
      title: 'Solo Developer',
      description: 'Ship features faster with overnight builds. Multiply your output without multiplying your hours.',
    },
    {
      icon: '🚀',
      title: 'Indie Hacker',
      description: 'Build MVPs while keeping your day job. Johnny5 codes while you sleep, so you ship faster.',
    },
    {
      icon: '🏢',
      title: 'Enterprise Dev',
      description: 'Audit-ready AI with full transparency. Security scores, audit logs, and compliance built-in.',
    },
  ];

  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Built for Builders
          </h2>
          <p className="text-xl text-gray-400">
            Whether you're solo or enterprise, Johnny5 adapts to your workflow
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

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying Coder1',
      features: [
        'Full Coder1 IDE',
        'Basic Johnny5 chat',
        'Use your own API keys',
        'Community support',
      ],
      cta: 'Get Started Free',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'For serious builders',
      features: [
        'Everything in Free',
        'Autonomous overnight mode',
        'Session replay & reasoning',
        'Morning briefs',
        'Analytics dashboard',
        'Priority support',
      ],
      cta: 'Start Pro Trial',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For teams with security needs',
      features: [
        'Everything in Pro',
        'Custom security policies',
        'Team collaboration',
        'Audit log exports',
        'SSO integration',
        'Dedicated support',
      ],
      cta: 'Contact Sales',
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-gray-900/50 to-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Simple Pricing
          </h2>
          <p className="text-xl text-gray-400">
            Start free. Upgrade when you're ready for autonomous mode.
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
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-gray-300">
                    <span className="text-green-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-full font-semibold transition-all ${
                  plan.featured
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:shadow-lg hover:shadow-cyan-500/30'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-24 bg-black">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
          Ready to Wake Up to<br />
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Completed Code?
          </span>
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Join developers who ship faster with Johnny5
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/ide"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-lg rounded-full hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1"
          >
            Start Building Free
          </Link>
          <a
            href="mailto:hello@coder1.dev"
            className="px-8 py-4 border border-white/20 text-white font-semibold text-lg rounded-full hover:bg-white/5 transition-all"
          >
            Schedule Demo
          </a>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-12 bg-gray-900/50 border-t border-gray-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/Coder1-Logo-Sharp.svg"
              alt="Coder1"
              width={150}
              height={48}
              className="h-12 w-auto opacity-80"
            />
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">The AI-First IDE</span>
          </div>

          <div className="flex items-center gap-8 text-gray-400">
            <Link href="/ide" className="hover:text-white transition-colors">IDE</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/documentation" className="hover:text-white transition-colors">Docs</Link>
          </div>

          <div className="text-gray-500 text-sm">
            © 2026 Coder1. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navigation />
      <HeroSection />
      <TrustSection />
      <PainPointsSection />
      <Johnny5FeaturesSection />
      <IDEFeaturesSection />
      <ComparisonSection />
      <UseCasesSection />
      <PricingSection />
      <CTASection />
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
