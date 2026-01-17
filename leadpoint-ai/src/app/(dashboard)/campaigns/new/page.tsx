'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CampaignForm } from '@/components/campaigns/campaign-form'

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Create Campaign</h1>
        <p className="mt-1 text-zinc-400">
          Set up a new influencer marketing campaign to reach your target
          audience.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <CampaignForm mode="create" />
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-6">
        <h3 className="font-medium text-white mb-3">Tips for a successful campaign</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-violet-400">1.</span>
            <span>
              Choose a specific niche to target influencers who align with your
              brand.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400">2.</span>
            <span>
              Use relevant hashtags that your target audience follows to improve
              discovery.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400">3.</span>
            <span>
              Set a realistic budget based on the influencer tier you want to
              work with.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400">4.</span>
            <span>
              Define clear start and end dates to keep your campaign organized.
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
