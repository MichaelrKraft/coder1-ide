"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useMemo } from "react"
import { PipelineBoard, PipelineBoardEmpty } from "@/components/pipeline"
import { usePipeline, useMoveInfluencer, useBulkMoveInfluencers, usePipelineStats } from "@/hooks/use-pipeline"
import { usePipelineStore } from "@/stores/pipeline-store"
import { useCampaign } from "@/hooks/use-campaigns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { PipelineStage } from "@/types/database"
import type { PipelineInfluencer } from "@/stores/pipeline-store"
import {
  Users,
  Search,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react"

// Stats card component
function StatCard({
  label,
  value,
  icon: Icon,
  color = "zinc",
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: "zinc" | "blue" | "yellow" | "emerald" | "violet" | "red"
}) {
  const colorStyles = {
    zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorStyles[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-zinc-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function CampaignPipelinePage() {
  const pathname = usePathname()
  const router = useRouter()
  const campaignId = pathname.split("/")[2]
  const { toast } = useToast()

  // Fetch pipeline data
  const { isLoading, error, refetch } = usePipeline(campaignId)
  const { data: campaignData } = useCampaign(campaignId)
  const campaign = campaignData?.data

  // Store state
  const { influencers, columns } = usePipelineStore()

  // Mutations
  const moveInfluencer = useMoveInfluencer(campaignId)
  const bulkMoveInfluencers = useBulkMoveInfluencers(campaignId)

  // Calculate stats
  const stats = useMemo(() => {
    const total = influencers.length
    const contacted = influencers.filter((i) =>
      ["contacted", "in_negotiation", "deal_signed"].includes(i.stage)
    ).length
    const negotiating = influencers.filter((i) => i.stage === "in_negotiation").length
    const confirmed = influencers.filter((i) =>
      ["deal_signed", "content_in_progress", "content_posted", "completed"].includes(i.stage)
    ).length
    const completed = influencers.filter((i) => i.stage === "completed").length
    const unresponsive = influencers.filter((i) =>
      ["declined", "unresponsive"].includes(i.stage)
    ).length

    return { total, contacted, negotiating, confirmed, completed, unresponsive }
  }, [influencers])

  // Handlers
  const handleMoveInfluencer = async (itemId: string, newStage: PipelineStage) => {
    try {
      await moveInfluencer.mutateAsync({
        campaignInfluencerId: itemId,
        toStage: newStage,
      })
      toast({
        title: "Influencer moved",
        description: `Successfully moved to ${newStage.replace(/_/g, " ")}`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to move influencer",
        variant: "destructive",
      })
    }
  }

  const handleBulkMove = async (itemIds: string[], newStage: PipelineStage) => {
    try {
      await bulkMoveInfluencers.mutateAsync({
        campaignInfluencerIds: itemIds,
        toStage: newStage,
      })
      toast({
        title: "Influencers moved",
        description: `Successfully moved ${itemIds.length} influencer(s) to ${newStage.replace(/_/g, " ")}`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to move influencers",
        variant: "destructive",
      })
    }
  }

  const handleViewInfluencer = (item: PipelineInfluencer) => {
    // Could open a detail panel or navigate to influencer page
    window.open(
      `https://${item.influencer.platform}.com/${item.influencer.username}`,
      "_blank"
    )
  }

  const handleMessageInfluencer = (item: PipelineInfluencer) => {
    // Navigate to outreach page or open message dialog
    toast({
      title: "Coming soon",
      description: "Outreach messaging will be available in a future update",
    })
  }

  const handleRemoveInfluencer = (item: PipelineInfluencer) => {
    // Could show confirmation dialog then remove
    toast({
      title: "Coming soon",
      description: "Remove functionality will be available in a future update",
    })
  }

  const handleAddInfluencers = () => {
    router.push(`/campaigns/${campaignId}/discover`)
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Failed to load pipeline
        </h3>
        <p className="text-zinc-400 max-w-md mb-6">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Pipeline</h2>
          <p className="text-zinc-400 mt-1">
            Manage influencers through your campaign workflow
          </p>
        </div>

        <Link href={`/campaigns/${campaignId}/discover`}>
          <Button className="bg-violet-500 hover:bg-violet-600">
            <Plus className="mr-2 h-4 w-4" />
            Discover Influencers
          </Button>
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={Users}
          color="violet"
        />
        <StatCard
          label="Contacted"
          value={stats.contacted}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          label="Negotiating"
          value={stats.negotiating}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Lost"
          value={stats.unresponsive}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <Separator className="bg-zinc-800" />

      {/* Pipeline Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : influencers.length === 0 ? (
        <PipelineBoardEmpty onAddInfluencers={handleAddInfluencers} />
      ) : (
        <PipelineBoard
          campaignId={campaignId}
          isLoading={isLoading}
          onMoveInfluencer={handleMoveInfluencer}
          onBulkMove={handleBulkMove}
          onViewInfluencer={handleViewInfluencer}
          onMessageInfluencer={handleMessageInfluencer}
          onRemoveInfluencer={handleRemoveInfluencer}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  )
}
