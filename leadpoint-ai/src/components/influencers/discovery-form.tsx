"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  X,
  Plus,
  Loader2,
  Clock,
  StopCircle,
  Sparkles,
  Hash,
} from "lucide-react"

interface DiscoveryFormProps {
  onDiscover: (hashtags: string[], maxResults: number) => void
  onCancel?: () => void
  isLoading?: boolean
  progress?: number
  estimatedTime?: string
  className?: string
}

const MAX_RESULTS_OPTIONS = [
  { value: "100", label: "100 influencers", time: "~2 min" },
  { value: "250", label: "250 influencers", time: "~5 min" },
  { value: "500", label: "500 influencers", time: "~10 min" },
  { value: "1000", label: "1,000 influencers", time: "~20 min" },
]

const SUGGESTED_HASHTAGS = [
  "fitness",
  "fashion",
  "beauty",
  "lifestyle",
  "tech",
  "food",
  "travel",
  "gaming",
  "music",
  "art",
]

export function DiscoveryForm({
  onDiscover,
  onCancel,
  isLoading = false,
  progress = 0,
  estimatedTime,
  className,
}: DiscoveryFormProps) {
  const [hashtags, setHashtags] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [maxResults, setMaxResults] = useState("250")

  const addHashtag = useCallback((tag: string) => {
    const cleanTag = tag.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (cleanTag && !hashtags.includes(cleanTag) && hashtags.length < 10) {
      setHashtags((prev) => [...prev, cleanTag])
      setInputValue("")
    }
  }, [hashtags])

  const removeHashtag = useCallback((tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault()
        addHashtag(inputValue)
      } else if (e.key === "Backspace" && !inputValue && hashtags.length > 0) {
        removeHashtag(hashtags[hashtags.length - 1])
      }
    },
    [inputValue, hashtags, addHashtag, removeHashtag]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (hashtags.length > 0) {
        onDiscover(hashtags, parseInt(maxResults))
      }
    },
    [hashtags, maxResults, onDiscover]
  )

  const selectedOption = MAX_RESULTS_OPTIONS.find((o) => o.value === maxResults)

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden",
        className
      )}
    >
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Discover Influencers</h3>
            <p className="text-sm text-zinc-400">
              Find creators by hashtags and niche keywords
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Hashtag Input */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-zinc-300">
            Target Hashtags
            <span className="ml-2 text-xs text-zinc-500">
              ({hashtags.length}/10)
            </span>
          </Label>
          <div className="flex flex-wrap gap-2 p-3 min-h-[52px] rounded-xl border border-zinc-800 bg-zinc-950/50 focus-within:border-violet-500/50 transition-colors">
            {hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20 pl-2 pr-1 py-1 gap-1"
              >
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="ml-1 rounded-full p-0.5 hover:bg-violet-500/30 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hashtags.length === 0 ? "Type hashtags and press Enter..." : "Add more..."}
              className="flex-1 min-w-[150px] border-0 bg-transparent p-0 h-7 focus-visible:ring-0 placeholder:text-zinc-600"
              disabled={isLoading || hashtags.length >= 10}
            />
          </div>

          {/* Suggested Hashtags */}
          {hashtags.length < 5 && (
            <div className="space-y-2">
              <span className="text-xs text-zinc-500">Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_HASHTAGS.filter((tag) => !hashtags.includes(tag))
                  .slice(0, 6)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addHashtag(tag)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Max Results */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-zinc-300">
            Maximum Results
          </Label>
          <Select value={maxResults} onValueChange={setMaxResults} disabled={isLoading}>
            <SelectTrigger className="w-full bg-zinc-950/50 border-zinc-800 focus:ring-violet-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {MAX_RESULTS_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="focus:bg-violet-500/10"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{option.label}</span>
                    <span className="text-xs text-zinc-500">{option.time}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estimated Time Display */}
        {selectedOption && !isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              Estimated time: <span className="text-zinc-300">{selectedOption.time}</span>
            </span>
          </div>
        )}

        {/* Progress Section */}
        {isLoading && (
          <div className="space-y-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                <span className="text-sm font-medium text-violet-300">
                  Discovering influencers...
                </span>
              </div>
              <span className="text-sm text-zinc-400">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {estimatedTime && (
              <p className="text-xs text-zinc-500">
                Estimated time remaining: {estimatedTime}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancel}
              className="flex-1 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Cancel Discovery
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={hashtags.length === 0}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
            >
              <Search className="h-4 w-4 mr-2" />
              Discover Influencers
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
