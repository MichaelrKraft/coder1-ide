'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Sparkles,
  Zap,
  TrendingUp,
  Gift,
  Rocket,
  Users,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateCampaign } from '@/hooks/use-campaigns'
import { toast } from '@/hooks/use-toast'

interface CampaignTemplate {
  id: string
  name: string
  description: string
  icon: React.ElementType
  color: 'cyan' | 'purple' | 'emerald' | 'amber' | 'pink'
  data: {
    name: string
    description: string
    target_niche: string
    hashtags: string[]
    budget?: number
  }
}

const templates: CampaignTemplate[] = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Perfect for introducing new products with viral potential',
    icon: Rocket,
    color: 'cyan',
    data: {
      name: 'Product Launch Campaign',
      description: 'Drive awareness and excitement for our new product launch through authentic influencer content.',
      target_niche: 'Technology',
      hashtags: ['newproduct', 'launchday', 'techreview', 'mustwatch'],
      budget: 5000,
    },
  },
  {
    id: 'brand-awareness',
    name: 'Brand Awareness',
    description: 'Build recognition and trust with your target audience',
    icon: TrendingUp,
    color: 'purple',
    data: {
      name: 'Brand Awareness Campaign',
      description: 'Increase brand visibility and reach new potential customers through influencer partnerships.',
      target_niche: 'Lifestyle',
      hashtags: ['brandstory', 'lifestyle', 'authentic', 'dayinthelife'],
      budget: 10000,
    },
  },
  {
    id: 'ugc-content',
    name: 'UGC Content',
    description: 'Generate user-generated content for ads and social',
    icon: Users,
    color: 'emerald',
    data: {
      name: 'UGC Content Campaign',
      description: 'Collect authentic user-generated content from micro-influencers for use in paid ads and organic social.',
      target_niche: 'Fashion & Beauty',
      hashtags: ['ugc', 'contentcreator', 'aesthetic', 'ootd'],
      budget: 3000,
    },
  },
  {
    id: 'seasonal-promo',
    name: 'Seasonal Promo',
    description: 'Capitalize on holidays and seasonal trends',
    icon: Gift,
    color: 'amber',
    data: {
      name: 'Seasonal Promotion Campaign',
      description: 'Leverage seasonal moments and holiday shopping periods to drive conversions.',
      target_niche: 'Entertainment',
      hashtags: ['holiday', 'giftguide', 'seasonal', 'deals'],
      budget: 7500,
    },
  },
  {
    id: 'viral-challenge',
    name: 'Viral Challenge',
    description: 'Create buzz with a trending challenge format',
    icon: Zap,
    color: 'pink',
    data: {
      name: 'Viral Challenge Campaign',
      description: 'Launch a branded challenge to maximize organic reach and user participation.',
      target_niche: 'Entertainment',
      hashtags: ['challenge', 'viral', 'trending', 'fyp'],
      budget: 15000,
    },
  },
]

const colorConfig = {
  cyan: {
    bg: 'from-cyan-500/20 to-cyan-500/5',
    border: 'border-cyan-500/30 hover:border-cyan-400/50',
    icon: 'text-cyan-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(0,212,255,0.15)]',
    button: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30',
  },
  purple: {
    bg: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30 hover:border-purple-400/50',
    icon: 'text-purple-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]',
    button: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30',
  },
  emerald: {
    bg: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/30 hover:border-emerald-400/50',
    icon: 'text-emerald-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    button: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
  },
  amber: {
    bg: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/30 hover:border-amber-400/50',
    icon: 'text-amber-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    button: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
  },
  pink: {
    bg: 'from-pink-500/20 to-pink-500/5',
    border: 'border-pink-500/30 hover:border-pink-400/50',
    icon: 'text-pink-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]',
    button: 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30',
  },
}

export function CampaignTemplates() {
  const router = useRouter()
  const createCampaign = useCreateCampaign()
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const handleUseTemplate = async (template: CampaignTemplate) => {
    setLoadingTemplate(template.id)

    try {
      const result = await createCampaign.mutateAsync(template.data)

      if (result.data) {
        setCopiedTemplate(template.id)

        toast({
          title: 'Campaign created from template!',
          description: `"${template.data.name}" is ready to customize.`,
        })

        // Show success animation briefly, then redirect
        setTimeout(() => {
          router.push(`/campaigns/${result.data.id}`)
        }, 800)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create campaign',
        variant: 'destructive',
      })
      setLoadingTemplate(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          'bg-cyan-500/20',
          'border border-cyan-500/20'
        )}>
          <Sparkles className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Quick Start Templates</h2>
          <p className="text-sm text-slate-400">One-click to create a pre-configured campaign</p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {templates.map((template) => {
          const colors = colorConfig[template.color]
          const isLoading = loadingTemplate === template.id
          const isCopied = copiedTemplate === template.id

          return (
            <div
              key={template.id}
              className={cn(
                'group relative rounded-xl p-3.5',
                'bg-gradient-to-br',
                colors.bg,
                'border',
                colors.border,
                'transition-all duration-300 ease-out',
                colors.glow,
                'hover:translate-y-[-2px]',
                'cursor-pointer'
              )}
              onClick={() => !isLoading && !isCopied && handleUseTemplate(template)}
            >
              {/* Icon */}
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg mb-2.5',
                'bg-slate-900/50 backdrop-blur-sm',
                'border border-slate-800/50',
                'transition-all duration-300',
                'group-hover:scale-110'
              )}>
                <template.icon className={cn('h-4 w-4', colors.icon)} />
              </div>

              {/* Content */}
              <h3 className="text-sm font-semibold text-white mb-1">
                {template.name}
              </h3>
              <p className="text-xs text-slate-400 mb-2.5 line-clamp-2">
                {template.description}
              </p>

              {/* Use Template Button */}
              <button
                disabled={isLoading || isCopied}
                className={cn(
                  'w-full flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5',
                  'text-xs font-medium',
                  'transition-all duration-300',
                  colors.button,
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Creating...
                  </>
                ) : isCopied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Created!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Use Template
                  </>
                )}
              </button>

              {/* Hover glow effect */}
              <div className={cn(
                'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300',
                'bg-gradient-to-br from-white/5 to-transparent',
                'group-hover:opacity-100',
                'pointer-events-none'
              )} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
