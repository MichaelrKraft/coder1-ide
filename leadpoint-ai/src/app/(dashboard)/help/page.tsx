'use client'

import {
  BookOpen,
  MessageCircle,
  Video,
  Zap,
  Users,
  Target,
  BarChart3,
  Mail,
  ExternalLink,
  Search,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const quickStartGuides = [
  {
    title: 'Create Your First Campaign',
    description: 'Learn how to set up a campaign and define your target audience.',
    icon: Target,
    href: '/campaigns/new',
    time: '5 min',
  },
  {
    title: 'Discover Influencers',
    description: 'Use AI-powered discovery to find the perfect TikTok creators.',
    icon: Users,
    href: '/influencers',
    time: '3 min',
  },
  {
    title: 'Generate Outreach Messages',
    description: 'Let AI craft personalized outreach based on influencer style.',
    icon: Mail,
    href: '#outreach',
    time: '2 min',
  },
  {
    title: 'Track Campaign Performance',
    description: 'Monitor ROI, engagement, and content performance in real-time.',
    icon: BarChart3,
    href: '/analytics',
    time: '4 min',
  },
]

const features = [
  {
    category: 'Influencer Discovery',
    items: [
      {
        title: 'Ceiling-Based Scoring',
        description: 'Our unique scoring system evaluates influencers based on their maximum viral potential, not just averages. An influencer who hit 1M views once has proven viral capability.',
      },
      {
        title: 'Hidden Gem Detection',
        description: 'Find undervalued creators whose ceiling score significantly exceeds their average performance - these are your best ROI opportunities.',
      },
      {
        title: 'Smart Filters',
        description: 'Filter by follower count, engagement rate, niche, location, and more to find creators that match your brand.',
      },
    ],
  },
  {
    category: 'Campaign Management',
    items: [
      {
        title: 'Pipeline Kanban',
        description: 'Track influencers through your workflow stages with drag-and-drop simplicity.',
      },
      {
        title: 'Viral Series Tracking',
        description: 'If a video works, make 10 more versions. Track series performance and get AI-generated variation ideas.',
      },
      {
        title: 'Content Briefs',
        description: 'Generate AI-powered briefs that match each influencer\'s natural style, not your brand voice.',
      },
    ],
  },
  {
    category: 'Outreach & Deals',
    items: [
      {
        title: 'AI Message Generation',
        description: 'Personalized outreach messages crafted based on the influencer\'s content style and recent posts.',
      },
      {
        title: 'Deal Calculator',
        description: 'Never pay per video - use bundle pricing. 3-packs get 20% off, 5-packs get 35% off.',
      },
      {
        title: 'Negotiation Tips',
        description: 'Get AI-powered suggestions for negotiating better deals based on market rates.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'How does the ceiling-based scoring work?',
    answer: 'Instead of scoring influencers by their average performance, we look at their best-performing content. An influencer who went viral once has proven they can do it again. The formula weighs best video views (40%), viral video count (20%), and posting consistency (40%).',
  },
  {
    question: 'What are credits and how do they work?',
    answer: 'Credits are used for AI-powered features like brief generation, outreach message creation, and variation suggestions. Each plan includes monthly credits that reset on your billing date. Starter: 500/mo, Growth: 2,500/mo, Scale: 10,000/mo.',
  },
  {
    question: 'How do I track influencer content?',
    answer: 'When an influencer posts content for your campaign, add the video URL to your campaign\'s content section. We\'ll automatically fetch and track performance metrics over time.',
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes! You can export influencer lists, campaign data, and analytics from the respective sections. Look for the Export button in the top-right of data tables.',
  },
  {
    question: 'How do viral series work?',
    answer: 'When you identify a successful video format, create a series to track it. Add similar videos, and our AI will suggest variations to extend the series. This follows David Park\'s methodology: "If a video works, make 10 more versions."',
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen">
      {/* Hero section with gradient mesh */}
      <div className="relative overflow-hidden border-b border-slate-800/50">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-cyan-500/5" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold sm:text-5xl text-cyan-400">
              Help & Documentation
            </h1>
            <p className="mt-4 text-lg text-slate-400">
              Everything you need to run successful influencer campaigns
            </p>
          </div>

          {/* Search */}
          <div className="mt-10 mx-auto max-w-xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Quick Start */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Quick Start</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickStartGuides.map((guide) => (
              <Link
                key={guide.title}
                href={guide.href}
                className="group flex items-start gap-4 rounded-xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-5 hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,212,255,0.1)] transition-all duration-300"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-all duration-300">
                  <guide.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors duration-300">
                      {guide.title}
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">{guide.time}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-400">{guide.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300 mt-1" />
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <BookOpen className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Feature Guide</h2>
          </div>
          <div className="space-y-10">
            {features.map((category) => (
              <div key={category.category}>
                <h3 className="text-lg font-medium text-slate-300 mb-5">{category.category}</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {category.items.map((item) => (
                    <div
                      key={item.title}
                      className="group rounded-xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-5 hover:border-cyan-500/20 hover:shadow-[0_4px_24px_rgba(0,212,255,0.05)] transition-all duration-300"
                    >
                      <h4 className="font-medium text-white group-hover:text-cyan-400 transition-colors duration-300">{item.title}</h4>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`rounded-xl bg-slate-900/50 backdrop-blur-sm border overflow-hidden transition-all duration-300 ${
                  expandedFaq === index
                    ? 'border-cyan-500/30 shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                    : 'border-slate-800/50'
                }`}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-800/50 transition-colors duration-300"
                >
                  <span className="font-medium text-white pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 shrink-0 transition-transform duration-300 ${
                      expandedFaq === index ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expandedFaq === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Support */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
              <Video className="h-5 w-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Need More Help?</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="mailto:support@leadpoint.ai"
              className="group flex items-center gap-4 rounded-xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-5 hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,212,255,0.1)] transition-all duration-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors duration-300">Email Support</h3>
                <p className="text-sm text-slate-500">support@leadpoint.ai</p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors duration-300" />
            </a>
            <a
              href="https://twitter.com/leadpoint_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-5 hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,212,255,0.1)] transition-all duration-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors duration-300">Twitter / X</h3>
                <p className="text-sm text-slate-500">@leadpoint_ai</p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors duration-300" />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
