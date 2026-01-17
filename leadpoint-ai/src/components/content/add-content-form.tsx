'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Link2,
  Calendar,
  FileText,
  Play,
  Radio,
  Image,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAddContent } from '@/hooks/use-content'
import type { ContentPostType, CreateContentRequest } from '@/types/content'
import type { Platform } from '@/types/database'

// ============================================================================
// Schema
// ============================================================================

const addContentSchema = z.object({
  post_url: z
    .string()
    .min(1, 'URL is required')
    .url('Please enter a valid URL')
    .refine(
      (url) => {
        const lowered = url.toLowerCase()
        return (
          lowered.includes('tiktok.com') ||
          lowered.includes('instagram.com') ||
          lowered.includes('youtube.com') ||
          lowered.includes('youtu.be')
        )
      },
      {
        message: 'URL must be from TikTok, Instagram, or YouTube',
      }
    ),
  post_type: z.enum(['video', 'live', 'story'] as const),
  expected_publish_date: z.string().optional(),
  notes: z.string().optional(),
})

type AddContentFormData = z.infer<typeof addContentSchema>

// ============================================================================
// Types
// ============================================================================

interface AddContentFormProps {
  campaignId: string
  influencerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface UrlValidation {
  isValid: boolean
  platform: Platform | null
  message: string
}

// ============================================================================
// URL Validation Helper
// ============================================================================

function validateUrl(url: string): UrlValidation {
  if (!url) {
    return { isValid: false, platform: null, message: '' }
  }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // TikTok
    if (hostname.includes('tiktok.com')) {
      const validPattern =
        /@[\w.-]+\/video\/\d+/.test(url) || /tiktok\.com\/t\/[\w]+/.test(url)
      return {
        isValid: validPattern,
        platform: 'tiktok',
        message: validPattern
          ? 'TikTok video detected'
          : 'Invalid TikTok URL format',
      }
    }

    // Instagram
    if (hostname.includes('instagram.com')) {
      const validPattern = /\/(reel|p)\/[\w-]+/.test(url)
      return {
        isValid: validPattern,
        platform: 'instagram',
        message: validPattern
          ? 'Instagram post detected'
          : 'Invalid Instagram URL format',
      }
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const validPattern =
        /shorts\/[\w-]+/.test(url) ||
        /[?&]v=[\w-]+/.test(url) ||
        /youtu\.be\/[\w-]+/.test(url)
      return {
        isValid: validPattern,
        platform: 'youtube',
        message: validPattern
          ? 'YouTube video detected'
          : 'Invalid YouTube URL format',
      }
    }

    return {
      isValid: false,
      platform: null,
      message: 'Unsupported platform. Use TikTok, Instagram, or YouTube.',
    }
  } catch {
    return { isValid: false, platform: null, message: 'Invalid URL format' }
  }
}

// ============================================================================
// Post Type Options
// ============================================================================

const postTypeOptions: { value: ContentPostType; label: string; icon: typeof Play }[] = [
  { value: 'video', label: 'Video', icon: Play },
  { value: 'live', label: 'Live', icon: Radio },
  { value: 'story', label: 'Story', icon: Image },
]

// ============================================================================
// Add Content Form Component
// ============================================================================

export function AddContentForm({
  campaignId,
  influencerId,
  open,
  onOpenChange,
  onSuccess,
}: AddContentFormProps) {
  const [urlValidation, setUrlValidation] = useState<UrlValidation>({
    isValid: false,
    platform: null,
    message: '',
  })

  const addContent = useAddContent()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddContentFormData>({
    resolver: zodResolver(addContentSchema),
    defaultValues: {
      post_url: '',
      post_type: 'video',
      expected_publish_date: '',
      notes: '',
    },
  })

  const watchUrl = watch('post_url')

  // Validate URL as user types
  useEffect(() => {
    const validation = validateUrl(watchUrl)
    setUrlValidation(validation)
  }, [watchUrl])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset()
      setUrlValidation({ isValid: false, platform: null, message: '' })
    }
  }, [open, reset])

  const onSubmit = async (data: AddContentFormData) => {
    try {
      const request: CreateContentRequest = {
        campaign_id: campaignId,
        influencer_id: influencerId,
        post_url: data.post_url,
        post_type: data.post_type,
        expected_publish_date: data.expected_publish_date || undefined,
        notes: data.notes || undefined,
      }

      await addContent.mutateAsync(request)

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to add content:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Content</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Track a new content post from this influencer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="post_url" className="text-zinc-300">
              Post URL <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="post_url"
                placeholder="https://www.tiktok.com/@username/video/..."
                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
                {...register('post_url')}
              />
            </div>

            {/* URL Validation Feedback */}
            {watchUrl && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  urlValidation.isValid ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {urlValidation.isValid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{urlValidation.message}</span>
                {urlValidation.platform && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-300 capitalize">
                    {urlValidation.platform}
                  </span>
                )}
              </div>
            )}

            {errors.post_url && (
              <p className="text-sm text-red-400">{errors.post_url.message}</p>
            )}
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label htmlFor="post_type" className="text-zinc-300">
              Post Type <span className="text-red-400">*</span>
            </Label>
            <Select
              defaultValue="video"
              onValueChange={(value) =>
                setValue('post_type', value as ContentPostType)
              }
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {postTypeOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-zinc-300 focus:text-white focus:bg-zinc-700"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {errors.post_type && (
              <p className="text-sm text-red-400">{errors.post_type.message}</p>
            )}
          </div>

          {/* Expected Publish Date */}
          <div className="space-y-2">
            <Label htmlFor="expected_publish_date" className="text-zinc-300">
              Expected Publish Date{' '}
              <span className="text-zinc-500">(optional)</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="expected_publish_date"
                type="datetime-local"
                className="pl-10 bg-zinc-800 border-zinc-700 text-white focus:border-violet-500"
                {...register('expected_publish_date')}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Leave empty if the content is already published
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-zinc-300">
              Notes <span className="text-zinc-500">(optional)</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <Textarea
                id="notes"
                placeholder="Add any notes about this content..."
                className="pl-10 min-h-[80px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 resize-none"
                {...register('notes')}
              />
            </div>
          </div>

          {/* Error Message */}
          {addContent.error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{addContent.error.message}</span>
            </div>
          )}

          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || addContent.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {addContent.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Content'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Quick Add Button Component
// ============================================================================

interface QuickAddContentButtonProps {
  campaignId: string
  influencerId: string
  onSuccess?: () => void
}

export function QuickAddContentButton({
  campaignId,
  influencerId,
  onSuccess,
}: QuickAddContentButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-violet-600 hover:bg-violet-700 text-white"
      >
        Add Content
      </Button>
      <AddContentForm
        campaignId={campaignId}
        influencerId={influencerId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  )
}

export default AddContentForm
