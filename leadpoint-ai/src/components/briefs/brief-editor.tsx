"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  Clock,
  Target,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Zap,
  Video,
  Send,
  Edit3,
  Save,
  Package,
} from "lucide-react"
import type { ContentBrief, InfluencerStyleAnalysis } from "@/types/database"
import {
  useUpdateBrief,
  useRegenerateBriefSection,
  useSendBrief,
} from "@/hooks/use-briefs"
import { useToast } from "@/hooks/use-toast"

// ============================================================================
// Types
// ============================================================================

interface BriefEditorProps {
  brief: ContentBrief
  influencerName?: string
  onSave?: (brief: ContentBrief) => void
  onClose?: () => void
  className?: string
}

type EditableSection = 'title' | 'cta' | 'duration' | null

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusConfig(status: ContentBrief["status"]) {
  const configs = {
    draft: {
      label: "Draft",
      color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
      icon: Edit3,
    },
    sent: {
      label: "Sent",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      icon: Send,
    },
    approved: {
      label: "Approved",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: CheckCircle2,
    },
    revision_requested: {
      label: "Revision Requested",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: AlertTriangle,
    },
    content_submitted: {
      label: "Content Submitted",
      color: "bg-violet-500/10 text-violet-400 border-violet-500/30",
      icon: Video,
    },
  }
  return configs[status]
}

function getFormatLabel(format: ContentBrief["format_suggestion"]) {
  const labels = {
    talking_head: "Talking Head",
    voiceover: "Voiceover",
    trend_format: "Trend Format",
    storytelling: "Storytelling",
    demo: "Demo",
    review: "Review",
  }
  return labels[format]
}

function getToneColor(tone: InfluencerStyleAnalysis["tone"]) {
  const colors = {
    energetic: "text-orange-400",
    calm: "text-blue-400",
    humorous: "text-amber-400",
    educational: "text-emerald-400",
    casual: "text-violet-400",
    professional: "text-zinc-400",
  }
  return colors[tone]
}

// ============================================================================
// Component
// ============================================================================

export function BriefEditor({
  brief,
  influencerName,
  onSave,
  onClose,
  className,
}: BriefEditorProps) {
  const { toast } = useToast()
  const updateBrief = useUpdateBrief()
  const regenerateSection = useRegenerateBriefSection()
  const sendBrief = useSendBrief()

  // Local state for editing
  const [selectedHookIndex, setSelectedHookIndex] = React.useState(0)
  const [editingSection, setEditingSection] = React.useState<EditableSection>(null)
  const [localBrief, setLocalBrief] = React.useState(brief)
  const [hasChanges, setHasChanges] = React.useState(false)

  // Track regenerating sections
  const [regeneratingSection, setRegeneratingSection] = React.useState<string | null>(null)

  const statusConfig = getStatusConfig(localBrief.status)
  const StatusIcon = statusConfig.icon

  // Handle local edits
  const handleLocalEdit = (updates: Partial<ContentBrief>) => {
    setLocalBrief(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  // Save all changes
  const handleSave = async () => {
    try {
      await updateBrief.mutateAsync({
        id: brief.id,
        title: localBrief.title,
        hook_options: localBrief.hook_options,
        talking_points: localBrief.talking_points,
        call_to_action: localBrief.call_to_action,
        restrictions: localBrief.restrictions,
        dos_and_donts: localBrief.dos_and_donts,
        estimated_duration: localBrief.estimated_duration,
        format_suggestion: localBrief.format_suggestion,
      })
      setHasChanges(false)
      toast({
        title: "Brief saved",
        description: "Your changes have been saved successfully.",
      })
      onSave?.(localBrief)
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle section regeneration
  const handleRegenerateSection = async (
    section: "hooks" | "talking_points" | "cta" | "dos_donts" | "product_mentions"
  ) => {
    setRegeneratingSection(section)
    try {
      const response = await regenerateSection.mutateAsync({
        briefId: brief.id,
        section,
      })
      if (response.data?.updated_fields) {
        setLocalBrief(prev => ({ ...prev, ...response.data!.updated_fields }))
        setHasChanges(true)
      }
      toast({
        title: "Section regenerated",
        description: "AI has generated new content for this section.",
      })
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRegeneratingSection(null)
    }
  }

  // Handle send to influencer
  const handleSend = async () => {
    try {
      await sendBrief.mutateAsync(brief.id)
      setLocalBrief(prev => ({ ...prev, status: "sent" }))
      toast({
        title: "Brief sent",
        description: `Brief has been sent to ${influencerName || "the influencer"}.`,
      })
    } catch (error) {
      toast({
        title: "Failed to send",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      {/* Left: Main Content */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editingSection === 'title' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={localBrief.title}
                      onChange={(e) => handleLocalEdit({ title: e.target.value })}
                      className="text-lg font-semibold bg-zinc-800 border-zinc-700"
                      autoFocus
                      onBlur={() => setEditingSection(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingSection(null)}
                    />
                  </div>
                ) : (
                  <CardTitle
                    className="text-xl cursor-pointer hover:text-violet-400 transition-colors"
                    onClick={() => setEditingSection('title')}
                  >
                    {localBrief.title}
                  </CardTitle>
                )}
                <CardDescription className="mt-1">
                  {influencerName ? `Brief for @${influencerName}` : "Content Brief"}
                </CardDescription>
              </div>
              <Badge variant="outline" className={cn("shrink-0 gap-1", statusConfig.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                <span>{getFormatLabel(localBrief.format_suggestion)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {editingSection === 'duration' ? (
                  <Input
                    value={localBrief.estimated_duration}
                    onChange={(e) => handleLocalEdit({ estimated_duration: e.target.value })}
                    className="h-6 w-24 text-xs bg-zinc-800 border-zinc-700"
                    autoFocus
                    onBlur={() => setEditingSection(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingSection(null)}
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-violet-400 transition-colors"
                    onClick={() => setEditingSection('duration')}
                  >
                    {localBrief.estimated_duration}
                  </span>
                )}
              </div>
              {localBrief.ai_generated && (
                <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hook Selection */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-400" />
                Hook Options
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRegenerateSection("hooks")}
                disabled={regeneratingSection === "hooks"}
                className="h-7 text-xs gap-1"
              >
                {regeneratingSection === "hooks" ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
            <CardDescription>
              Choose the hook that best matches your style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {localBrief.hook_options.map((hook, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedHookIndex(index)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedHookIndex === index
                      ? "bg-violet-500/10 border-violet-500/50"
                      : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        selectedHookIndex === index
                          ? "border-violet-400 bg-violet-400"
                          : "border-zinc-600"
                      )}
                    >
                      {selectedHookIndex === index && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <p className="text-sm text-white italic">{hook}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Talking Points */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                Talking Points
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRegenerateSection("talking_points")}
                disabled={regeneratingSection === "talking_points"}
                className="h-7 text-xs gap-1"
              >
                {regeneratingSection === "talking_points" ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
            <CardDescription>
              Key points to cover - use your own words
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {localBrief.talking_points.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg bg-zinc-800/30"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-sm text-zinc-300">{point}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Call to Action
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRegenerateSection("cta")}
                disabled={regeneratingSection === "cta"}
                className="h-7 text-xs gap-1"
              >
                {regeneratingSection === "cta" ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === 'cta' ? (
              <Textarea
                value={localBrief.call_to_action}
                onChange={(e) => handleLocalEdit({ call_to_action: e.target.value })}
                className="bg-zinc-800 border-zinc-700 min-h-[80px]"
                autoFocus
                onBlur={() => setEditingSection(null)}
              />
            ) : (
              <div
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition-colors"
                onClick={() => setEditingSection('cta')}
              >
                <p className="text-sm text-amber-200 font-medium">
                  {localBrief.call_to_action}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Do's and Don'ts */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                Do&apos;s and Don&apos;ts
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRegenerateSection("dos_donts")}
                disabled={regeneratingSection === "dos_donts"}
                className="h-7 text-xs gap-1"
              >
                {regeneratingSection === "dos_donts" ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Do's */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Do&apos;s
                </div>
                <div className="space-y-1.5">
                  {localBrief.dos_and_donts.dos.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-zinc-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Don'ts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
                  <XCircle className="h-4 w-4" />
                  Don&apos;ts
                </div>
                <div className="space-y-1.5">
                  {localBrief.dos_and_donts.donts.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20"
                    >
                      <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-zinc-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Sidebar */}
      <div className="space-y-4">
        {/* Actions */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={handleSave}
                disabled={!hasChanges || updateBrief.isPending}
              >
                {updateBrief.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {hasChanges ? "Save Changes" : "Saved"}
              </Button>
              {localBrief.status === "draft" && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  onClick={handleSend}
                  disabled={sendBrief.isPending}
                >
                  {sendBrief.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send to Influencer
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" className="w-full" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Style Analysis */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-violet-400" />
              Influencer Style
            </CardTitle>
            <CardDescription>
              Analyzed content patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Tone</span>
                <span className={cn("font-medium capitalize", getToneColor(localBrief.influencer_style_analysis.tone))}>
                  {localBrief.influencer_style_analysis.tone}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Pacing</span>
                <span className="text-white capitalize">
                  {localBrief.influencer_style_analysis.pacing}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Format</span>
                <span className="text-white text-right text-xs max-w-[150px] truncate">
                  {localBrief.influencer_style_analysis.typical_format}
                </span>
              </div>

              {localBrief.influencer_style_analysis.common_hooks.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2">Common Hooks</p>
                  <div className="flex flex-wrap gap-1">
                    {localBrief.influencer_style_analysis.common_hooks.slice(0, 3).map((hook, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] bg-zinc-800 border-zinc-700"
                      >
                        {hook}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {localBrief.influencer_style_analysis.signature_phrases.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2">Signature Phrases</p>
                  <div className="flex flex-wrap gap-1">
                    {localBrief.influencer_style_analysis.signature_phrases.slice(0, 3).map((phrase, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-300"
                      >
                        {phrase}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Mentions */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-400" />
                Product Mentions
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRegenerateSection("product_mentions")}
                disabled={regeneratingSection === "product_mentions"}
                className="h-7 text-xs gap-1"
              >
                {regeneratingSection === "product_mentions" ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3 pr-2">
                {localBrief.product_mentions.map((mention, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {mention.product_name}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {mention.mention_timing}
                      </Badge>
                    </div>
                    <p className="text-xs text-emerald-400">
                      {mention.key_benefit}
                    </p>
                    <p className="text-xs text-zinc-400 italic">
                      {mention.talking_point}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Restrictions */}
        {localBrief.restrictions.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Restrictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {localBrief.restrictions.map((restriction, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs text-zinc-400"
                  >
                    <X className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                    <span>{restriction}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Format Selector */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={localBrief.format_suggestion}
              onValueChange={(value: ContentBrief["format_suggestion"]) =>
                handleLocalEdit({ format_suggestion: value })
              }
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="talking_head">Talking Head</SelectItem>
                <SelectItem value="voiceover">Voiceover</SelectItem>
                <SelectItem value="trend_format">Trend Format</SelectItem>
                <SelectItem value="storytelling">Storytelling</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BriefEditor
